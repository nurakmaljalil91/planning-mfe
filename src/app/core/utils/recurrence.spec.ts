import { EventDto } from '../models/planner.models';
import { expandWeeklyOccurrences } from './recurrence';

const makeEvent = (overrides: Partial<EventDto> = {}): EventDto => ({
  id: 1,
  calendarId: 1,
  title: 'Standup',
  description: null,
  // Monday 6 Jul 2026, 09:00-09:30 local time
  startTime: new Date(2026, 6, 6, 9, 0).toISOString(),
  endTime: new Date(2026, 6, 6, 9, 30).toISOString(),
  location: null,
  isAllDay: false,
  isRecurring: true,
  recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO',
  reminders: [],
  ...overrides
});

const startsOf = (occurrences: { start: Date }[] | null): string[] =>
  (occurrences ?? []).map((o) => o.start.toISOString());

describe('expandWeeklyOccurrences', () => {
  it('returns null for a non-recurring event', () => {
    expect(expandWeeklyOccurrences(makeEvent({ isRecurring: false, recurrenceRule: null }))).toBeNull();
  });

  it('returns null for a non-weekly rule', () => {
    expect(expandWeeklyOccurrences(makeEvent({ recurrenceRule: 'FREQ=DAILY' }))).toBeNull();
  });

  it('returns null when BYDAY is missing', () => {
    expect(expandWeeklyOccurrences(makeEvent({ recurrenceRule: 'FREQ=WEEKLY' }))).toBeNull();
  });

  it('expands every BYDAY weekday inside the range, keeping time and duration', () => {
    const occurrences = expandWeeklyOccurrences(
      makeEvent({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE' }),
      { start: new Date(2026, 6, 6), end: new Date(2026, 6, 13) }
    );

    expect(startsOf(occurrences)).toEqual([
      new Date(2026, 6, 6, 9, 0).toISOString(),
      new Date(2026, 6, 8, 9, 0).toISOString()
    ]);
    expect(occurrences!.every((o) => o.end.getTime() - o.start.getTime() === 30 * 60 * 1000)).toBeTrue();
  });

  it('stops after UNTIL', () => {
    const occurrences = expandWeeklyOccurrences(
      makeEvent({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260714T000000Z' }),
      { start: new Date(2026, 6, 1), end: new Date(2026, 7, 1) }
    );

    expect(startsOf(occurrences)).toEqual([
      new Date(2026, 6, 6, 9, 0).toISOString(),
      new Date(2026, 6, 13, 9, 0).toISOString()
    ]);
  });

  it('clips occurrences to the range for a series that started before it', () => {
    const occurrences = expandWeeklyOccurrences(makeEvent(), {
      start: new Date(2026, 8, 1),
      end: new Date(2026, 8, 15)
    });

    expect(startsOf(occurrences)).toEqual([
      new Date(2026, 8, 7, 9, 0).toISOString(),
      new Date(2026, 8, 14, 9, 0).toISOString()
    ]);
  });

  it('excludes occurrences on or after the range end', () => {
    const occurrences = expandWeeklyOccurrences(makeEvent(), {
      start: new Date(2026, 6, 6),
      end: new Date(2026, 6, 13)
    });

    expect(startsOf(occurrences)).toEqual([new Date(2026, 6, 6, 9, 0).toISOString()]);
  });

  it('returns null when no occurrence falls in the range', () => {
    const occurrences = expandWeeklyOccurrences(
      makeEvent({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260714T000000Z' }),
      { start: new Date(2026, 8, 1), end: new Date(2026, 8, 30) }
    );

    expect(occurrences).toBeNull();
  });

  it('defaults to a 365-day window from today without a range', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 6, 6, 12, 0));
    try {
      const occurrences = expandWeeklyOccurrences(makeEvent());
      expect(occurrences!.length).toBe(53);
      expect(occurrences![0].start).toEqual(new Date(2026, 6, 6, 9, 0));
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
