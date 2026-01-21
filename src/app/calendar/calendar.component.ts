import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CxsButtonComponent } from 'cerxos-ui';

import { CalendarItem, CalendarItemType, createMockCalendarItems } from './calendar.mock';

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
  imports: [CommonModule, FormsModule, CxsButtonComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent {
  viewMode: CalendarView = 'month';
  currentDate = this.startOfDay(new Date());
  selectedDate = this.startOfDay(new Date());
  items: CalendarItem[] = createMockCalendarItems(this.currentDate);
  isComposerOpen = false;
  draft: DraftItem = this.buildDraft(this.selectedDate);

  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly hours = Array.from({ length: 13 }, (_, index) => index + 7);

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

    this.items = [
      ...this.items,
      {
        id: `custom-${Date.now()}`,
        title: this.draft.title.trim(),
        type: this.draft.type,
        start,
        end: this.draft.type === 'event' ? end : undefined
      }
    ];

    this.isComposerOpen = false;
  }

  openItem(event: MouseEvent): void {
    event.stopPropagation();
  }

  itemsForDate(date: Date): CalendarItem[] {
    return this.items.filter((item) => this.isSameDay(item.start, date));
  }

  itemsForHour(date: Date, hour: number): CalendarItem[] {
    return this.items.filter(
      (item) => this.isSameDay(item.start, date) && item.start.getHours() === hour
    );
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

  trackByDate(_index: number, day: CalendarDay): number {
    return day.date.getTime();
  }

  trackByItem(_index: number, item: CalendarItem): string {
    return item.id;
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
