import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: true,
            processedBy: { select: { fullName: true } },
          },
        },
        checkinSessions: {
          orderBy: { checkinTime: "desc" },
          take: 30,
          include: {
            locker: true,
            receptionist: { select: { fullName: true } },
          },
        },
        lockerRentals: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { locker: true },
        },
        salesOrders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // F-18 Data Governance: Mask sensitive government ID number for front-desk reception role
    if (session.role === "RECEPTIONIST" && member.idNumber) {
      member.idNumber = member.idNumber.length > 4
        ? `••••••${member.idNumber.slice(-4)}`
        : "••••";
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Member details fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch member details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (body.phone !== undefined) {
      const cleanPhone = body.phone.trim();
      const existing = await prisma.member.findFirst({
        where: {
          phone: cleanPhone,
          id: { not: id },
        },
        select: { fullName: true, memberCode: true },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: `Phone number "${cleanPhone}" is already registered to ${existing.fullName} (${existing.memberCode}).`,
          },
          { status: 409 }
        );
      }
    }

    const member = await prisma.member.update({
      where: { id },
      data: {
        fullName: body.fullName !== undefined ? body.fullName.trim() : undefined,
        phone: body.phone !== undefined ? body.phone.trim() : undefined,
        email: body.email !== undefined ? body.email?.trim() || null : undefined,
        gender: body.gender !== undefined ? body.gender : undefined,
        photoUrl: body.photoUrl !== undefined ? (body.photoUrl ? body.photoUrl.trim() : null) : undefined,
        emergencyContactName: body.emergencyContactName !== undefined ? body.emergencyContactName?.trim() || null : undefined,
        emergencyContactPhone: body.emergencyContactPhone !== undefined ? body.emergencyContactPhone?.trim() || null : undefined,
        dateOfBirth: body.dateOfBirth !== undefined ? body.dateOfBirth?.trim() || null : undefined,
        address: body.address !== undefined ? body.address?.trim() || null : undefined,
        idNumber: body.idNumber !== undefined ? body.idNumber?.trim() || null : undefined,
        fitnessGoal: body.fitnessGoal !== undefined ? body.fitnessGoal?.trim() || null : undefined,
        medicalHistory: body.medicalHistory !== undefined ? body.medicalHistory?.trim() || null : undefined,
        bloodGroup: body.bloodGroup !== undefined ? body.bloodGroup?.trim() || null : undefined,
        notes: body.notes !== undefined ? body.notes?.trim() || null : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
      },
    });

    const action =
      body.isActive === false
        ? "MEMBER_ARCHIVED"
        : body.isActive === true
        ? "MEMBER_RESTORED"
        : "MEMBER_UPDATED";

    await logAudit({
      userId: session.id,
      action,
      entityType: "Member",
      entityId: id,
      details: {
        ...body,
        memberCode: member.memberCode,
        fullName: member.fullName,
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error("Member edit error:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A unique constraint failed. The phone number may already be registered to another member." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update member" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can permanently clear/purge member data
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Permission denied. Only administrators can permanently clear or purge member data. Staff should archive or deactivate members instead.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingMember = await prisma.member.findUnique({
      where: { id },
    });

    if (!existingMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Cascading transaction to clean up relations before removing member
    await prisma.$transaction(async (tx) => {
      // 1. Delete POS sales orders & items for this member
      const salesOrders = await tx.salesOrder.findMany({
        where: { memberId: id },
        select: { id: true },
      });
      const orderIds = salesOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.salesOrderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.salesOrder.deleteMany({
          where: { id: { in: orderIds } },
        });
      }

      // 2. Delete Checkin Sessions
      await tx.checkinSession.deleteMany({
        where: { memberId: id },
      });

      // 3. Delete Locker Rentals
      await tx.lockerRental.deleteMany({
        where: { memberId: id },
      });

      // 4. Delete Subscriptions
      await tx.subscription.deleteMany({
        where: { memberId: id },
      });

      // 5. Delete Member
      await tx.member.delete({
        where: { id },
      });
    });

    await logAudit({
      userId: session.id,
      action: "MEMBER_DATA_PURGED_BY_ADMIN",
      entityType: "Member",
      entityId: id,
      details: {
        purgedBy: session.username,
        memberCode: existingMember.memberCode,
        fullName: existingMember.fullName,
        phone: existingMember.phone,
        purgedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Member ${existingMember.fullName} (${existingMember.memberCode}) and all linked records were permanently cleared by Admin.`,
    });
  } catch (error) {
    console.error("Member purge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to purge member data" },
      { status: 500 }
    );
  }
}
