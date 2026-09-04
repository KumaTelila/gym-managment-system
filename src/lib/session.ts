import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "FINANCE_OWNER" | "RECEPTIONIST";
}

const SESSION_COOKIE = "blow_fitness_session";

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  try {
    const raw = Buffer.from(sessionToken, "base64").toString("utf-8");
    const [userId, expiresStr] = raw.split(":");
    if (!userId || !expiresStr) return null;

    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return null;

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
  return Buffer.from(`${userId}:${expires}`).toString("base64");
}

export { SESSION_COOKIE };
