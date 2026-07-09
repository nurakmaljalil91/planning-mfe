import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CxsButtonComponent, CxsDialogComponent } from 'cerxos-ui';
import { forkJoin } from 'rxjs';

import { CalendarService } from '../core/services/calendar.service';
import { EventService } from '../core/services/event.service';
import { PlannerTaskService } from '../core/services/planner-task.service';
import {
  CalendarDto,
  CalendarSubscriptionDto,
  EventDto,
  PlannerTaskDto,
  ReminderDto,
  UpdateEventDto
} from '../core/models/planner.models';
import { CalendarItem } from './calendar.mock';
import { CalendarSidebarComponent } from './calendar-sidebar/calendar-sidebar.component';
import { EventComposerComponent } from './event-composer/event-composer.component';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  items: CalendarItem[];
}

interface EditDraft {
  itemId: string;
  eventId: number | null;
  title: string;
  type: string;
  calendarId: number;
  isAllDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

interface VisibleRange {
  start: Date;
  end: Date;
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, FormsModule, CxsButtonComponent, CxsDialogComponent, CalendarSidebarComponent, EventComposerComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements OnInit {
  private readonly calendarService = inject(CalendarService);
  private readonly eventService = inject(EventService);
  private readonly taskService = inject(PlannerTaskService);

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly primaryCalendarId = signal<number | null>(null);

  readonly ownCalendars = signal<CalendarDto[]>([]);
  readonly subscriptions = signal<CalendarSubscriptionDto[]>([]);
  readonly publicCalendars = signal<CalendarDto[]>([]);

  readonly selectedItem = signal<CalendarItem | null>(null);

  private readonly COLOR_PALETTE = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

  readonly calendarColorMap = computed(() => {
    const map = new Map<number, string>();
    this.ownCalendars().forEach((cal, i) => {
      map.set(cal.id, cal.color ?? this.COLOR_PALETTE[i % this.COLOR_PALETTE.length]);
    });
    this.subscriptions().forEach((sub, i) => {
      if (sub.calendar) {
        const offset = this.ownCalendars().length + i;
        map.set(sub.calendar.id, sub.calendar.color ?? this.COLOR_PALETTE[offset % this.COLOR_PALETTE.length]);
      }
    });
    return map;
  });

  viewMode: CalendarView = 'month';
  currentDate = this.startOfDay(new Date());
  selectedDate = this.startOfDay(new Date());
  items = signal<CalendarItem[]>([]);
  isComposerOpen = false;
  isItemDetailOpen = false;
  editDraft: EditDraft | null = null;

  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly hours = Array.from({ length: 13 }, (_, index) => index + 7);

  ngOnInit(): void {
    this.loadData();
  }

  get viewLabel(): string {
    if (this.viewMode === 'month') {
      return this.currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    if (this.viewMode === 'week') {
      const start = this.startOfWeek(this.currentDate);
      const end = this.addDays(start, 6);
      return `${this.formatShortDate(start)} - ${this.formatShortDate(end)}`;
    }
    return this.currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  get monthDays(): CalendarDay[] {
    const first = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const start = this.startOfWeek(first);
    const days: CalendarDay[] = [];

    for (let offset = 0; offset < 42; offset += 1) {
      const date = this.addDays(start, offset);
      days.push({
        date,
        inMonth: date.getMonth() === this.currentDate.getMonth(),
        items: this.itemsForDate(date)
      });
    }

    return days;
  }

  get weekDaysWithItems(): CalendarDay[] {
    const start = this.startOfWeek(this.currentDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(start, index);
      return {
        date,
        inMonth: true,
        items: this.itemsForDate(date)
      };
    });
  }

  setView(mode: CalendarView): void {
    this.viewMode = mode;
    this.isComposerOpen = false;
    this.loadCalendarItems();
  }

  goToday(): void {
    this.currentDate = this.startOfDay(new Date());
    this.selectedDate = this.currentDate;
    this.loadCalendarItems();
  }

  prev(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    } else if (this.viewMode === 'week') {
      this.currentDate = this.addDays(this.currentDate, -7);
    } else {
      this.currentDate = this.addDays(this.currentDate, -1);
    }

    this.loadCalendarItems();
  }

  next(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    } else if (this.viewMode === 'week') {
      this.currentDate = this.addDays(this.currentDate, 7);
    } else {
      this.currentDate = this.addDays(this.currentDate, 1);
    }

    this.loadCalendarItems();
  }

  openComposer(date?: Date): void {
    const targetDate = date ? this.startOfDay(date) : this.startOfDay(this.currentDate);
    this.selectedDate = targetDate;
    this.isComposerOpen = true;
  }

  onComposerSaved(items: CalendarItem[]): void {
    this.items.update((current) => [...current, ...items]);
  }

  openItem(event: MouseEvent, item: CalendarItem): void {
    event.stopPropagation();
    this.selectedItem.set(item);
    const eventId = item.id.startsWith('event-') ? parseInt(item.id.split('-')[1], 10) : null;
    const startDate = this.formatDateToYYYYMMDD(item.start);
    const endDate = this.formatDateToYYYYMMDD(item.end ?? item.start);
    this.editDraft = {
      itemId: item.id,
      eventId,
      title: item.title,
      type: item.type,
      calendarId: item.calendarId ?? this.primaryCalendarId() ?? 0,
      isAllDay: item.isAllDay ?? false,
      startDate,
      endDate,
      startTime: this.formatTimeHHMM(item.start),
      endTime: this.formatTimeHHMM(item.end ?? item.start)
    };
    this.isItemDetailOpen = true;
  }

  saveEdit(): void {
    if (!this.editDraft || !this.editDraft.eventId) return;
    const startDate = this.parseDateString(this.editDraft.startDate);
    const endDate = this.parseDateString(this.editDraft.endDate);
    if (endDate < startDate) {
      this.error.set('End date must be on or after the start date');
      return;
    }
    const start = this.combineDateAndTime(startDate, this.editDraft.startTime);
    const end = this.combineDateAndTime(endDate, this.editDraft.endTime);
    const dto: UpdateEventDto = {
      title: this.editDraft.title.trim(),
      startTime: start.toISOString(),
      endTime: end.toISOString()
    };
    this.isLoading.set(true);
    this.eventService.updateEvent(this.editDraft.eventId, dto).subscribe({
      next: (updated) => {
        // Remove all items for this event (including recurring expansions), then re-expand
        const baseId = `event-${updated.id}`;
        this.items.update((current) => [
          ...current.filter((i) => !i.id.startsWith(baseId)),
          ...this.expandRecurring(updated, this.getVisibleRange())
        ]);
        this.isItemDetailOpen = false;
        this.isLoading.set(false);
        this.error.set(null);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to update event');
        this.isLoading.set(false);
      }
    });
  }

  deleteItem(): void {
    if (!this.editDraft?.eventId) {
      this.isItemDetailOpen = false;
      return;
    }
    const eventId = this.editDraft.eventId;
    const baseId = `event-${eventId}`;
    this.isLoading.set(true);
    this.eventService.deleteEvent(eventId).subscribe({
      next: () => {
        this.items.update((current) => current.filter((i) => !i.id.startsWith(baseId)));
        this.isItemDetailOpen = false;
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to delete event');
        this.isLoading.set(false);
      }
    });
  }

  itemsForDate(date: Date): CalendarItem[] {
    const visible = this.visibleCalendarIds;
    return this.items().filter(
      (item) =>
        this.isDateInRange(item.start, item.end ?? item.start, date) &&
        (item.calendarId == null || visible.has(item.calendarId))
    );
  }

  allDayItemsForDate(date: Date): CalendarItem[] {
    const visible = this.visibleCalendarIds;
    return this.items().filter(
      (item) =>
        item.isAllDay &&
        this.isDateInRange(item.start, item.end ?? item.start, date) &&
        (item.calendarId == null || visible.has(item.calendarId))
    );
  }

  itemsForHour(date: Date, hour: number): CalendarItem[] {
    const visible = this.visibleCalendarIds;
    return this.items().filter(
      (item) =>
        !item.isAllDay &&
        this.isSameDay(item.start, date) &&
        item.start.getHours() === hour &&
        (item.calendarId == null || visible.has(item.calendarId))
    );
  }

  onVisibilityToggled(event: { type: 'own' | 'subscription'; calendarId: number }): void {
    if (event.type === 'own') {
      this.calendarService.toggleCalendarVisibility(event.calendarId).subscribe({
        next: (updated) => {
          this.ownCalendars.update((cals) =>
            cals.map((c) => (c.id === updated.id ? updated : c))
          );
        }
      });
    } else {
      this.calendarService.toggleSubscriptionVisibility(event.calendarId).subscribe({
        next: (updated) => {
          this.subscriptions.update((subs) =>
            subs.map((s) => (s.calendarId === updated.calendarId ? updated : s))
          );
        }
      });
    }
  }

  onCalendarCreated(title: string): void {
    this.calendarService.createCalendar({ title }).subscribe({
      next: (created) => {
        this.ownCalendars.update((cals) => [...cals, created]);
      }
    });
  }

  onSubscribed(calendarId: number): void {
    this.calendarService.subscribeToCalendar(calendarId).subscribe({
      next: (sub) => {
        this.subscriptions.update((subs) => [...subs, sub]);
      }
    });
  }

  onUnsubscribed(calendarId: number): void {
    this.calendarService.unsubscribeFromCalendar(calendarId).subscribe({
      next: () => {
        this.subscriptions.update((subs) => subs.filter((s) => s.calendarId !== calendarId));
      }
    });
  }

  onCalendarColorChanged(event: { calendarId: number; color: string }): void {
    this.calendarService.updateCalendar(event.calendarId, { color: event.color }).subscribe({
      next: (updated) => {
        this.ownCalendars.update((cals) => cals.map((c) => (c.id === updated.id ? updated : c)));
      }
    });
  }

  calendarColor(item: CalendarItem): string {
    if (item.calendarId == null) return 'var(--cxs-color-primary)';
    return this.calendarColorMap().get(item.calendarId) ?? 'var(--cxs-color-primary)';
  }

  formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const normalized = hour % 12 || 12;
    return `${normalized}:00 ${period}`;
  }

  formatItemTime(item: CalendarItem): string {
    const start = this.formatTime(item.start);
    if (item.type !== 'event' || !item.end) {
      return start;
    }
    return `${start} - ${this.formatTime(item.end)}`;
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  trackByDate(_index: number, day: CalendarDay): number {
    return day.date.getTime();
  }

  trackByItem(_index: number, item: CalendarItem): string {
    return item.id;
  }

  private get visibleCalendarIds(): Set<number> {
    const ownIds = this.ownCalendars()
      .filter((c) => c.isVisible)
      .map((c) => c.id);
    const subIds = this.subscriptions()
      .filter((s) => s.isVisible)
      .map((s) => s.calendarId);
    return new Set([...ownIds, ...subIds]);
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      calendars: this.calendarService.getCalendars({ page: 1, total: 50 }),
      subscriptions: this.calendarService.getUserSubscriptions(),
      publicCals: this.calendarService.getPublicCalendars({ page: 1, total: 50 })
    }).subscribe({
      next: ({ calendars, subscriptions, publicCals }) => {
        this.ownCalendars.set(calendars.items);
        this.subscriptions.set(subscriptions);
        this.publicCalendars.set(publicCals.items);

        const primary = calendars.items.find((c) => c.isPrimary) ?? calendars.items[0];
        if (primary) {
          this.primaryCalendarId.set(primary.id);
          this.loadCalendarItems();
        } else {
          this.calendarService.createCalendar({ title: 'My Calendar', isPrimary: true }).subscribe({
            next: (created) => {
              this.primaryCalendarId.set(created.id);
              this.ownCalendars.update((cals) => [...cals, created]);
              this.loadCalendarItems();
            },
            error: (err: unknown) => {
              this.error.set(err instanceof Error ? err.message : 'Failed to create default calendar');
              this.isLoading.set(false);
            }
          });
        }
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load calendars');
        this.isLoading.set(false);
      }
    });
  }

  private loadCalendarItems(): void {
    const visibleRange = this.getVisibleRange();
    const rangeParams = {
      page: 1,
      total: 500,
      rangeStart: visibleRange.start.toISOString(),
      rangeEnd: visibleRange.end.toISOString()
    };

    this.isLoading.set(true);
    this.error.set(null);

    forkJoin({
      events: this.eventService.getEvents(undefined, rangeParams),
      tasks: this.taskService.getTasks(undefined, rangeParams)
    }).subscribe({
      next: ({ events, tasks }) => {
        const eventList = events?.items ?? [];
        const taskList = tasks?.items ?? [];
        const eventItems = eventList.flatMap((e) => this.expandRecurring(e, visibleRange));
        const taskItems = taskList.map((t) => this.mapTaskToCalendarItem(t));
        const reminderItems = eventList.flatMap((e) =>
          (e.reminders ?? []).map((r) => this.mapReminderToCalendarItem(r))
        );
        this.items.set([...eventItems, ...taskItems, ...reminderItems]);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load calendar data');
        this.isLoading.set(false);
      }
    });
  }

  private getVisibleRange(): VisibleRange {
    if (this.viewMode === 'month') {
      const first = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
      const start = this.startOfWeek(first);
      return {
        start,
        end: this.addDays(start, 42)
      };
    }

    if (this.viewMode === 'week') {
      const start = this.startOfWeek(this.currentDate);
      return {
        start,
        end: this.addDays(start, 7)
      };
    }

    const start = this.startOfDay(this.currentDate);
    return {
      start,
      end: this.addDays(start, 1)
    };
  }

  private mapEventToCalendarItem(event: EventDto): CalendarItem {
    return {
      id: `event-${event.id}`,
      title: event.title,
      type: 'event',
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      isAllDay: event.isAllDay,
      location: event.location ?? undefined,
      notes: event.description ?? undefined,
      calendarId: event.calendarId
    };
  }

  private mapTaskToCalendarItem(task: PlannerTaskDto): CalendarItem {
    const startRaw = task.dueDate ?? task.reminder;
    const start = startRaw != null ? new Date(startRaw) : new Date();
    return {
      id: `task-${task.id}`,
      title: task.title,
      type: 'task',
      start,
      notes: task.note ?? undefined,
      calendarId: task.calendarId
    };
  }

  private mapReminderToCalendarItem(reminder: ReminderDto): CalendarItem {
    return {
      id: `reminder-${reminder.id}`,
      title: reminder.title,
      type: 'reminder',
      start: new Date(reminder.reminderDateTime)
    };
  }

  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDateString(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map((v) => Number.parseInt(v, 10));
    return new Date(year, month - 1, day);
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private startOfWeek(date: Date): Date {
    const weekStartsOn = 1;
    const day = date.getDay();
    const diff = (day - weekStartsOn + 7) % 7;
    return this.addDays(this.startOfDay(date), -diff);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private isSameDay(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  private formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private formatTimeHHMM(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private isDateInRange(start: Date, end: Date, date: Date): boolean {
    const s = this.startOfDay(start);
    const e = this.startOfDay(end);
    const d = this.startOfDay(date);
    return d >= s && d <= e;
  }

  private expandRecurring(event: EventDto, visibleRange?: VisibleRange): CalendarItem[] {
    if (!event.isRecurring || !event.recurrenceRule) {
      return [this.mapEventToCalendarItem(event)];
    }

    // Only handle FREQ=WEEKLY (the only frequency the UI creates)
    if (!event.recurrenceRule.includes('FREQ=WEEKLY')) {
      return [this.mapEventToCalendarItem(event)];
    }

    // Parse BYDAY
    const byDayMatch = event.recurrenceRule.match(/BYDAY=([A-Z,]+)/);
    if (!byDayMatch) {
      return [this.mapEventToCalendarItem(event)];
    }
    const byDayRaw = byDayMatch[1].split(',');

    // Day-of-week mapping: JS getDay() values
    const dayMap: Record<string, number> = {
      SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
    };
    const targetDays = new Set<number>(
      byDayRaw.filter((d) => d in dayMap).map((d) => dayMap[d])
    );

    // Parse optional UNTIL
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
    const fallbackEnd = this.addDays(this.startOfDay(new Date()), 365);
    const windowStart = visibleRange
      ? this.maxDate(this.startOfDay(eventStart), this.startOfDay(visibleRange.start))
      : this.startOfDay(eventStart);
    const windowEnd = visibleRange ? visibleRange.end : fallbackEnd;

    const items: CalendarItem[] = [];
    const cursor = this.startOfDay(windowStart);

    while (cursor < windowEnd) {
      if (untilDate && cursor > untilDate) {
        break;
      }

      if (targetDays.has(cursor.getDay())) {
        const occurrenceStart = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          eventStart.getHours(),
          eventStart.getMinutes(),
          eventStart.getSeconds()
        );
        const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
        items.push({
          id: `event-${event.id}-${occurrenceStart.toISOString()}`,
          title: event.title,
          type: 'event',
          start: occurrenceStart,
          end: occurrenceEnd,
          isAllDay: event.isAllDay,
          location: event.location ?? undefined,
          notes: event.description ?? undefined,
          calendarId: event.calendarId
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return items.length > 0 ? items : [this.mapEventToCalendarItem(event)];
  }

  private maxDate(first: Date, second: Date): Date {
    return first > second ? first : second;
  }
}
