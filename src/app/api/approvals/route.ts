import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const auth = await requireRole("ADMIN", "FINANCE_OWNER", "RECEPTIONIST");
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const regStatus = searchParams.get("regStatus") || "PENDING"; // PENDING, APPROVED, REJECTED, ALL
    const profileStatus = searchParams.get("profileStatus") || "PENDING";
    const search = searchParams.get("search")?.trim().toLowerCase() || "";

    // 1. Where clause for Registration Requests
    const regWhere: any = {};
    if (regStatus !== "ALL") {
      regWhere.status = regStatus;
    }
    if (search) {
      regWhere.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { requestNumber: { contains: search, mode: "insensitive" } },
        { paymentRef: { contains: search, mode: "insensitive" } },
      ];
    }

    // 2. Where clause for Profile Update Requests
    const profileWhere: any = {};
    if (profileStatus !== "ALL") {
      profileWhere.status = profileStatus;
    }
    if (search) {
      profileWhere.member = {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { memberCode: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [
      registrationRequests,
      profileUpdateRequests,
      pendingRegistrationsCount,
      pendingProfileUpdatesCount,
    ] = await Promise.all([
      prisma.registrationRequest.findMany({
        where: regWhere,
        include: {
          plan: true,
          approvedBy: { select: { fullName: true, username: true } },
          createdMember: { select: { memberCode: true, fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.memberProfileUpdateRequest.findMany({
        where: profileWhere,
        include: {
          member: true,
          reviewedBy: { select: { fullName: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.registrationRequest.count({ where: { status: "PENDING" } }),
      prisma.memberProfileUpdateRequest.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      registrationRequests,
      profileUpdateRequests,
      counts: {
        pendingRegistrations: pendingRegistrationsCount,
        pendingProfileUpdates: pendingProfileUpdatesCount,
        totalPending: pendingRegistrationsCount + pendingProfileUpdatesCount,
      },
    });
  } catch (error) {
    console.error("Approvals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals data." },
      { status: 500 }
    );
  }
}
