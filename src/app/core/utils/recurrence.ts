import { EventDto } from '../models/planner.models';

export type DateRange = {
  start: Date;
  end: Date;
}

export type Occurrence = {
  start: Date;
  end: Date;
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
};

/**
 * Expands a weekly recurring event into its occurrences within the given range.
 * Returns null when the event is not recurring, uses an unsupported rule, or has no
 * occurrence in the range; callers then fall back to the event's own start/end.
 * Without a range, occurrences are generated up to 365 days from today.
 */
export function expandWeeklyOccurrences(event: EventDto, range?: DateRange): Occurrence[] | null {
  if (!event.isRecurring || !event.recurrenceRule) {
    return null;
  }

  // Only handle FREQ=WEEKLY (the only frequency the UI creates)
  if (!event.recurrenceRule.includes('FREQ=WEEKLY')) {
    return null;
  }

  const byDayMatch = event.recurrenceRule.match(/BYDAY=([A-Z,]+)/);
  if (!byDayMatch) {
    return null;
  }
  const targetDays = new Set<number>(
    byDayMatch[1].split(',').filter((d) => d in DAY_MAP).map((d) => DAY_MAP[d])
  );

  let untilDate: Date | null = null;
  const untilMatch = event.recurrenceRule.match(/UNTIL=(\d{8}T\d{6}Z)/);
  if (untilMatch) {
    const raw = untilMatch[1];
    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10) - 1;
    const day = parseInt(raw.slice(6, 8), 10);
    untilDate = new Date(Date.UTC(year, month, day));
  }

  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);
  const durationMs = eventEnd.getTime() - eventStart.getTime();
  const fallbackEnd = addDays(startOfDay(new Date()), 365);
  const windowStart = range
    ? maxDate(startOfDay(eventStart), startOfDay(range.start))
    : startOfDay(eventStart);
  const windowEnd = range ? range.end : fallbackEnd;

  const occurrences: Occurrence[] = [];
  const cursor = startOfDay(windowStart);

  while (cursor < windowEnd) {
    if (untilDate && cursor > untilDate) {
      break;
    }

    if (targetDays.has(cursor.getDay())) {
      const start = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate(),
        eventStart.getHours(),
        eventStart.getMinutes(),
        eventStart.getSeconds()
      );
      occurrences.push({ start, end: new Date(start.getTime() + durationMs) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences.length > 0 ? occurrences : null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function maxDate(first: Date, second: Date): Date {
  return first > second ? first : second;
}
