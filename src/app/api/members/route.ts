import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "active"; // "active" | "inactive" | "all"
    const expiry = searchParams.get("expiry"); // "active" | "expiring_soon" | "expired" | "no_plan" | "all"

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const whereClause: Record<string, unknown> = {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { memberCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        {
          lockerRentals: {
            some: {
              isActive: true,
              locker: { lockerNumber: { contains: search, mode: "insensitive" } },
            },
          },
        },
      ],
    };

    if (status === "active") {
      whereClause.isActive = true;
    } else if (status === "inactive") {
      whereClause.isActive = false;
    }

    if (expiry === "active") {
      whereClause.subscriptions = {
        some: {
          status: "ACTIVE",
          endDate: { gte: now },
        },
      };
    } else if (expiry === "expiring_soon") {
      whereClause.subscriptions = {
        some: {
          status: "ACTIVE",
          endDate: { gte: now, lte: sevenDaysLater },
        },
      };
    } else if (expiry === "expired") {
      whereClause.AND = [
        {
          subscriptions: {
            some: {
              endDate: { lt: now },
            },
          },
        },
        {
          subscriptions: {
            none: {
              status: "ACTIVE",
              endDate: { gte: now },
            },
          },
        },
      ];
    } else if (expiry === "no_plan") {
      whereClause.subscriptions = {
        none: {},
      };
    }

    const members = await prisma.member.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
        lockerRentals: {
          where: { isActive: true },
          include: { locker: true },
          take: 1,
        },
        checkinSessions: {
          where: { sessionStatus: "ACTIVE" },
          include: { locker: true },
          take: 1,
        },
      },
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Members fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch members" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      gender,
      emergencyContactName,
      emergencyContactPhone,
      dateOfBirth,
      address,
      idNumber,
      fitnessGoal,
      medicalHistory,
      bloodGroup,
      notes,
    } = body;

    if (!fullName || !phone || !gender) {
      return NextResponse.json({ error: "Full name, phone, and gender are required." }, { status: 400 });
    }

    // Generate unique member code like BF-1049
    const count = await prisma.member.count();
    const memberCode = `BF-${String(1001 + count).padStart(4, "0")}`;

    const member = await prisma.member.create({
      data: {
        memberCode,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        gender,
        emergencyContactName: emergencyContactName?.trim() || null,
        emergencyContactPhone: emergencyContactPhone?.trim() || null,
        dateOfBirth: dateOfBirth?.trim() || null,
        address: address?.trim() || null,
        idNumber: idNumber?.trim() || null,
        fitnessGoal: fitnessGoal?.trim() || null,
        medicalHistory: medicalHistory?.trim() || null,
        bloodGroup: bloodGroup?.trim() || null,
        notes: notes?.trim() || null,
        cardVersion: 1,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "MEMBER_REGISTERED",
        entityType: "Member",
        entityId: member.id,
        detailsJson: JSON.stringify({
          memberCode: member.memberCode,
          fullName: member.fullName,
          phone: member.phone,
        }),
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error("Member create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register member" },
      { status: 500 }
    );
  }
}
