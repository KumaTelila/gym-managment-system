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

    const body = await request.json();
    const { action, reason } = body; // action: "APPROVE" | "REJECT"

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Action must be either APPROVE or REJECT." }, { status: 400 });
    }

    if (!reason?.trim()) {
      return NextResponse.json(
        { error: "A justification reason is mandatory for approving or rejecting profile updates." },
        { status: 400 }
      );
    }

    const updateRequest = await prisma.memberProfileUpdateRequest.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!updateRequest) {
      return NextResponse.json({ error: "Profile update request not found." }, { status: 404 });
    }

    if (updateRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `This profile update request is already ${updateRequest.status}.` },
        { status: 400 }
      );
    }

    const cleanReason = reason.trim();

    if (action === "APPROVE") {
      const proposed = JSON.parse(updateRequest.proposedData);

      // Validate unique phone collision if changing phone
      if (proposed.phone && proposed.phone !== updateRequest.member.phone) {
        const phoneExists = await prisma.member.findFirst({
          where: { phone: proposed.phone, id: { not: updateRequest.member.id } },
        });
        if (phoneExists) {
          return NextResponse.json(
            { error: `Cannot approve: phone number "${proposed.phone}" is already in use by another member.` },
            { status: 409 }
          );
        }
      }

      // Apply changes to member record
      await prisma.$transaction(async (tx) => {
        await tx.member.update({
          where: { id: updateRequest.memberId },
          data: {
            fullName: proposed.fullName !== undefined ? proposed.fullName : undefined,
            phone: proposed.phone !== undefined ? proposed.phone : undefined,
            email: proposed.email !== undefined ? proposed.email : undefined,
            emergencyContactName: proposed.emergencyContactName !== undefined ? proposed.emergencyContactName : undefined,
            emergencyContactPhone: proposed.emergencyContactPhone !== undefined ? proposed.emergencyContactPhone : undefined,
            address: proposed.address !== undefined ? proposed.address : undefined,
            dateOfBirth: proposed.dateOfBirth !== undefined ? proposed.dateOfBirth : undefined,
            fitnessGoal: proposed.fitnessGoal !== undefined ? proposed.fitnessGoal : undefined,
            medicalHistory: proposed.medicalHistory !== undefined ? proposed.medicalHistory : undefined,
            bloodGroup: proposed.bloodGroup !== undefined ? proposed.bloodGroup : undefined,
            photoUrl: proposed.photoUrl !== undefined ? proposed.photoUrl : undefined,
          },
        });

        // Also update User record if phone or fullName was updated
        if (updateRequest.member.userId) {
          await tx.user.update({
            where: { id: updateRequest.member.userId },
            data: {
              fullName: proposed.fullName !== undefined ? proposed.fullName : undefined,
              username: proposed.phone !== undefined ? proposed.phone : undefined,
            },
          });
        }

        // Update request record
        await tx.memberProfileUpdateRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            adminReason: cleanReason,
            reviewedById: sessionUser.id,
            reviewedAt: new Date(),
          },
        });
      });

      await logAudit({
        userId: sessionUser.id,
        action: "MEMBER_PROFILE_UPDATE_APPROVED",
        entityType: "MemberProfileUpdateRequest",
        entityId: id,
        details: {
          memberCode: updateRequest.member.memberCode,
          memberName: updateRequest.member.fullName,
          reason: cleanReason,
          changes: updateRequest.changeSummary,
          approvedBy: sessionUser.fullName,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        message: "Profile changes approved and applied successfully.",
      });
    } else {
      // REJECT
      await prisma.memberProfileUpdateRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminReason: cleanReason,
          reviewedById: sessionUser.id,
          reviewedAt: new Date(),
        },
      });

      await logAudit({
        userId: sessionUser.id,
        action: "MEMBER_PROFILE_UPDATE_REJECTED",
        entityType: "MemberProfileUpdateRequest",
        entityId: id,
        details: {
          memberCode: updateRequest.member.memberCode,
          memberName: updateRequest.member.fullName,
          reason: cleanReason,
          rejectedBy: sessionUser.fullName,
        },
        ipAddress: clientIp,
      });

      return NextResponse.json({
        success: true,
        message: "Profile update request rejected.",
      });
    }
  } catch (error) {
    console.error("Review profile update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process profile update request." },
      { status: 500 }
    );
  }
}
