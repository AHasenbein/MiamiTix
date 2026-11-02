/** Convert an ISO timestamp into the local-time "YYYY-MM-DDTHH:mm" value a datetime-local input expects. */
export function toDateTimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

/** True once an event's start time has passed. */
export function hasEventStarted(isoString: string): boolean {
  const time = new Date(isoString).getTime();
  return Number.isFinite(time) && time < Date.now();
}

const MIAMI_TIME_ZONE = "America/New_York";

function formatInZone(date: Date, options: Intl.DateTimeFormatOptions, timeZone?: string): string {
  return date.toLocaleString(undefined, { ...options, timeZone });
}

const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
const DAY_OPTIONS: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };

/**
 * " (11:00 PM Miami)" when the viewer's clock differs from Miami's at that moment, else "".
 * Includes the Miami day too when it falls on a different date than the viewer's.
 */
export function miamiTimeSuffix(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localDay = formatInZone(date, DAY_OPTIONS);
  const miamiDay = formatInZone(date, DAY_OPTIONS, MIAMI_TIME_ZONE);
  const localTime = formatInZone(date, TIME_OPTIONS);
  const miamiTime = formatInZone(date, TIME_OPTIONS, MIAMI_TIME_ZONE);
  if (localDay === miamiDay && localTime === miamiTime) {
    return "";
  }
  return localDay === miamiDay ? ` (${miamiTime} Miami)` : ` (${miamiDay}, ${miamiTime} Miami)`;
}

/** Full event date/time in the viewer's timezone, with Miami time in parentheses if different. */
export function formatEventDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const suffix = miamiTimeSuffix(isoString);
  const local = date.toLocaleString(undefined, {
    ...DAY_OPTIONS,
    ...TIME_OPTIONS,
    ...(suffix ? { timeZoneName: "short" } : {})
  });
  return `${local}${suffix}`;
}
