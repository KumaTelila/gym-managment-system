import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    if (session.role !== "MEMBER" && !session.memberId) {
      // If an admin or staff accesses portal, find if they are linked or return a helpful preview
      return NextResponse.json(
        { error: "Access denied. This portal is for gym athletes and members." },
        { status: 403 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { id: session.memberId },
          { userId: session.id },
          { phone: session.username },
        ],
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: true,
            processedBy: {
              select: { fullName: true },
            },
          },
        },
        lockerRentals: {
          orderBy: { createdAt: "desc" },
          include: {
            locker: true,
          },
        },
        checkinSessions: {
          orderBy: { checkinTime: "desc" },
          take: 20,
          include: {
            locker: true,
          },
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
        profileUpdateRequests: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member profile not found. Please contact the front desk." },
        { status: 404 }
      );
    }

    // Determine current active or scheduled subscription
    const now = new Date();
    const activeSub = member.subscriptions.find((s) => s.status === "ACTIVE" && new Date(s.endDate) >= now);
    const scheduledSub = member.subscriptions.find(
      (s) => s.status === "ACTIVE" && new Date(s.startDate) > now
    );
    const latestSub = member.subscriptions[0] || null;

    let membershipStatus: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "NONE" = "NONE";
    let daysRemaining = 0;

    if (scheduledSub && new Date(scheduledSub.startDate) > now) {
      membershipStatus = "SCHEDULED";
      const diffMs = new Date(scheduledSub.endDate).getTime() - new Date(scheduledSub.startDate).getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else if (activeSub) {
      membershipStatus = "ACTIVE";
      const diffMs = new Date(activeSub.endDate).getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else if (latestSub) {
      membershipStatus = "EXPIRED";
    }

    const activeLockerRental = member.lockerRentals.find((r) => r.isActive);
    const activeSession = member.checkinSessions.find((s) => s.sessionStatus === "ACTIVE");

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email,
        gender: member.gender,
        photoUrl: member.photoUrl,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        dateOfBirth: member.dateOfBirth,
        address: member.address,
        idNumber: member.idNumber,
        fitnessGoal: member.fitnessGoal,
        medicalHistory: member.medicalHistory,
        bloodGroup: member.bloodGroup,
        notes: member.notes,
        createdAt: member.createdAt.toISOString(),
      },
      currentSubscription: activeSub || scheduledSub || latestSub || null,
      membershipStatus,
      daysRemaining,
      activeLocker: activeLockerRental ? activeLockerRental.locker : null,
      activeLockerRental: activeLockerRental || null,
      currentlyCheckedIn: Boolean(activeSession),
      currentSession: activeSession || null,
      recentVisits: member.checkinSessions,
      allSubscriptions: member.subscriptions,
      recentOrders: member.salesOrders,
      profileUpdateRequests: member.profileUpdateRequests,
    });
  } catch (error) {
    console.error("Member portal me error:", error);
    return NextResponse.json(
      { error: "Failed to load member portal information." },
      { status: 500 }
    );
  }
}
