import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "FINANCE_OWNER" | "RECEPTIONIST";
}

const SESSION_COOKIE = "blow_fitness_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "blow-fitness-session-secret-salt-2026-production-ready";

function signToken(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string): boolean {
  try {
    const expected = signToken(payload);
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  try {
    // Format: userId.expires.signature
    const parts = sessionToken.split(".");
    if (parts.length !== 3) return null;

    const [userId, expiresStr, signature] = parts;
    const payload = `${userId}.${expiresStr}`;

    if (!verifySignature(payload, signature)) {
      return null;
    }

    const expires = parseInt(expiresStr, 10);
    if (Number.isNaN(expires) || Date.now() > expires) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
      },
    });

    return user as SessionUser | null;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string): string {
  // 7 days expiration
  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;
  const signature = signToken(payload);
  return `${payload}.${signature}`;
}

export async function requireRole(
  ...allowedRoles: Array<SessionUser["role"]>
): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const user = await getSession();
  if (!user) {
    return { error: "Unauthorized. Please log in.", status: 401 };
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { error: "Forbidden. Insufficient permissions.", status: 403 };
  }
  return { user };
}

export { SESSION_COOKIE };

