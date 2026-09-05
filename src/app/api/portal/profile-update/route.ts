import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request) || "127.0.0.1";
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { id: session.memberId },
          { userId: session.id },
          { phone: session.username },
        ],
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member record not found." }, { status: 404 });
    }

    // Check if there is already a pending profile update request
    const existingPending = await prisma.memberProfileUpdateRequest.findFirst({
      where: { memberId: member.id, status: "PENDING" },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: "You already have a profile update request waiting for admin review. Please wait until it is processed.",
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      emergencyContactName,
      emergencyContactPhone,
      address,
      dateOfBirth,
      fitnessGoal,
      medicalHistory,
      bloodGroup,
      photoUrl,
    } = body;

    // Snapshot of current data
    const currentData = {
      fullName: member.fullName,
      phone: member.phone,
      email: member.email,
      emergencyContactName: member.emergencyContactName,
      emergencyContactPhone: member.emergencyContactPhone,
      address: member.address,
      dateOfBirth: member.dateOfBirth,
      fitnessGoal: member.fitnessGoal,
      medicalHistory: member.medicalHistory,
      bloodGroup: member.bloodGroup,
      photoUrl: member.photoUrl,
    };

    // Build proposed changes and change summary
    const proposedData: Record<string, string | null> = {};
    const changedFields: string[] = [];

    if (fullName !== undefined && fullName.trim() !== member.fullName) {
      proposedData.fullName = fullName.trim();
      changedFields.push("Full Name");
    }
    if (phone !== undefined && phone.trim() !== member.phone) {
      // Validate unique phone if changed
      const phoneInUse = await prisma.member.findFirst({
        where: { phone: phone.trim(), id: { not: member.id } },
      });
      if (phoneInUse) {
        return NextResponse.json(
          { error: `Phone number "${phone.trim()}" is already registered to another account.` },
          { status: 409 }
        );
      }
      proposedData.phone = phone.trim();
      changedFields.push("Phone Number");
    }
    if (email !== undefined && (email?.trim() || null) !== member.email) {
      proposedData.email = email?.trim() || null;
      changedFields.push("Email");
    }
    if (emergencyContactName !== undefined && (emergencyContactName?.trim() || null) !== member.emergencyContactName) {
      proposedData.emergencyContactName = emergencyContactName?.trim() || null;
      changedFields.push("Emergency Contact Name");
    }
    if (emergencyContactPhone !== undefined && (emergencyContactPhone?.trim() || null) !== member.emergencyContactPhone) {
      proposedData.emergencyContactPhone = emergencyContactPhone?.trim() || null;
      changedFields.push("Emergency Contact Phone");
    }
    if (address !== undefined && (address?.trim() || null) !== member.address) {
      proposedData.address = address?.trim() || null;
      changedFields.push("Address");
    }
    if (dateOfBirth !== undefined && (dateOfBirth?.trim() || null) !== member.dateOfBirth) {
      proposedData.dateOfBirth = dateOfBirth?.trim() || null;
      changedFields.push("Date of Birth");
    }
    if (fitnessGoal !== undefined && (fitnessGoal?.trim() || null) !== member.fitnessGoal) {
      proposedData.fitnessGoal = fitnessGoal?.trim() || null;
      changedFields.push("Fitness Goal");
    }
    if (medicalHistory !== undefined && (medicalHistory?.trim() || null) !== member.medicalHistory) {
      proposedData.medicalHistory = medicalHistory?.trim() || null;
      changedFields.push("Medical Considerations");
    }
    if (bloodGroup !== undefined && (bloodGroup?.trim() || null) !== member.bloodGroup) {
      proposedData.bloodGroup = bloodGroup?.trim() || null;
      changedFields.push("Blood Group");
    }
    if (photoUrl !== undefined && (photoUrl?.trim() || null) !== member.photoUrl) {
      proposedData.photoUrl = photoUrl?.trim() || null;
      changedFields.push("Profile Photo");
    }

    if (changedFields.length === 0) {
      return NextResponse.json(
        { error: "No changes detected between submitted data and your current profile." },
        { status: 400 }
      );
    }

    const updateRequest = await prisma.memberProfileUpdateRequest.create({
      data: {
        memberId: member.id,
        currentData: JSON.stringify(currentData),
        proposedData: JSON.stringify(proposedData),
        changeSummary: changedFields.join(", "),
        status: "PENDING",
      },
    });

    await logAudit({
      userId: session.id,
      action: "MEMBER_PROFILE_UPDATE_REQUESTED",
      entityType: "MemberProfileUpdateRequest",
      entityId: updateRequest.id,
      details: {
        memberCode: member.memberCode,
        fullName: member.fullName,
        changes: changedFields,
      },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      message: "Profile update request submitted successfully. An administrator will review and approve your changes.",
      updateRequestId: updateRequest.id,
      changes: changedFields,
    });
  } catch (error) {
    console.error("Profile update request error:", error);
    return NextResponse.json(
      { error: "Failed to submit profile update request." },
      { status: 500 }
    );
  }
}
