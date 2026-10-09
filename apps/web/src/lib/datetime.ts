/** Convert an ISO timestamp into the local-time "YYYY-MM-DDTHH:mm" value a datetime-local input expects. */
export function toDateTimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}
