import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CxsButtonComponent, CxsDialogComponent, CxsInputComponent, CxsSelectComponent } from 'cerxos-ui';

import { EventService } from '../../core/services/event.service';
import { PlannerTaskService } from '../../core/services/planner-task.service';
import { ReminderService } from '../../core/services/reminder.service';
import {
  CalendarDto,
  CreateEventDto,
  CreatePlannerTaskDto,
  EventDto,
  PlannerTaskDto
} from '../../core/models/planner.models';
import { expandWeeklyOccurrences } from '../../core/utils/recurrence';
import { CalendarItem, CalendarItemType } from '../calendar.mock';

export type RecurrenceDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

type DraftItem = {
  title: string;
  type: CalendarItemType;
  calendarId: number;
  eventId: number | null;
  date: Date;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceDays: RecurrenceDay[];
  recurrenceEndDate: string;
}

@Component({
  selector: 'app-event-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, CxsButtonComponent, CxsDialogComponent, CxsInputComponent, CxsSelectComponent],
  templateUrl: './event-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventComposerComponent implements OnChanges {
  private readonly eventService = inject(EventService);
  private readonly taskService = inject(PlannerTaskService);
  private readonly reminderService = inject(ReminderService);

  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() selectedDate: Date = new Date();
  @Input() calendars: CalendarDto[] = [];
  @Input() events: EventDto[] = [];
  @Input() calendarColorMap = new Map<number, string>();
  @Input() primaryCalendarId: number | null = null;

  @Output() saved = new EventEmitter<CalendarItem[]>();

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  draft: DraftItem = this.buildDraft(new Date());

  readonly recurrenceDayOptions: readonly { label: string; value: RecurrenceDay }[] = [
    { label: 'Mon', value: 'MO' },
    { label: 'Tue', value: 'TU' },
    { label: 'Wed', value: 'WE' },
    { label: 'Thu', value: 'TH' },
    { label: 'Fri', value: 'FR' },
    { label: 'Sat', value: 'SA' },
    { label: 'Sun', value: 'SU' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue === true) {
      this.draft = this.buildDraft(this.selectedDate);
      this.error.set(null);
    }
  }

  toggleRecurrenceDay(day: RecurrenceDay): void {
    const current = this.draft.recurrenceDays;
    const index = current.indexOf(day);
    if (index === -1) {
      this.draft = { ...this.draft, recurrenceDays: [...current, day] };
    } else {
      this.draft = { ...this.draft, recurrenceDays: current.filter((d) => d !== day) };
    }
  }

  isRecurrenceDaySelected(day: RecurrenceDay): boolean {
    return this.draft.recurrenceDays.includes(day);
  }

  setDraftCalendar(id: string | number): void {
    this.draft = { ...this.draft, calendarId: +id, eventId: null };
  }

  get reminderEvents(): EventDto[] {
    return this.events.filter((event) => event.calendarId === this.draft.calendarId);
  }

  setReminderEvent(id: string | number): void {
    this.draft = { ...this.draft, eventId: id ? +id : null };
  }

  setStartDate(date: string): void {
    this.draft = { ...this.draft, startDate: date, endDate: date };
    this.clearDateRangeError();
  }

  setEndDate(date: string): void {
    const endDate = this.isDateBefore(date, this.draft.startDate) ? this.draft.startDate : date;
    this.draft = { ...this.draft, endDate };
    this.clearDateRangeError();
  }

  close(): void {
    this.openChange.emit(false);
  }

  save(): void {
    if (!this.draft.title.trim()) {
      return;
    }
    this.error.set(null);

    const startDate = this.parseDateString(this.draft.startDate);
    const endDate = this.parseDateString(this.draft.endDate);

    if (endDate < startDate) {
      this.error.set('End date must be on or after the start date');
      return;
    }

    const start = this.draft.isAllDay
      ? this.combineDateAndTime(startDate, '00:00')
      : this.combineDateAndTime(startDate, this.draft.startTime);
    const end = this.draft.isAllDay
      ? this.combineDateAndTime(endDate, '23:59')
      : this.combineDateAndTime(endDate, this.draft.endTime);

    if (this.draft.type === 'event') {
      const isRecurring = this.draft.isRecurring && this.draft.recurrenceDays.length > 0;
      const recurrenceRule = isRecurring
        ? this.buildRrule(this.draft.recurrenceDays, this.draft.recurrenceEndDate)
        : null;

      const dto: CreateEventDto = {
        calendarId: this.draft.calendarId,
        title: this.draft.title.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isAllDay: this.draft.isAllDay,
        isRecurring,
        recurrenceRule
      };
      this.isLoading.set(true);
      this.eventService.createEvent(dto).subscribe({
        next: (created) => {
          this.saved.emit(this.expandRecurring(created));
          this.openChange.emit(false);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Failed to save event');
          this.isLoading.set(false);
        }
      });
    } else if (this.draft.type === 'task') {
      const dto: CreatePlannerTaskDto = {
        calendarId: this.draft.calendarId,
        title: this.draft.title.trim(),
        dueDate: start.toISOString()
      };
      this.isLoading.set(true);
      this.taskService.createTask(dto).subscribe({
        next: (created) => {
          this.saved.emit([this.mapTaskToCalendarItem(created)]);
          this.openChange.emit(false);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Failed to save task');
          this.isLoading.set(false);
        }
      });
    } else {
      const parent = this.reminderEvents.find((event) => event.id === this.draft.eventId);
      if (!parent) {
        this.error.set('Choose an event before saving a reminder.');
        return;
      }
      this.isLoading.set(true);
      this.reminderService.createReminder({
        eventId: parent.id,
        title: this.draft.title.trim(),
        reminderDateTime: start.toISOString()
      }).subscribe({
        next: (created) => {
          this.saved.emit([{
            id: `reminder-${created.id}`,
            title: created.title,
            type: 'reminder',
            start: new Date(created.reminderDateTime),
            calendarId: parent.calendarId
          }]);
          this.openChange.emit(false);
          this.isLoading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(err instanceof Error ? err.message : 'Failed to save reminder');
          this.isLoading.set(false);
        }
      });
    }
  }

  private buildDraft(date: Date): DraftItem {
    const dateStr = this.formatDateToYYYYMMDD(date);
    return {
      title: '',
      type: 'event',
      calendarId: this.primaryCalendarId ?? 0,
      eventId: null,
      date: new Date(date),
      startDate: dateStr,
      endDate: dateStr,
      startTime: '09:00',
      endTime: '10:00',
      isAllDay: false,
      isRecurring: false,
      recurrenceDays: [],
      recurrenceEndDate: ''
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
    const start = startRaw !== null && startRaw !== undefined ? new Date(startRaw) : new Date();
    return {
      id: `task-${task.id}`,
      title: task.title,
      type: 'task',
      start,
      notes: task.note ?? undefined,
      calendarId: task.calendarId
    };
  }

  private expandRecurring(event: EventDto): CalendarItem[] {
    const base = this.mapEventToCalendarItem(event);
    const occurrences = expandWeeklyOccurrences(event);
    if (!occurrences) {
      return [base];
    }
    return occurrences.map(({ start, end }) => ({
      ...base,
      id: `event-${event.id}-${start.toISOString()}`,
      start,
      end
    }));
  }

  private buildRrule(days: readonly RecurrenceDay[], endDate: string): string {
    const byDay = days.join(',');
    let rule = `FREQ=WEEKLY;BYDAY=${byDay}`;
    if (endDate) {
      rule += `;UNTIL=${endDate.replace(/-/g, '')}T000000Z`;
    }
    return rule;
  }

  private parseDateString(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map((v) => Number.parseInt(v, 10));
    return new Date(year, month - 1, day);
  }

  private isDateBefore(date: string, compareDate: string): boolean {
    if (!date || !compareDate) {
      return false;
    }

    return date < compareDate;
  }

  private clearDateRangeError(): void {
    if (this.error() === 'End date must be on or after the start date') {
      this.error.set(null);
    }
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map((v) => Number.parseInt(v, 10));
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
  }

  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
