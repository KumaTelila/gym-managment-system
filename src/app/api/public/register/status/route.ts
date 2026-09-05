import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ error: "Please provide a request number or phone number." }, { status: 400 });
    }

    const registration = await prisma.registrationRequest.findFirst({
      where: {
        OR: [
          { requestNumber: { equals: query, mode: "insensitive" } },
          { phone: { equals: query, mode: "insensitive" } },
        ],
      },
      include: {
        plan: true,
        createdMember: {
          select: {
            memberCode: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!registration) {
      return NextResponse.json({ error: "No registration request found matching your query." }, { status: 404 });
    }

    return NextResponse.json({
      requestNumber: registration.requestNumber,
      fullName: registration.fullName,
      planName: registration.plan.name,
      amountETB: Number(registration.amountETB),
      status: registration.status,
      paymentMethod: registration.paymentMethod,
      paymentRef: registration.paymentRef,
      createdAt: registration.createdAt.toISOString(),
      approvedAt: registration.approvedAt?.toISOString() || null,
      rejectionReason: registration.rejectionReason,
      memberCode: registration.createdMember?.memberCode || null,
    });
  } catch (error) {
    console.error("Registration status check error:", error);
    return NextResponse.json(
      { error: "Failed to check registration status." },
      { status: 500 }
    );
  }
}
