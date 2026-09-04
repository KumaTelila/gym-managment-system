/**
 * Ethiopian Calendar (EC) Conversion Engine
 * 
 * Ethiopian Calendar has 12 months of 30 days each, plus a 13th month (Pagumē)
 * with 5 days (6 days in leap years).
 * Ethiopian New Year (Meskerem 1) corresponds to September 11 (or Sept 12 in leap years).
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  formatted: string;
}

export const ETHIOPIAN_MONTHS = [
  "Meskerem", // 1
  "Tikimt",   // 2
  "Hidar",    // 3
  "Tahsas",   // 4
  "Tir",      // 5
  "Yakatit",  // 6
  "Megabit",  // 7
  "Miyazya",  // 8
  "Ginbot",   // 9
  "Sene",     // 10
  "Hamle",    // 11
  "Nehase",   // 12
  "Pagumē",   // 13
];

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/**
 * Converts a Gregorian Date to an Ethiopian Calendar Date
 */
export function toEthiopianDate(gregorianDate: Date | string | number): EthiopianDate {
  const date = new Date(gregorianDate);
  const gy = date.getUTCFullYear();
  const gm = date.getUTCMonth() + 1; // 1-12
  const gd = date.getUTCDate();

  // Determine if Gregorian year is leap
  const isGLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;

  // Ethiopian new year in September
  // If year is leap year in Ethiopian calendar (gy % 4 === 3), Meskerem 1 is Sept 12
  const newYearDay = ((gy - 1) % 4 === 3) ? 12 : 11;

  let ey = gy - 8;
  let em = 1;
  let ed = 1;

  // Days in Gregorian months
  const gDaysInMonth = [31, isGLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Calculate day of Gregorian year (1-based)
  let dayOfYear = gd;
  for (let i = 0; i < gm - 1; i++) {
    dayOfYear += gDaysInMonth[i];
  }

  // Day of year for Ethiopian New Year (Sept 11 or 12)
  let newYearDayOfYear = newYearDay;
  for (let i = 0; i < 8; i++) { // Jan through Aug
    newYearDayOfYear += gDaysInMonth[i];
  }

  if (dayOfYear >= newYearDayOfYear) {
    // Dates from Meskerem 1 through end of Gregorian year
    ey = gy - 7;
    const daysSinceNewYear = dayOfYear - newYearDayOfYear;
    em = Math.floor(daysSinceNewYear / 30) + 1;
    ed = (daysSinceNewYear % 30) + 1;
  } else {
    // Dates before Ethiopian New Year (from Jan 1 to Pagumē)
    ey = gy - 8;
    // Days in previous Gregorian year since Meskerem 1
    const prevGLeap = ((gy - 1) % 4 === 0 && (gy - 1) % 100 !== 0) || (gy - 1) % 400 === 0;
    const prevNewYearDay = ((gy - 2) % 4 === 3) ? 12 : 11;
    let prevNewYearDayOfYear = prevNewYearDay;
    const prevGDaysInMonth = [31, prevGLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let i = 0; i < 8; i++) {
      prevNewYearDayOfYear += prevGDaysInMonth[i];
    }
    const daysInPrevYear = prevGLeap ? 366 : 365;
    const daysInPrevAfterNewYear = daysInPrevYear - prevNewYearDayOfYear;
    const totalDaysSinceNewYear = daysInPrevAfterNewYear + dayOfYear;

    em = Math.floor(totalDaysSinceNewYear / 30) + 1;
    ed = (totalDaysSinceNewYear % 30) + 1;
  }

  const monthName = ETHIOPIAN_MONTHS[em - 1] || "Pagumē";
  const formatted = `${ed} ${monthName} ${ey} E.C.`;

  return {
    year: ey,
    month: em,
    day: ed,
    monthName,
    formatted,
  };
}

/**
 * Formats a date showing both Gregorian and Ethiopian representation
 * Example: "Oct 24, 2026 (Tikimt 14, 2019 E.C.)"
 */
export function formatDualDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const gcStr = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const ec = toEthiopianDate(d);
  return `${gcStr} (${ec.monthName} ${ec.day}, ${ec.year} E.C.)`;
}

/**
 * Formats a date as Ethiopian numeric format DD/MM/YY as seen on physical gym cards
 * Example: "08/07/18"
 */
export function formatEthiopianNumericDate(date: Date | string | null | undefined): string {
  if (!date) return "--/--/--";
  const ec = toEthiopianDate(date);
  const dd = String(ec.day).padStart(2, "0");
  const mm = String(ec.month).padStart(2, "0");
  const yy = String(ec.year).slice(-2);
  return `${dd}/${mm}/${yy}`;
}
