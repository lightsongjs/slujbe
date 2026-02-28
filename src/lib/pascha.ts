/**
 * pascha.ts
 *
 * Orthodox Computus -- calculates the date of Pascha (Easter) for any year
 * using Meeus's Julian algorithm, then converts to the Gregorian calendar.
 *
 * Reference:
 *   Jean Meeus, "Astronomical Algorithms", Chapter 9.
 *   The Julian Easter date is shifted to Gregorian by adding the century
 *   offset (13 days for years 1900-2099).
 */

/**
 * Returns the Gregorian-calendar Date of Orthodox Pascha for the given year.
 *
 * Algorithm (Meeus's Julian Easter):
 *   a = year % 4
 *   b = year % 7
 *   c = year % 19
 *   d = (19c + 15) % 30
 *   e = (2a + 4b - d + 34) % 7
 *   month = floor((d + e + 114) / 31)   -- 3 = March, 4 = April (Julian)
 *   day   = ((d + e + 114) % 31) + 1
 *
 * Then convert Julian date to Gregorian by adding the century offset.
 * For years 1900-2099 the offset is +13 days.
 */
export function getPascha(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;

  const julianMonth = Math.floor((d + e + 114) / 31); // 3 = March, 4 = April
  const julianDay = ((d + e + 114) % 31) + 1;

  // Century offset (Julian -> Gregorian).
  // For the range we care about (1900-2099) the offset is 13 days.
  const centuryOffset = getCenturyOffset(year);

  // Build the Julian date, then add the offset.
  // We construct it in UTC to avoid timezone shifts.
  const julianAsGregorian = new Date(
    Date.UTC(year, julianMonth - 1, julianDay)
  );
  julianAsGregorian.setUTCDate(julianAsGregorian.getUTCDate() + centuryOffset);

  // Return a plain Date at midnight UTC.
  return new Date(
    Date.UTC(
      julianAsGregorian.getUTCFullYear(),
      julianAsGregorian.getUTCMonth(),
      julianAsGregorian.getUTCDate()
    )
  );
}

/**
 * Returns Clean Monday, the first day of Great Lent (Pascha - 48 days).
 * Great Lent begins on Clean Monday, 48 days (7 full weeks minus 1 day)
 * before Pascha Sunday.
 */
export function getLentStart(year: number): Date {
  const pascha = getPascha(year);
  const lentStart = new Date(pascha);
  lentStart.setUTCDate(lentStart.getUTCDate() - 48);
  return lentStart;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Julian-to-Gregorian century offset.
 * century = floor(year / 100)
 * offset  = century - floor(century / 4) - 2
 *
 * 1900-2099 -> 13 days
 */
function getCenturyOffset(year: number): number {
  const century = Math.floor(year / 100);
  return century - Math.floor(century / 4) - 2;
}
