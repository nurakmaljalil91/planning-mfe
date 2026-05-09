import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CxsButtonComponent, CxsDialogComponent, CxsInputComponent, CxsSelectComponent } from 'cerxos-ui';

import { EventService } from '../../core/services/event.service';
import { PlannerTaskService } from '../../core/services/planner-task.service';
import {
  CalendarDto,
  CreateEventDto,
  CreatePlannerTaskDto,
  EventDto,
  PlannerTaskDto
} from '../../core/models/planner.models';
import { CalendarItem, CalendarItemType } from '../calendar.mock';

export type RecurrenceDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

interface DraftItem {
  title: string;
  type: CalendarItemType;
  calendarId: number;
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

  @Input() open = false;
  @Output() openChange = new EventEmitter<boolean>();

  @Input() selectedDate: Date = new Date();
  @Input() calendars: CalendarDto[] = [];
  @Input() calendarColorMap: Map<number, string> = new Map();
  @Input() primaryCalendarId: number | null = null;

  @Output() saved = new EventEmitter<CalendarItem[]>();

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  draft: DraftItem = this.buildDraft(new Date());

  readonly recurrenceDayOptions: ReadonlyArray<{ label: string; value: RecurrenceDay }> = [
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
    this.draft = { ...this.draft, calendarId: +id };
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
      this.saved.emit([{
        id: `reminder-${Date.now()}`,
        title: this.draft.title.trim(),
        type: 'reminder' as const,
        start
      }]);
      this.openChange.emit(false);
    }

    this.error.set(null);
  }

  private buildDraft(date: Date): DraftItem {
    const dateStr = this.formatDateToYYYYMMDD(date);
    return {
      title: '',
      type: 'event',
      calendarId: this.primaryCalendarId ?? 0,
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

  private expandRecurring(event: EventDto): CalendarItem[] {
    if (!event.isRecurring || !event.recurrenceRule) {
      return [this.mapEventToCalendarItem(event)];
    }

    if (!event.recurrenceRule.includes('FREQ=WEEKLY')) {
      return [this.mapEventToCalendarItem(event)];
    }

    const byDayMatch = event.recurrenceRule.match(/BYDAY=([A-Z,]+)/);
    if (!byDayMatch) {
      return [this.mapEventToCalendarItem(event)];
    }
    const byDayRaw = byDayMatch[1].split(',');

    const dayMap: Record<string, number> = {
      SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6
    };
    const targetDays = new Set<number>(
      byDayRaw.filter((d) => d in dayMap).map((d) => dayMap[d])
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

    const today = new Date();
    const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 365);
    const windowEnd = untilDate && untilDate < maxDate ? untilDate : maxDate;

    const eventStart = new Date(event.startTime);
    const eventEnd = new Date(event.endTime);
    const durationMs = eventEnd.getTime() - eventStart.getTime();

    const items: CalendarItem[] = [];
    const cursor = this.startOfDay(eventStart);

    while (cursor <= windowEnd) {
      if (targetDays.has(cursor.getDay())) {
        const occurrenceStart = new Date(
          cursor.getFullYear(), cursor.getMonth(), cursor.getDate(),
          eventStart.getHours(), eventStart.getMinutes(), eventStart.getSeconds()
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

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
