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
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Code parameter required" }, { status: 400 });
    }

    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { memberCode: code.trim().toUpperCase() },
          { phone: code.trim() },
          { fullName: { contains: code.trim(), mode: "insensitive" } },
        ],
      },
      include: {
        subscriptions: {
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
        checkinSessions: {
          where: { sessionStatus: "ACTIVE" },
          include: { locker: true },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const latestSub = member.subscriptions[0];
    const isExpired =
      !latestSub ||
      latestSub.status !== "ACTIVE" ||
      new Date(latestSub.endDate) < new Date();

    const activeSession = member.checkinSessions[0];

    return NextResponse.json({
      member: {
        id: member.id,
        memberCode: member.memberCode,
        cardVersion: member.cardVersion,
        fullName: member.fullName,
        phone: member.phone,
        gender: member.gender,
        photoUrl: member.photoUrl,
        isExpired,
        latestSub: latestSub
          ? {
              planName: latestSub.plan.name,
              endDate: latestSub.endDate.toISOString(),
              status: latestSub.status,
            }
          : undefined,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              lockerNumber: activeSession.locker?.lockerNumber,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error looking up member" },
      { status: 500 }
    );
  }
}
