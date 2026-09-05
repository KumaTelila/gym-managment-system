import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { getClientIp } from "@/lib/audit";

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
    const auth = await requireRole("ADMIN", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const session = auth.user;

    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      gender,
      photoUrl,
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

    const cleanPhone = phone.trim();
    const cleanFullName = fullName.trim();

    // Check if phone number is already registered to provide an instant, helpful error
    const existingMember = await prisma.member.findUnique({
      where: { phone: cleanPhone },
      select: { id: true, fullName: true, memberCode: true, phone: true },
    });

    if (existingMember) {
      return NextResponse.json(
        {
          error: `The phone number "${cleanPhone}" is already registered to ${existingMember.fullName} (${existingMember.memberCode}). Please search for this member or use a different phone number.`,
        },
        { status: 409 }
      );
    }

    // F-10: Collision-safe member code generation with retry
    let member = null;
    let attempts = 0;
    const baseCount = await prisma.member.count();

    while (!member && attempts < 5) {
      const candidateCode = `BF-${String(1001 + baseCount + attempts).padStart(4, "0")}`;
      try {
        member = await prisma.member.create({
          data: {
            memberCode: candidateCode,
            fullName: cleanFullName,
            phone: cleanPhone,
            email: email?.trim() || null,
            gender,
            photoUrl: photoUrl?.trim() || null,
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
      } catch (err: any) {
        if (err?.code === "P2002") {
          const target = err?.meta?.target;
          const isMemberCode = Array.isArray(target)
            ? target.includes("memberCode")
            : typeof target === "string" && target.includes("memberCode");

          // Only retry if it was specifically a memberCode collision
          if (isMemberCode && attempts < 4) {
            attempts++;
            continue;
          }

          const isPhone = Array.isArray(target)
            ? target.includes("phone")
            : typeof target === "string" && target.includes("phone");

          if (isPhone) {
            return NextResponse.json(
              {
                error: `The phone number "${cleanPhone}" is already registered to another member.`,
              },
              { status: 409 }
            );
          }
        }
        throw err;
      }
    }

    if (!member) {
      throw new Error("Failed to assign a unique member code after multiple attempts.");
    }

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: "MEMBER_REGISTERED",
        entityType: "Member",
        entityId: member.id,
        ipAddress: getClientIp(request),
        detailsJson: JSON.stringify({
          memberCode: member.memberCode,
          fullName: member.fullName,
          phone: member.phone,
        }),
      },
    });

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error("Member create error:", error);

    if (error?.code === "P2002") {
      const target = Array.isArray(error?.meta?.target)
        ? error.meta.target.join(", ")
        : error?.meta?.target || "field";
      return NextResponse.json(
        { error: `A member with this ${target} already exists in the system.` },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to register member." },
      { status: 500 }
    );
  }
}
