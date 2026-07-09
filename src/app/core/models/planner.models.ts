export interface BaseResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  errors: Record<string, string[]> | null;
}

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginationParams {
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

export interface ReminderDto {
  id: number;
  eventId: number;
  title: string;
  reminderDateTime: string;
  isSent: boolean;
}

export interface EventDto {
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

export interface PlannerTaskDto {
  id: number;
  calendarId: number;
  title: string;
  note: string | null;
  priority: 0 | 1 | 2 | 3;
  dueDate: string | null;
  reminder: string | null;
  isCompleted: boolean;
}

export interface CalendarDto {
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

export interface CalendarSubscriptionDto {
  id: number;
  userId: string;
  calendarId: number;
  isVisible: boolean;
  calendar: CalendarDto | null;
}

export interface CreateEventDto {
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

export interface UpdateEventDto {
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  location?: string | null;
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

export interface CreatePlannerTaskDto {
  calendarId: number;
  title: string;
  note?: string | null;
  priority?: 0 | 1 | 2 | 3;
  dueDate?: string | null;
  reminder?: string | null;
}

export interface UpdatePlannerTaskDto {
  title?: string;
  note?: string | null;
  priority?: 0 | 1 | 2 | 3;
  dueDate?: string | null;
  reminder?: string | null;
}

export interface CreateCalendarDto {
  title: string;
  description?: string | null;
  timeZone?: string | null;
  isPrimary?: boolean;
}

export interface CreatePublicCalendarDto {
  title: string;
  description?: string | null;
  timeZone?: string | null;
  isPrimary?: boolean;
}

export interface UpdateCalendarDto {
  title?: string;
  description?: string | null;
  timeZone?: string | null;
  color?: string | null;
}

export interface CreateReminderDto {
  eventId: number;
  title: string;
  reminderDateTime: string;
}

export interface UpdateReminderDto {
  title?: string;
  reminderDateTime?: string;
}
