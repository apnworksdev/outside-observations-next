/**
 * Closed archive timetable.
 * Archive is "closed" when hour >= CLOSED_START_HOUR and < CLOSED_END_HOUR
 * in the given timezone (or local time if no timezone).
 *
 * - Set CLOSED_TIMEZONE to a string (e.g. 'UTC') to use middleware redirect (same window for all).
 * - Set CLOSED_TIMEZONE to null or '' for "your local time" (client-side redirect only).
 */

export const CLOSED_START_HOUR = 3;
export const CLOSED_END_HOUR = 6;

/** If set (e.g. 'UTC'), middleware redirect and countdown use this. If null/'', client redirect and local time. */
export const CLOSED_TIMEZONE = null;

/** True when we use timezone-based redirect in middleware (CLOSED_TIMEZONE is non-empty). */
export const useTimezoneRedirect = Boolean(CLOSED_TIMEZONE);

function getHourInZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return new Date().getHours();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10) || 0;
  } catch {
    return new Date().getHours();
  }
}

function getTimeInZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') {
    const d = new Date();
    return { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
  }
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
    return { hour: get('hour'), minute: get('minute'), second: get('second') };
  } catch {
    const d = new Date();
    return { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
  }
}

/**
 * True when current time is in the closed window.
 * @param {string | null | undefined} [timeZone] - IANA zone (e.g. 'UTC'). If omitted, uses CLOSED_TIMEZONE when set, else local time.
 */
export function isInClosedHours(timeZone) {
  const zone = timeZone ?? CLOSED_TIMEZONE;
  const hour = zone && String(zone).trim() ? getHourInZone(zone) : new Date().getHours();
  return hour >= CLOSED_START_HOUR && hour < CLOSED_END_HOUR;
}

/** Next occurrence of targetHour (0–23) in the given timezone, as a Date. */
export function getNextTargetHourInZone(timeZone, targetHour) {
  const now = new Date();
  const { hour, minute, second } = getTimeInZone(timeZone);
  let deltaSeconds = (targetHour - hour) * 3600 - minute * 60 - second;
  if (deltaSeconds <= 0) deltaSeconds += 24 * 3600;
  return new Date(now.getTime() + deltaSeconds * 1000);
}

function formatHour12(hour) {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00${ampm}`;
}

/** Human-readable closed window. */
export function getClosedHoursLabel() {
  const start = formatHour12(CLOSED_START_HOUR);
  const end = formatHour12(CLOSED_END_HOUR);
  const suffix = useTimezoneRedirect ? ` ${CLOSED_TIMEZONE}` : '';
  return `${start} – ${end}${suffix}`;
}
