import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CxsCardComponent } from 'cerxos-ui';

import { EventService } from '../../core/services/event.service';
import { PlannerTaskService } from '../../core/services/planner-task.service';
import { EventDto, PlannerTaskDto } from '../../core/models/planner.models';

interface UpcomingItem {
  type: 'event' | 'task';
  id: number;
  title: string;
  date: Date;
}

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

  ngOnInit(): void {
    const now = new Date();

    forkJoin({
      events: this.eventService.getEvents(undefined, { sortBy: 'startTime', descending: false, total: 10 }),
      tasks: this.taskService.getTasks(undefined, { sortBy: 'dueDate', descending: false, total: 10 }),
    }).subscribe({
      next: ({ events, tasks }) => {
        const eventItems: UpcomingItem[] = (events.items ?? [])
          .filter((e: EventDto) => new Date(e.startTime) >= now)
          .map((e: EventDto) => ({ type: 'event' as const, id: e.id, title: e.title, date: new Date(e.startTime) }));

        const taskItems: UpcomingItem[] = (tasks.items ?? [])
          .filter((t: PlannerTaskDto) => !t.isCompleted && t.dueDate != null && new Date(t.dueDate) >= now)
          .map((t: PlannerTaskDto) => ({ type: 'task' as const, id: t.id, title: t.title, date: new Date(t.dueDate!) }));

        const combined = [...eventItems, ...taskItems]
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 5);

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
}
