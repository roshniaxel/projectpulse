// Timezone-aware date helpers.
//
// `toISOString().split("T")[0]` returns the UTC date, which silently breaks
// every "today" calculation east of UTC after local midnight crosses 00:00 UTC
// (e.g. IST is 5h30 ahead, so 2026-05-15 00:00 IST = 2026-05-14 18:30 UTC —
// `new Date().toISOString().split("T")[0]` returns "2026-05-14" from midnight
// IST until 5:30 AM IST).
//
// These helpers do everything in a target timezone instead. The default is
// Asia/Kolkata since the team is in India; override server-side with the
// APP_TIMEZONE env var. The browser version of these helpers uses the
// runtime-resolved zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).

export const DEFAULT_SERVER_TZ =
  (typeof process !== "undefined" && process.env.APP_TIMEZONE) || "Asia/Kolkata";

// Format a Date as YYYY-MM-DD in the given timezone. en-CA conveniently
// renders ISO-style date order with `-` separators, so no manual padding.
export function tzDateString(date: Date = new Date(), tz: string = DEFAULT_SERVER_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Today as YYYY-MM-DD in `tz`.
export function tzToday(tz: string = DEFAULT_SERVER_TZ): string {
  return tzDateString(new Date(), tz);
}

// N calendar days ago as YYYY-MM-DD in `tz`. Uses tz-relative arithmetic by
// formatting an instant N days before "now" in the target tz, which handles
// DST transitions correctly (Date arithmetic in JS is in UTC-ms so it
// undercounts by 1h on spring-forward days if not done this way).
export function tzDaysAgo(n: number, tz: string = DEFAULT_SERVER_TZ): string {
  const ms = Date.now() - n * 24 * 60 * 60 * 1000;
  return tzDateString(new Date(ms), tz);
}

// Returns the millisecond offset between `tz` local time and UTC at the given
// instant (positive for east of UTC, negative for west). Round-trips through
// Intl.DateTimeFormat with the `sv-SE` locale, which produces the literal
// "YYYY-MM-DD HH:mm:ss" representation we want to re-parse.
function tzOffsetMs(utcInstant: Date, tz: string): number {
  const localStr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(utcInstant);
  const asIfUtc = new Date(localStr.replace(" ", "T") + "Z");
  return asIfUtc.getTime() - utcInstant.getTime();
}

// Convert a YYYY-MM-DD date string into the UTC ISO instants of its start and
// end in `tz`. End is inclusive (24h - 1ms). Used by connectors to hand
// upstream APIs the right `timeMin` / `timeMax`.
export function tzDayBoundsUtc(
  dateStr: string,
  tz: string = DEFAULT_SERVER_TZ
): { startUtc: string; endUtc: string } {
  const naiveUtcMidnight = new Date(dateStr + "T00:00:00.000Z");
  const offset = tzOffsetMs(naiveUtcMidnight, tz);
  const startMs = naiveUtcMidnight.getTime() - offset;
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  return {
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
  };
}
