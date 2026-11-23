import {
  CalendarDto,
  EventDto,
  PaginatedResult,
  PlannerTaskDto,
  ReminderDto
} from '../../core/models/planner.models';

export const makeCalendar = (overrides: Partial<CalendarDto> = {}): CalendarDto => ({
  id: 1,
  title: 'My Calendar',
  description: null,
  timeZone: null,
  isPrimary: true,
  isPublic: false,
  isVisible: true,
  isGoogleCalendar: false,
  userId: 'user-1',
  color: null,
  events: [],
  tasks: [],
  ...overrides
});

export const makeEvent = (overrides: Partial<EventDto> = {}): EventDto => ({
  id: 1,
  calendarId: 1,
  title: 'Event',
  description: null,
  startTime: '2026-07-06T09:00:00.000Z',
  endTime: '2026-07-06T10:00:00.000Z',
  location: null,
  isAllDay: false,
  isRecurring: false,
  recurrenceRule: null,
  reminders: [],
  ...overrides
});

export const makeTask = (overrides: Partial<PlannerTaskDto> = {}): PlannerTaskDto => ({
  id: 1,
  calendarId: 1,
  title: 'Task',
  note: null,
  priority: 0,
  dueDate: '2026-07-15T09:00:00.000Z',
  reminder: null,
  isCompleted: false,
  ...overrides
});

export const makeReminder = (overrides: Partial<ReminderDto> = {}): ReminderDto => ({
  id: 45,
  eventId: 23,
  title: 'Prepare notes',
  reminderDateTime: '2026-07-15T11:00:00.000Z',
  isSent: false,
  ...overrides
});

export const makePaginatedResult = <T>(items: T[]): PaginatedResult<T> => ({
  items,
  pageNumber: 1,
  totalPages: 1,
  totalCount: items.length,
  hasPreviousPage: false,
  hasNextPage: false
});
