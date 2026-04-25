import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CxsButtonComponent } from 'cerxos-ui';

import { CalendarDto, CalendarSubscriptionDto } from '../../core/models/planner.models';

const COLOR_PALETTE = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

/// Sidebar showing own calendars, subscriptions, and public calendar discovery.
@Component({
  selector: 'app-calendar-sidebar',
  imports: [CommonModule, FormsModule, CxsButtonComponent],
  templateUrl: './calendar-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarSidebarComponent {
  @Input() ownCalendars: CalendarDto[] = [];
  @Input() subscriptions: CalendarSubscriptionDto[] = [];
  @Input() publicCalendars: CalendarDto[] = [];

  @Output() visibilityToggled = new EventEmitter<{ type: 'own' | 'subscription'; calendarId: number }>();
  @Output() calendarCreated = new EventEmitter<string>();
  @Output() calendarColorChanged = new EventEmitter<{ calendarId: number; color: string }>();
  @Output() subscribed = new EventEmitter<number>();
  @Output() unsubscribed = new EventEmitter<number>();

  readonly isAddingCalendar = signal(false);
  readonly newCalendarTitle = signal('');
  readonly isDiscoverOpen = signal(false);

  dotColor(cal: CalendarDto, index: number): string {
    return cal.color ?? COLOR_PALETTE[index % COLOR_PALETTE.length];
  }

  changeColor(calendarId: number, color: string): void {
    this.calendarColorChanged.emit({ calendarId, color });
  }

  get unsubscribedPublicCalendars(): CalendarDto[] {
    const subscribedIds = new Set(this.subscriptions.map((s) => s.calendarId));
    return this.publicCalendars.filter((c) => !subscribedIds.has(c.id));
  }

  toggleDiscover(): void {
    this.isDiscoverOpen.update((v) => !v);
  }

  startAddCalendar(): void {
    this.newCalendarTitle.set('');
    this.isAddingCalendar.set(true);
  }

  commitNewCalendar(): void {
    const title = this.newCalendarTitle().trim();
    if (title) {
      this.calendarCreated.emit(title);
    }
    this.isAddingCalendar.set(false);
    this.newCalendarTitle.set('');
  }

  cancelNewCalendar(): void {
    this.isAddingCalendar.set(false);
    this.newCalendarTitle.set('');
  }

  onNewCalendarKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.commitNewCalendar();
    } else if (event.key === 'Escape') {
      this.cancelNewCalendar();
    }
  }

  toggleOwnVisibility(calendarId: number): void {
    this.visibilityToggled.emit({ type: 'own', calendarId });
  }

  toggleSubVisibility(calendarId: number): void {
    this.visibilityToggled.emit({ type: 'subscription', calendarId });
  }

  subscribe(calendarId: number): void {
    this.subscribed.emit(calendarId);
  }

  unsubscribe(calendarId: number): void {
    this.unsubscribed.emit(calendarId);
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  trackByCalendarId(_index: number, sub: CalendarSubscriptionDto): number {
    return sub.calendarId;
  }
}
