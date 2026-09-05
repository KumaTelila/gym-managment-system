import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { getClientIp, logAudit } from "@/lib/audit";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request) || "127.0.0.1";

    // F-17: Global IP rate limit (max 15 attempts per 15 minutes per IP)
    const ipRateLimit = checkRateLimit(`login:ip:${clientIp}`, 15, 15 * 60 * 1000);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many login requests from your network. Please wait ${ipRateLimit.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipRateLimit.retryAfterSeconds) },
        }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // F-17: Account-specific brute force throttle (max 5 failed attempts per 15 minutes)
    const userThrottle = checkRateLimit(`login:user:${cleanUsername}`, 5, 15 * 60 * 1000);
    if (!userThrottle.allowed) {
      return NextResponse.json(
        {
          error: `Account temporarily locked due to repeated failed logins. Please try again in ${userThrottle.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(userThrottle.retryAfterSeconds) },
        }
      );
    }

    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    let memberRecord: { id: string; memberCode: string } | null = null;

    if (!user) {
      // Check if user is logging in using their registered member phone
      const member = await prisma.member.findUnique({
        where: { phone: username.trim() },
        include: { user: true },
      });
      if (member?.user) {
        user = member.user;
        memberRecord = { id: member.id, memberCode: member.memberCode };
      }
    } else if (user.role === "MEMBER") {
      const member = await prisma.member.findFirst({
        where: { OR: [{ userId: user.id }, { phone: user.username }] },
        select: { id: true, memberCode: true },
      });
      if (member) {
        memberRecord = { id: member.id, memberCode: member.memberCode };
      }
    }

    if (!user || !user.isActive) {
      // Audit log failed login attempt
      await logAudit({
        userId: user?.id || null,
        action: user?.role === "MEMBER" ? "MEMBER_LOGIN_FAILED" : "STAFF_LOGIN_FAILED",
        entityType: "User",
        entityId: user?.id || "unknown",
        details: {
          attemptedUsername: cleanUsername,
          reason: !user ? "USER_NOT_FOUND" : "ACCOUNT_INACTIVE",
        },
        ipAddress: clientIp,
      });

      return NextResponse.json(
        { error: "Invalid username, phone number, or password." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Audit log failed password verification
      await logAudit({
        userId: user.id,
        action: user.role === "MEMBER" ? "MEMBER_LOGIN_FAILED" : "STAFF_LOGIN_FAILED",
        entityType: "User",
        entityId: user.id,
        details: {
          attemptedUsername: cleanUsername,
          reason: "INVALID_PASSWORD",
        },
        ipAddress: clientIp,
      });

      return NextResponse.json(
        { error: "Invalid username, phone number, or password." },
        { status: 401 }
      );
    }

    // Login successful: reset failed attempt counter for this user
    resetRateLimit(`login:user:${cleanUsername}`);

    const token = createSessionToken(user.id);

    // Audit log successful sign-in with IP address (F-12)
    await logAudit({
      userId: user.id,
      action: user.role === "MEMBER" ? "MEMBER_LOGIN_SUCCESS" : "STAFF_LOGIN_SUCCESS",
      entityType: "User",
      entityId: user.id,
      details: {
        username: user.username,
        role: user.role,
        memberCode: memberRecord?.memberCode,
      },
      ipAddress: clientIp,
    });

    const redirectTo = user.role === "MEMBER" ? "/portal" : "/dashboard";

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        memberId: memberRecord?.id,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error during login." },
      { status: 500 }
    );
  }
}
