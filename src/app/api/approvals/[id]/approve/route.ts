import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request) || "127.0.0.1";
    const auth = await requireRole("ADMIN", "FINANCE_OWNER", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const sessionUser = auth.user;
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const verifiedPaymentRef = body.verifiedPaymentRef?.trim();

    const reg = await prisma.registrationRequest.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!reg) {
      return NextResponse.json({ error: "Registration request not found." }, { status: 404 });
    }

    if (reg.status !== "PENDING") {
      return NextResponse.json(
        { error: `This registration request is already ${reg.status}.` },
        { status: 400 }
      );
    }

    const effectivePaymentRef = verifiedPaymentRef || reg.paymentRef;

    // Execute atomic approval transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check or create User account for member
      let user = await tx.user.findUnique({
        where: { username: reg.phone },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            fullName: reg.fullName,
            username: reg.phone,
            passwordHash: reg.passwordHash,
            role: "MEMBER",
            isActive: true,
          },
        });
      }

      // 2. Check or create Member profile
      let member = await tx.member.findUnique({
        where: { phone: reg.phone },
      });

      if (!member) {
        // Collision-safe member code generation
        let attempts = 0;
        const baseCount = await tx.member.count();
        while (!member && attempts < 5) {
          const candidateCode = `BF-${String(1001 + baseCount + attempts).padStart(4, "0")}`;
          try {
            member = await tx.member.create({
              data: {
                userId: user.id,
                memberCode: candidateCode,
                fullName: reg.fullName,
                phone: reg.phone,
                email: reg.email,
                gender: reg.gender,
                photoUrl: reg.photoUrl,
                emergencyContactName: reg.emergencyContactName,
                emergencyContactPhone: reg.emergencyContactPhone,
                dateOfBirth: reg.dateOfBirth,
                address: reg.address,
                idNumber: reg.idNumber,
                fitnessGoal: reg.fitnessGoal,
                medicalHistory: reg.medicalHistory,
                bloodGroup: reg.bloodGroup,
                notes: reg.notes,
                cardVersion: 1,
                isActive: true,
              },
            });
          } catch (err: any) {
            if (err?.code === "P2002" && attempts < 4) {
              attempts++;
              continue;
            }
            throw err;
          }
        }
      } else if (!member.userId) {
        // Link member to user account
        member = await tx.member.update({
          where: { id: member.id },
          data: { userId: user.id },
        });
      }

      if (!member) {
        throw new Error("Failed to assign a unique member code.");
      }

      // 3. Calculate subscription end date
      const startDate = new Date(reg.startDate);
      const endDate = new Date(startDate.getTime() + reg.plan.durationDays * 24 * 60 * 60 * 1000);

      // 4. Create active subscription
      const subscription = await tx.subscription.create({
        data: {
          memberId: member.id,
          planId: reg.planId,
          startDate,
          endDate,
          status: "ACTIVE",
          amountPaidETB: reg.amountETB,
          registrationFeeETB: reg.registrationFeeETB,
          paymentMethod: reg.paymentMethod,
          paymentRef: effectivePaymentRef,
          processedById: sessionUser.id,
        },
      });

      // 5. Update RegistrationRequest to APPROVED
      const updatedReg = await tx.registrationRequest.update({
        where: { id: reg.id },
        data: {
          status: "APPROVED",
          approvedById: sessionUser.id,
          approvedAt: new Date(),
          paymentRef: effectivePaymentRef,
          createdMemberId: member.id,
          createdSubscriptionId: subscription.id,
        },
      });

      return { user, member, subscription, updatedReg };
    });

    // 6. Audit log
    await logAudit({
      userId: sessionUser.id,
      action: "ONLINE_REGISTRATION_APPROVED",
      entityType: "RegistrationRequest",
      entityId: reg.id,
      details: {
        requestNumber: reg.requestNumber,
        memberCode: result.member.memberCode,
        fullName: result.member.fullName,
        planName: reg.plan.name,
        amountETB: Number(reg.amountETB),
        paymentMethod: reg.paymentMethod,
        paymentRef: effectivePaymentRef,
        approvedBy: sessionUser.fullName,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: `Registration approved! Athlete assigned code ${result.member.memberCode} and membership is now ACTIVE.`,
      member: {
        id: result.member.id,
        memberCode: result.member.memberCode,
        fullName: result.member.fullName,
      },
      subscriptionId: result.subscription.id,
    });
  } catch (error) {
    console.error("Online registration approval error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve registration." },
      { status: 500 }
    );
  }
}
