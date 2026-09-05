import { prisma } from "./prisma";

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | string;
  ipAddress?: string | null;
}

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
}: LogAuditParams) {
  try {
    const detailsJson =
      typeof details === "string" ? details : details ? JSON.stringify(details) : null;

    return await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId,
        detailsJson,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    return null;
  }
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || null;
}
