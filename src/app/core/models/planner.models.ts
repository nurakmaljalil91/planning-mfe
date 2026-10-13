export type BaseResponse<T> = {
  success: boolean;
  message: string | null;
  data: T;
  errors: Record<string, string[]> | null;
}

export type PaginatedResult<T> = {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type PaginationParams = {
  page?: number;
  total?: number;
  sortBy?: string;
  descending?: boolean;
  filter?: string;
  rangeStart?: string;
  rangeEnd?: string;
}

export enum PriorityLevel {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3
}

export type ReminderDto = {
  id: number;
  eventId: number;
  title: string;
  reminderDateTime: string;
  isSent: boolean;
}

export type EventDto = {
  id: number;
  calendarId: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceRule: string | null;
  reminders: ReminderDto[];
}

export type PlannerTaskDto = {
  id: number;
  calendarId: number;
  title: string;
  note: string | null;
  priority: 0 | 1 | 2 | 3;
  dueDate: string | null;
  reminder: string | null;
  isCompleted: boolean;
}

export type CalendarDto = {
  id: number;
  title: string;
  description: string | null;
  timeZone: string | null;
  isPrimary: boolean;
  isPublic: boolean;
  isVisible: boolean;
  isGoogleCalendar: boolean;
  userId: string;
  color: string | null;
  events: EventDto[];
  tasks: PlannerTaskDto[];
}

export type CalendarSubscriptionDto = {
  id: number;
  userId: string;
  calendarId: number;
  isVisible: boolean;
  calendar: CalendarDto | null;
}

export type CreateEventDto = {
  calendarId: number;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  location?: string | null;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

export type UpdateEventDto = {
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

export type CreatePlannerTaskDto = {
  calendarId: number;
  title: string;
  note?: string | null;
  priority?: 0 | 1 | 2 | 3;
  dueDate?: string | null;
  reminder?: string | null;
}

export type UpdatePlannerTaskDto = {
  title?: string;
  note?: string | null;
  priority?: 0 | 1 | 2 | 3;
  dueDate?: string | null;
  reminder?: string | null;
}

export type CreateCalendarDto = {
  title: string;
  description?: string | null;
  timeZone?: string | null;
  isPrimary?: boolean;
}

export type CreatePublicCalendarDto = {
  title: string;
  description?: string | null;
  timeZone?: string | null;
  isPrimary?: boolean;
}

export type UpdateCalendarDto = {
  title?: string;
  description?: string | null;
  timeZone?: string | null;
  color?: string | null;
}

export type CreateReminderDto = {
  eventId: number;
  title: string;
  reminderDateTime: string;
}

export type UpdateReminderDto = {
  title?: string;
  reminderDateTime?: string;
}
