import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CxsButtonComponent } from 'cerxos-ui';

import { CalendarDto, CreatePublicCalendarDto } from '../core/models/planner.models';
import { CalendarService } from '../core/services/calendar.service';

const DEFAULT_TIME_ZONE = 'Asia/Kuala_Lumpur';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CxsButtonComponent],
  selector: 'app-manage-calendar-page',
  styleUrl: './manage-calendar-page.css',
  templateUrl: './manage-calendar-page.html',
})
export class ManageCalendarPage implements OnInit {
  private readonly calendarService = inject(CalendarService);

  readonly calendars = signal<CalendarDto[]>([]);
  readonly error = signal<string | null>(null);
  readonly isCreating = signal(false);
  readonly isLoading = signal(false);
  readonly successMessage = signal<string | null>(null);

  readonly draft = signal<CreatePublicCalendarDto>({
    description: 'Official Malaysia public holidays and observances.',
    timeZone: DEFAULT_TIME_ZONE,
    title: 'Malaysia Holidays',
  });

  readonly publicCalendarCount = computed(() => this.calendars().length);

  ngOnInit(): void {
    this.loadPublicCalendars();
  }

  updateDraft<K extends keyof CreatePublicCalendarDto>(
    key: K,
    value: CreatePublicCalendarDto[K],
  ): void {
    this.draft.update((draft) => ({
      ...draft,
      [key]: value,
    }));
  }

  createCalendar(): void {
    const draft = this.normalizeDraft();
    if (!draft.title) {
      this.error.set('Calendar name is required.');
      return;
    }

    this.isCreating.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    this.calendarService
      .createPublicCalendar(draft)
      .pipe(finalize(() => this.isCreating.set(false)))
      .subscribe({
        next: (calendar) => {
          this.calendars.update((calendars) => [calendar, ...calendars]);
          this.successMessage.set(`${calendar.title} is available for users to subscribe.`);
          this.draft.set({
            description: null,
            timeZone: DEFAULT_TIME_ZONE,
            title: '',
          });
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to create calendar.');
        },
      });
  }

  useMalaysiaHolidayTemplate(): void {
    this.draft.set({
      description: 'Official Malaysia public holidays and observances.',
      timeZone: DEFAULT_TIME_ZONE,
      title: 'Malaysia Holidays',
    });
  }

  trackByCalendarId(_index: number, calendar: CalendarDto): number {
    return calendar.id;
  }

  private loadPublicCalendars(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.calendarService
      .getPublicCalendars({ page: 1, total: 50 })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.calendars.set(result.items);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to load public calendars.');
        },
      });
  }

  private normalizeDraft(): CreatePublicCalendarDto {
    const draft = this.draft();
    return {
      description: draft.description?.trim() || null,
      timeZone: draft.timeZone?.trim() || DEFAULT_TIME_ZONE,
      title: draft.title.trim(),
    };
  }
}
