import { prisma } from "./prisma";
import { logAudit } from "./audit";

export interface SettingDefinition {
  key: string;
  value: string;
  category: "GENERAL" | "FINANCIAL" | "PAYMENT" | "POLICIES";
  description: string;
}

export const DEFAULT_SETTINGS: SettingDefinition[] = [
  {
    key: "facility_name",
    value: "Blow Fitness",
    category: "GENERAL",
    description: "Official name of the fitness center printed on receipts and cards",
  },
  {
    key: "facility_logo_url",
    value: "/blow.png",
    category: "GENERAL",
    description: "Official gym brand logo (PNG, JPG, SVG or WEBP)",
  },
  {
    key: "facility_tagline",
    value: "Premier Athletic & Performance Center",
    category: "GENERAL",
    description: "Brand subtitle and slogan",
  },
  {
    key: "facility_address",
    value: "Bole Medhanialem, Camoros St, Addis Ababa, Ethiopia",
    category: "GENERAL",
    description: "Physical location printed on member cards and receipts",
  },
  {
    key: "facility_phone",
    value: "+251 91 100 2233",
    category: "GENERAL",
    description: "Primary front desk customer support line",
  },
  {
    key: "facility_email",
    value: "desk@blowfitness.et",
    category: "GENERAL",
    description: "Official facility email address",
  },
  {
    key: "currency_code",
    value: "ETB",
    category: "FINANCIAL",
    description: "Base currency symbol and code used for all pricing",
  },
  {
    key: "card_replacement_fee",
    value: "100",
    category: "FINANCIAL",
    description: "Standard charge (ETB) applied when re-issuing a lost physical card",
  },
  {
    key: "dedicated_locker_fee",
    value: "500",
    category: "FINANCIAL",
    description: "Monthly fee (ETB) for reserving a dedicated personal locker",
  },
  {
    key: "day_pass_fee",
    value: "200",
    category: "FINANCIAL",
    description: "Single-entry visitor day pass fee (ETB)",
  },
  {
    key: "registration_fee",
    value: "100",
    category: "FINANCIAL",
    description: "Standard one-time registration fee (ETB) charged to first-time members",
  },
  {
    key: "auto_session_timeout_hours",
    value: "4",
    category: "POLICIES",
    description: "Hours before an unreturned locker session is flagged for auto-closure",
  },
  {
    key: "calendar_display_mode",
    value: "DUAL",
    category: "POLICIES",
    description: "Calendar display: DUAL (Gregorian & Ethiopian Calendar) or GC_ONLY",
  },
  {
    key: "telebirr_merchant_id",
    value: "TB-894721",
    category: "PAYMENT",
    description: "Official Telebirr merchant ID displayed to receptionists",
  },
  {
    key: "cbe_account_number",
    value: "1000-4829-1029-4",
    category: "PAYMENT",
    description: "Commercial Bank of Ethiopia (CBE) main account for direct transfers",
  },
  {
    key: "receipt_footer_note",
    value: "Thank you for training with Blow Fitness! Hard work pays off.",
    category: "POLICIES",
    description: "Custom message printed at the bottom of 80mm thermal receipts",
  },
];

export async function ensureDefaultSettings() {
  for (const s of DEFAULT_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: {
        key: s.key,
        value: s.value,
        category: s.category,
        description: s.description,
      },
    });
  }
}

export async function getAllSettings() {
  await ensureDefaultSettings();
  return await prisma.systemSetting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });
}

export async function getSettingValue(key: string, defaultValue = ""): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  return setting?.value || defaultValue;
}

export async function updateSetting(key: string, value: string, userId?: string) {
  const current = await prisma.systemSetting.findUnique({ where: { key } });
  const updated = await prisma.systemSetting.update({
    where: { key },
    data: {
      value,
      updatedById: userId || null,
    },
  });

  await logAudit({
    userId,
    action: "CONFIG_UPDATED",
    entityType: "SystemSetting",
    entityId: key,
    details: {
      key,
      oldValue: current?.value,
      newValue: value,
    },
  });

  return updated;
}
