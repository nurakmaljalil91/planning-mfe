import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
  CreateEventDto,
  CreatePlannerTaskDto,
  EventDto,
  PlannerTaskDto,
  ReminderDto
} from '../core/models/planner.models';
import { CalendarItem, CalendarItemType } from './calendar.mock';
import { CalendarSidebarComponent } from './calendar-sidebar/calendar-sidebar.component';

type CalendarView = 'month' | 'week' | 'day';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  items: CalendarItem[];
}

interface DraftItem {
  title: string;
  type: CalendarItemType;
  date: Date;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, FormsModule, CxsButtonComponent, CxsDialogComponent, CalendarSidebarComponent],
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

  viewMode: CalendarView = 'month';
  currentDate = this.startOfDay(new Date());
  selectedDate = this.startOfDay(new Date());
  items = signal<CalendarItem[]>([]);
  isComposerOpen = false;
  draft: DraftItem = this.buildDraft(this.selectedDate);

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
  }

  goToday(): void {
    this.currentDate = this.startOfDay(new Date());
    this.selectedDate = this.currentDate;
  }

  prev(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
      return;
    }

    if (this.viewMode === 'week') {
      this.currentDate = this.addDays(this.currentDate, -7);
      return;
    }

    this.currentDate = this.addDays(this.currentDate, -1);
  }

  next(): void {
    if (this.viewMode === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
      return;
    }

    if (this.viewMode === 'week') {
      this.currentDate = this.addDays(this.currentDate, 7);
      return;
    }

    this.currentDate = this.addDays(this.currentDate, 1);
  }

  openComposer(date?: Date): void {
    const targetDate = date ? this.startOfDay(date) : this.startOfDay(this.currentDate);
    this.selectedDate = targetDate;
    this.draft = this.buildDraft(targetDate);
    this.isComposerOpen = true;
  }

  closeComposer(): void {
    this.isComposerOpen = false;
  }

  saveDraft(): void {
    if (!this.draft.title.trim()) {
      return;
    }

    const start = this.combineDateAndTime(this.draft.date, this.draft.startTime);
    const end = this.combineDateAndTime(this.draft.date, this.draft.endTime);

    if (this.draft.type === 'event') {
      const dto: CreateEventDto = {
        calendarId: this.primaryCalendarId() ?? 0,
        title: this.draft.title.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString()
      };
      this.isLoading.set(true);
      this.eventService.createEvent(dto).subscribe({
        next: (created) => {
          this.items.update((current) => [...current, this.mapEventToCalendarItem(created)]);
          this.isComposerOpen = false;
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Failed to save event');
          this.isLoading.set(false);
        }
      });
    } else if (this.draft.type === 'task') {
      const dto: CreatePlannerTaskDto = {
        calendarId: this.primaryCalendarId() ?? 0,
        title: this.draft.title.trim(),
        dueDate: start.toISOString()
      };
      this.isLoading.set(true);
      this.taskService.createTask(dto).subscribe({
        next: (created) => {
          this.items.update((current) => [...current, this.mapTaskToCalendarItem(created)]);
          this.isComposerOpen = false;
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Failed to save task');
          this.isLoading.set(false);
        }
      });
    } else {
      this.items.update((current) => [
        ...current,
        {
          id: `reminder-${Date.now()}`,
          title: this.draft.title.trim(),
          type: 'reminder' as const,
          start
        }
      ]);
      this.isComposerOpen = false;
    }
  }

  openItem(event: MouseEvent): void {
    event.stopPropagation();
  }

  itemsForDate(date: Date): CalendarItem[] {
    const visible = this.visibleCalendarIds;
    return this.items().filter(
      (item) =>
        this.isSameDay(item.start, date) &&
        (item.calendarId == null || visible.has(item.calendarId))
    );
  }

  itemsForHour(date: Date, hour: number): CalendarItem[] {
    const visible = this.visibleCalendarIds;
    return this.items().filter(
      (item) =>
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
    forkJoin({
      events: this.eventService.getEvents(undefined, { page: 1, total: 200 }),
      tasks: this.taskService.getTasks(undefined, { page: 1, total: 200 })
    }).subscribe({
      next: ({ events, tasks }) => {
        const eventItems = events.items.map((e) => this.mapEventToCalendarItem(e));
        const taskItems = tasks.items.map((t) => this.mapTaskToCalendarItem(t));
        const reminderItems = events.items.flatMap((e) =>
          e.reminders.map((r) => this.mapReminderToCalendarItem(r))
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

  private mapEventToCalendarItem(event: EventDto): CalendarItem {
    return {
      id: `event-${event.id}`,
      title: event.title,
      type: 'event',
      start: new Date(event.startTime),
      end: new Date(event.endTime),
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

  private buildDraft(date: Date): DraftItem {
    return {
      title: '',
      type: 'event',
      date: new Date(date),
      startTime: '09:00',
      endTime: '10:00'
    };
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
}
