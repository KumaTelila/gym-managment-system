import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSettingValue } from "@/lib/settings";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request) || "127.0.0.1";
    const body = await request.json();

    const {
      fullName,
      phone,
      password,
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
      planId,
      startDate,
      paymentMethod,
      paymentRef,
    } = body;

    // Validation
    if (!fullName?.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }
    if (!gender || !["MALE", "FEMALE"].includes(gender)) {
      return NextResponse.json({ error: "Valid gender is required." }, { status: 400 });
    }
    if (!planId) {
      return NextResponse.json({ error: "Membership plan selection is required." }, { status: 400 });
    }
    if (!paymentMethod || !["TELEBIRR", "CBE_TRANSFER", "CASH", "OTHER"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Valid payment method is required." }, { status: 400 });
    }
    if (paymentMethod !== "CASH" && !paymentRef?.trim()) {
      return NextResponse.json(
        { error: "Payment reference / transaction ID is required for non-cash payments." },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // Check if member already exists
    const existingMember = await prisma.member.findUnique({
      where: { phone: cleanPhone },
      include: {
        subscriptions: {
          where: { status: "ACTIVE", endDate: { gte: new Date() } },
          take: 1,
        },
      },
    });

    // Check if there is already an active subscription
    const hasActiveSubscription = existingMember && existingMember.subscriptions.length > 0;
    if (hasActiveSubscription) {
      return NextResponse.json(
        {
          error: `You already have an active membership until ${new Date(
            existingMember.subscriptions[0].endDate
          ).toLocaleDateString()}. Please log in to your Member Portal to view details or renew.`,
        },
        { status: 400 }
      );
    }

    // Check if there is already a PENDING registration request for this phone
    const existingPending = await prisma.registrationRequest.findFirst({
      where: { phone: cleanPhone, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: `You already have a pending registration request (${existingPending.requestNumber}). Our staff is currently reviewing it.`,
          existingRequestNumber: existingPending.requestNumber,
        },
        { status: 409 }
      );
    }

    // Fetch the plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId, isActive: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Selected membership plan is not available." }, { status: 404 });
    }

    // Determine registration fee: only for first-time members
    let registrationFeeETB = 0;
    if (!existingMember) {
      const regFeeStr = await getSettingValue("registration_fee", "100");
      registrationFeeETB = Math.max(0, Number(regFeeStr) || 100);
    }

    const planPrice = Number(plan.priceETB);
    const amountETB = planPrice + registrationFeeETB;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Compute request number
    const count = await prisma.registrationRequest.count();
    const requestNumber = `ONL-${String(1001 + count).padStart(4, "0")}`;

    // Parsed start date or default to now
    let parsedStartDate = new Date();
    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        parsedStartDate = parsed;
      }
    }

    const regRequest = await prisma.registrationRequest.create({
      data: {
        requestNumber,
        fullName: fullName.trim(),
        phone: cleanPhone,
        passwordHash,
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
        planId: plan.id,
        startDate: parsedStartDate,
        amountETB,
        registrationFeeETB,
        paymentMethod: paymentMethod as any,
        paymentRef: paymentRef?.trim() || null,
        status: "PENDING",
      },
    });

    // Audit log
    await logAudit({
      userId: null,
      action: "ONLINE_REGISTRATION_SUBMITTED",
      entityType: "RegistrationRequest",
      entityId: regRequest.id,
      details: {
        requestNumber: regRequest.requestNumber,
        fullName: regRequest.fullName,
        phone: regRequest.phone,
        planName: plan.name,
        amountETB,
        paymentMethod,
        paymentRef: regRequest.paymentRef,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      requestNumber: regRequest.requestNumber,
      amountETB,
      registrationFeeETB,
      planName: plan.name,
      paymentMethod,
      paymentRef: regRequest.paymentRef,
      message: "Registration submitted successfully. Front desk will review and approve your payment.",
    });
  } catch (error: any) {
    console.error("Online registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process registration request." },
      { status: 500 }
    );
  }
}
