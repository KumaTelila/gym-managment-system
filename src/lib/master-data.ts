import { prisma } from "./prisma";
import { logAudit } from "./audit";

export const DEFAULT_PAYMENT_ACCOUNTS = [
  {
    code: "CASH",
    name: "Front Desk Cash Drawer",
    accountNumber: "CASH-REGISTER-01",
    accountHolder: "Front Desk Cashier",
    instructions: "Collect cash banknotes and provide receipt",
  },
  {
    code: "TELEBIRR",
    name: "Telebirr Official Merchant",
    accountNumber: "TB-894721",
    accountHolder: "Blow Fitness Gym PLC",
    instructions: "Ask member to show Telebirr SMS confirmation with transaction ID",
  },
  {
    code: "CBE_TRANSFER",
    name: "Commercial Bank of Ethiopia (CBE)",
    accountNumber: "1000-4829-1029-4",
    accountHolder: "Blow Fitness PLC",
    instructions: "Verify transaction ref code via CBE mobile banking or paper slip",
  },
  {
    code: "AWASH_TRANSFER",
    name: "Awash Bank Direct Account",
    accountNumber: "0130-4819-2040-00",
    accountHolder: "Blow Fitness PLC",
    instructions: "Verify Awash Birr / transfer confirmation slip",
  },
];

export async function ensureDefaultPaymentAccounts() {
  for (const acc of DEFAULT_PAYMENT_ACCOUNTS) {
    await prisma.paymentAccount.upsert({
      where: { code: acc.code },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        accountNumber: acc.accountNumber,
        accountHolder: acc.accountHolder,
        instructions: acc.instructions,
        isActive: true,
      },
    });
  }
}

export async function getMasterDataSummary() {
  await ensureDefaultPaymentAccounts();
  const [plans, paymentAccounts, lockers, products, categories] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { durationDays: "asc" } }),
    prisma.paymentAccount.findMany({ orderBy: { name: "asc" } }),
    prisma.locker.findMany({ orderBy: [{ section: "asc" }, { lockerNumber: "asc" }] }),
    prisma.product.findMany({ include: { category: true }, orderBy: { name: "asc" } }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    plans,
    paymentAccounts,
    lockers,
    products,
    categories,
  };
}
