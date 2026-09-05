import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "FATAL: Database seeding with default demo credentials is blocked in production. Set ALLOW_PROD_SEED=true if this is intentional."
    );
  }

  console.log("Seeding database...");

  // 1. Staff Users
  const passwordAdmin = await bcrypt.hash("admin123", 10);
  const passwordRec = await bcrypt.hash("rec123", 10);
  const passwordMgr = await bcrypt.hash("mgr123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      fullName: "Dawit Alemu (Admin)",
      passwordHash: passwordAdmin,
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      fullName: "Mr Manager Staff",
      passwordHash: passwordMgr,
      role: "FINANCE_OWNER",
    },
  });

  const receptionist = await prisma.user.upsert({
    where: { username: "reception" },
    update: {},
    create: {
      username: "reception",
      fullName: "Bethlehem Tadesse",
      passwordHash: passwordRec,
      role: "RECEPTIONIST",
    },
  });

  console.log("Created users:", admin.username, manager.username, receptionist.username);

  // 2. Subscription Plans
  const plans = [
    { name: "Monthly Standard", durationDays: 30, priceETB: 2500, description: "Full gym access for 30 days" },
    { name: "Quarterly VIP", durationDays: 90, priceETB: 6800, description: "Full gym access for 90 days with sauna" },
    { name: "Semi-Annual Pro", durationDays: 180, priceETB: 12500, description: "Full access + trainer consultation" },
    { name: "Annual Gold", durationDays: 365, priceETB: 22000, description: "Complete all-inclusive 1-year access" },
  ];

  const createdPlans = [];
  for (const p of plans) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { id: p.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: p.name.toLowerCase().replace(/\s+/g, "-"),
        name: p.name,
        durationDays: p.durationDays,
        priceETB: p.priceETB,
        description: p.description,
      },
    });
    createdPlans.push(plan);
  }

  // 3. Lockers (Male and Female sections)
  const maleLockers = [];
  for (let i = 1; i <= 16; i++) {
    const num = `M-${String(i).padStart(2, "0")}`;
    const locker = await prisma.locker.upsert({
      where: { lockerNumber: num },
      update: {},
      create: {
        lockerNumber: num,
        section: "MALE",
        status: i === 1 ? "RESERVED" : i === 3 ? "OCCUPIED" : i === 16 ? "MAINTENANCE" : "AVAILABLE",
      },
    });
    maleLockers.push(locker);
  }

  const femaleLockers = [];
  for (let i = 1; i <= 14; i++) {
    const num = `F-${String(i).padStart(2, "0")}`;
    const locker = await prisma.locker.upsert({
      where: { lockerNumber: num },
      update: {},
      create: {
        lockerNumber: num,
        section: "FEMALE",
        status: i === 2 ? "OCCUPIED" : i === 14 ? "MAINTENANCE" : "AVAILABLE",
      },
    });
    femaleLockers.push(locker);
  }

  // 4. Members
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const membersData = [
    {
      memberCode: "BF-1001",
      fullName: "Abebe Bikila",
      phone: "+251911234567",
      email: "abebe@example.com",
      gender: "MALE" as const,
      status: "ACTIVE" as const,
      endDate: thirtyDaysLater,
    },
    {
      memberCode: "BF-1002",
      fullName: "Derartu Tulu",
      phone: "+251911345678",
      email: "derartu@example.com",
      gender: "FEMALE" as const,
      status: "ACTIVE" as const,
      endDate: thirtyDaysLater,
    },
    {
      memberCode: "BF-1003",
      fullName: "Haile Gebrselassie",
      phone: "+251911456789",
      email: "haile@example.com",
      gender: "MALE" as const,
      status: "ACTIVE" as const,
      endDate: thirtyDaysLater,
    },
    {
      memberCode: "BF-1004",
      fullName: "Tirunesh Dibaba",
      phone: "+251911567890",
      email: "tirunesh@example.com",
      gender: "FEMALE" as const,
      status: "EXPIRED" as const,
      endDate: fiveDaysAgo,
    },
    {
      memberCode: "BF-1005",
      fullName: "Kenenisa Bekele",
      phone: "+251911678901",
      email: "kenenisa@example.com",
      gender: "MALE" as const,
      status: "ACTIVE" as const,
      endDate: thirtyDaysLater,
    },
  ];

  const createdMembers = [];
  for (const m of membersData) {
    const member = await prisma.member.upsert({
      where: { memberCode: m.memberCode },
      update: {},
      create: {
        memberCode: m.memberCode,
        cardVersion: 1,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
      },
    });

    // Create subscription
    await prisma.subscription.create({
      data: {
        memberId: member.id,
        planId: createdPlans[0].id,
        startDate: tenDaysAgo,
        endDate: m.endDate,
        status: m.status,
        amountPaidETB: createdPlans[0].priceETB,
        paymentMethod: "TELEBIRR",
        paymentRef: "TB-" + Math.floor(100000 + Math.random() * 900000),
        processedById: receptionist.id,
      },
    });

    createdMembers.push(member);
  }

  // 5. Active Sessions (Abebe in M-03, Derartu in F-02)
  const lockerM3 = maleLockers.find((l) => l.lockerNumber === "M-03");
  const lockerF2 = femaleLockers.find((l) => l.lockerNumber === "F-02");

  if (lockerM3) {
    await prisma.checkinSession.create({
      data: {
        memberId: createdMembers[0].id,
        lockerId: lockerM3.id,
        sessionStatus: "ACTIVE",
        checkinTime: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
        receptionistId: receptionist.id,
      },
    });
  }

  if (lockerF2) {
    await prisma.checkinSession.create({
      data: {
        memberId: createdMembers[1].id,
        lockerId: lockerF2.id,
        sessionStatus: "ACTIVE",
        checkinTime: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
        receptionistId: receptionist.id,
      },
    });
  }

  // 6. Dedicated Monthly Locker Rental (Haile Gebrselassie in M-01)
  const lockerM1 = maleLockers.find((l) => l.lockerNumber === "M-01");
  if (lockerM1) {
    await prisma.lockerRental.create({
      data: {
        lockerId: lockerM1.id,
        memberId: createdMembers[2].id,
        startDate: tenDaysAgo,
        endDate: thirtyDaysLater,
        priceETB: 500,
        paymentMethod: "CBE_TRANSFER",
        paymentRef: "CBE-98765432",
        isActive: true,
      },
    });
  }

  // 7. POS Categories & Products
  const beverages = await prisma.productCategory.upsert({
    where: { name: "Beverages" },
    update: {},
    create: { name: "Beverages" },
  });

  const supplements = await prisma.productCategory.upsert({
    where: { name: "Supplements" },
    update: {},
    create: { name: "Supplements" },
  });

  const gear = await prisma.productCategory.upsert({
    where: { name: "Accessories" },
    update: {},
    create: { name: "Accessories" },
  });

  const products = [
    {
      categoryId: beverages.id,
      barcode: "600101",
      name: "Bottled Mineral Water 500ml",
      costPriceETB: 20,
      sellingPriceETB: 35,
      currentStock: 64,
    },
    {
      categoryId: beverages.id,
      barcode: "600102",
      name: "Pre-Workout Energy Drink",
      costPriceETB: 85,
      sellingPriceETB: 140,
      currentStock: 28,
    },
    {
      categoryId: supplements.id,
      barcode: "600201",
      name: "Whey Protein Shake (Chocolate)",
      costPriceETB: 120,
      sellingPriceETB: 180,
      currentStock: 22,
    },
    {
      categoryId: supplements.id,
      barcode: "600202",
      name: "BCAA Electrolyte Powder",
      costPriceETB: 140,
      sellingPriceETB: 220,
      currentStock: 16,
    },
    {
      categoryId: gear.id,
      barcode: "600301",
      name: "Blow Fitness Microfiber Towel",
      costPriceETB: 160,
      sellingPriceETB: 260,
      currentStock: 14,
    },
  ];

  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: {},
      create: {
        ...p,
        reorderLevel: 5,
      },
    });

    // Initial stock movement
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        type: "RESTOCK",
        quantity: p.currentStock,
        unitCostETB: p.costPriceETB,
        reason: "Initial inventory setup",
        createdById: admin.id,
      },
    });
  }

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
