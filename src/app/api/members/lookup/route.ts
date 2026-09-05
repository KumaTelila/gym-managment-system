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
    const codeParam = searchParams.get("code");
    const queryParam = searchParams.get("q") || searchParams.get("search");
    const query = (queryParam || codeParam || "").trim();

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter required", members: [] },
        { status: 400 }
      );
    }

    const members = await prisma.member.findMany({
      where: {
        OR: [
          { memberCode: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { fullName: { contains: query, mode: "insensitive" } },
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
      take: 10,
      orderBy: { fullName: "asc" },
    });

    const formattedMembers = members.map((member) => {
      const latestSub = member.subscriptions[0];
      const isExpired =
        !latestSub ||
        latestSub.status !== "ACTIVE" ||
        new Date(latestSub.endDate) < new Date();

      const activeSession = member.checkinSessions[0];

      return {
        id: member.id,
        memberCode: member.memberCode,
        cardVersion: member.cardVersion,
        fullName: member.fullName,
        phone: member.phone,
        gender: member.gender,
        photoUrl: member.photoUrl,
        isExpired,
        isFirstRegistration: !latestSub,
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
      };
    });

    // Prioritize exact member code or phone match
    const exactMatch =
      formattedMembers.find(
        (m) =>
          m.memberCode.toUpperCase() === query.toUpperCase() ||
          m.phone === query
      ) || formattedMembers[0];

    // If caller specifically requested ?code= without ?q and nothing matched, 404 for backwards compatibility
    if (!exactMatch && codeParam && !queryParam) {
      return NextResponse.json({ error: "Member not found", members: [] }, { status: 404 });
    }

    return NextResponse.json({
      member: exactMatch || null,
      members: formattedMembers,
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error looking up member", members: [] },
      { status: 500 }
    );
  }
}

