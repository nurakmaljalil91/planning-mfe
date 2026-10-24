import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CxsCardComponent } from 'cerxos-ui';

import { EventService } from '../../core/services/event.service';
import { PlannerTaskService } from '../../core/services/planner-task.service';
import { EventDto, PlannerTaskDto } from '../../core/models/planner.models';
import { expandWeeklyOccurrences } from '../../core/utils/recurrence';

export const UPCOMING_WINDOW_DAYS = 30;
const MAX_ITEMS = 5;
// A 30-day window rarely holds more; recurring series count once here and expand client-side.
const PAGE_SIZE = 100;

type UpcomingItem = {
  key: string;
  type: 'event' | 'task';
  id: number;
  title: string;
  date: Date;
  end?: Date;
  relativeLabel: string;
}

type UpcomingItemCandidate = Omit<UpcomingItem, 'relativeLabel'>;

@Component({
  selector: 'app-upcoming-events-widget',
  standalone: true,
  imports: [RouterLink, CxsCardComponent],
  templateUrl: './upcoming-events-widget.component.html',
  // Shadow DOM isolates the widget from the host shell's stylesheet, so it needs its
  // own copy of the global Tailwind build alongside its component-specific overrides.
  // Without this, embedding the widget in the shell (or any other host) pollutes the
  // host's cascade layers and can silently break unrelated host styles.
  styleUrls: ['../../../styles.css', './upcoming-events-widget.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingEventsWidgetComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly taskService = inject(PlannerTaskService);

  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly upcomingItems = signal<UpcomingItem[]>([]);
  readonly emptyText = `Nothing in the next ${UPCOMING_WINDOW_DAYS} days.`;

  ngOnInit(): void {
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + UPCOMING_WINDOW_DAYS);
    const rangeParams = {
      page: 1,
      total: PAGE_SIZE,
      rangeStart: now.toISOString(),
      rangeEnd: windowEnd.toISOString(),
    };

    forkJoin({
      events: this.eventService.getEvents(undefined, rangeParams),
      tasks: this.taskService.getTasks(undefined, rangeParams),
    }).subscribe({
      next: ({ events, tasks }) => {
        const eventItems = (events.items ?? []).flatMap((e) => this.toEventItems(e, now, windowEnd));

        const taskItems: UpcomingItemCandidate[] = (tasks.items ?? [])
          .filter((t: PlannerTaskDto) => !t.isCompleted && this.isDueInWindow(t.dueDate, now, windowEnd))
          .map((t: PlannerTaskDto) => {
            const date = new Date(t.dueDate!);
            return { key: `task-${t.id}`, type: 'task' as const, id: t.id, title: t.title, date };
          });

        const combined = [...eventItems, ...taskItems]
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, MAX_ITEMS)
          .map((item) => ({ ...item, relativeLabel: this.relativeLabel(item, now) }));

        this.upcomingItems.set(combined);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load upcoming items.');
        this.isLoading.set(false);
      },
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  }

  private toEventItems(event: EventDto, now: Date, windowEnd: Date): UpcomingItemCandidate[] {
    const occurrences = expandWeeklyOccurrences(event, { start: now, end: windowEnd })
      ?? [{ start: new Date(event.startTime), end: new Date(event.endTime) }];

    return occurrences
      .filter(({ start, end }) => end >= now && start < windowEnd)
      .map(({ start, end }) => ({
        key: `event-${event.id}-${start.toISOString()}`,
        type: 'event' as const,
        id: event.id,
        title: event.title,
        date: start,
        end,
      }));
  }

  private relativeLabel(item: UpcomingItemCandidate, now: Date): string {
    if (item.type === 'event' && item.end && item.date <= now && item.end >= now) {
      return 'Ongoing';
    }

    const localDay = (date: Date): number =>
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
    const daysAway = localDay(item.date) - localDay(now);

    if (daysAway <= 0) {
      return 'Today';
    }
    if (daysAway === 1) {
      return 'Tomorrow';
    }
    return `In ${daysAway} days`;
  }

  private isDueInWindow(dueDate: string | null, now: Date, windowEnd: Date): boolean {
    if (!dueDate) {
      return false;
    }
    const due = new Date(dueDate);
    return due >= now && due < windowEnd;
  }
}
