import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { EventDto, PaginatedResult, PlannerTaskDto } from '../../core/models/planner.models';
import { EventService } from '../../core/services/event.service';
import { PlannerTaskService } from '../../core/services/planner-task.service';
import { UpcomingEventsWidgetComponent } from './upcoming-events-widget.component';

// Wednesday 21 Oct 2026, 12:00 local time
const NOW = new Date(2026, 9, 21, 12, 0);
const at = (day: number, hour: number, minute = 0): string => new Date(2026, 9, day, hour, minute).toISOString();

const page = <T>(items: T[]): PaginatedResult<T> => ({
  items,
  pageNumber: 1,
  totalPages: 1,
  totalCount: items.length,
  hasPreviousPage: false,
  hasNextPage: false
});

const makeEvent = (id: number, overrides: Partial<EventDto> = {}): EventDto => ({
  id,
  calendarId: 1,
  title: `Event ${id}`,
  description: null,
  startTime: at(22, 9),
  endTime: at(22, 10),
  location: null,
  isAllDay: false,
  isRecurring: false,
  recurrenceRule: null,
  reminders: [],
  ...overrides
});

const makeTask = (id: number, overrides: Partial<PlannerTaskDto> = {}): PlannerTaskDto => ({
  id,
  calendarId: 1,
  title: `Task ${id}`,
  note: null,
  priority: 0,
  dueDate: at(23, 9),
  reminder: null,
  isCompleted: false,
  ...overrides
});

describe('UpcomingEventsWidgetComponent', () => {
  let eventService: jasmine.SpyObj<EventService>;
  let taskService: jasmine.SpyObj<PlannerTaskService>;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(NOW);

    eventService = jasmine.createSpyObj<EventService>('EventService', ['getEvents']);
    taskService = jasmine.createSpyObj<PlannerTaskService>('PlannerTaskService', ['getTasks']);
    eventService.getEvents.and.returnValue(of(page<EventDto>([])));
    taskService.getTasks.and.returnValue(of(page<PlannerTaskDto>([])));

    TestBed.configureTestingModule({
      imports: [UpcomingEventsWidgetComponent],
      providers: [
        provideRouter([]),
        { provide: EventService, useValue: eventService },
        { provide: PlannerTaskService, useValue: taskService }
      ]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  const render = (
    events: EventDto[] = [],
    tasks: PlannerTaskDto[] = []
  ): ComponentFixture<UpcomingEventsWidgetComponent> => {
    eventService.getEvents.and.returnValue(of(page(events)));
    taskService.getTasks.and.returnValue(of(page(tasks)));
    const fixture = TestBed.createComponent(UpcomingEventsWidgetComponent);
    fixture.detectChanges();
    return fixture;
  };

  const shadowText = (fixture: ComponentFixture<UpcomingEventsWidgetComponent>): string =>
    (fixture.nativeElement as HTMLElement).shadowRoot?.textContent ?? '';

  const titles = (fixture: ComponentFixture<UpcomingEventsWidgetComponent>): string[] =>
    fixture.componentInstance.upcomingItems().map((item) => item.title);

  it('requests events and tasks for the next 30 days', () => {
    render();

    const expected = {
      page: 1,
      total: 100,
      rangeStart: NOW.toISOString(),
      rangeEnd: new Date(2026, 10, 20, 12, 0).toISOString()
    };
    expect(eventService.getEvents).toHaveBeenCalledOnceWith(undefined, expected);
    expect(taskService.getTasks).toHaveBeenCalledOnceWith(undefined, expected);
  });

  it('shows an event in progress and hides one that has ended', () => {
    const fixture = render([
      makeEvent(1, { title: 'In progress', startTime: at(21, 11), endTime: at(21, 13) }),
      makeEvent(2, { title: 'Ended', startTime: at(21, 9), endTime: at(21, 10) })
    ]);

    expect(titles(fixture)).toEqual(['In progress']);
  });

  it('hides an event starting after the 30-day window', () => {
    // Window ends 20 Nov 2026, 12:00
    const fixture = render([
      makeEvent(1, {
        startTime: new Date(2026, 10, 20, 12, 1).toISOString(),
        endTime: new Date(2026, 10, 20, 13, 0).toISOString()
      })
    ]);

    expect(titles(fixture)).toEqual([]);
  });

  it('shows the next occurrence of a weekly series that started in the past', () => {
    // Mondays at 09:00 since 6 Jul 2026; next occurrence is Monday 26 Oct
    const fixture = render([
      makeEvent(1, {
        title: 'Standup',
        startTime: new Date(2026, 6, 6, 9, 0).toISOString(),
        endTime: new Date(2026, 6, 6, 9, 30).toISOString(),
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO'
      })
    ]);

    const [first] = fixture.componentInstance.upcomingItems();
    expect(first.date).toEqual(new Date(2026, 9, 26, 9, 0));
  });

  it('hides a recurring series that ended before now', () => {
    const fixture = render([
      makeEvent(1, {
        startTime: new Date(2026, 6, 6, 9, 0).toISOString(),
        endTime: new Date(2026, 6, 6, 9, 30).toISOString(),
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260801T000000Z'
      })
    ]);

    expect(titles(fixture)).toEqual([]);
  });

  it('shows incomplete tasks due in the window and hides completed or reminder-only tasks', () => {
    const fixture = render([], [
      makeTask(1, { title: 'Due soon' }),
      makeTask(2, { title: 'Done', isCompleted: true }),
      makeTask(3, { title: 'Reminder only', dueDate: null, reminder: at(22, 9) }),
      makeTask(4, { title: 'Due later', dueDate: new Date(2026, 11, 25).toISOString(), reminder: at(22, 9) }),
      makeTask(5, { title: 'Overdue', dueDate: at(20, 9) })
    ]);

    expect(titles(fixture)).toEqual(['Due soon']);
    expect(fixture.componentInstance.upcomingItems()[0].date).toEqual(new Date(2026, 9, 23, 9, 0));
  });

  it('merges, orders ascending, and shows at most 5 items with distinct rows per occurrence', () => {
    const fixture = render(
      [
        makeEvent(1, {
          title: 'Standup',
          startTime: new Date(2026, 6, 6, 9, 0).toISOString(),
          endTime: new Date(2026, 6, 6, 9, 30).toISOString(),
          isRecurring: true,
          recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TH'
        }),
        makeEvent(2, { title: 'Review', startTime: at(22, 14), endTime: at(22, 15) })
      ],
      [makeTask(3, { title: 'Report', dueDate: at(27, 17) })]
    );

    const items = fixture.componentInstance.upcomingItems();
    expect(items.map((item) => item.date)).toEqual([
      new Date(2026, 9, 22, 9, 0),
      new Date(2026, 9, 22, 14, 0),
      new Date(2026, 9, 26, 9, 0),
      new Date(2026, 9, 27, 17, 0),
      new Date(2026, 9, 29, 9, 0)
    ]);
    expect(new Set(items.map((item) => item.key)).size).toBe(5);
    expect((fixture.nativeElement as HTMLElement).shadowRoot?.querySelectorAll('li').length).toBe(5);
  });

  it('shows the 30-day empty state when nothing qualifies', () => {
    const fixture = render();

    expect(shadowText(fixture)).toContain('Nothing in the next 30 days.');
  });

  it('shows an error instead of the empty state when loading fails', () => {
    eventService.getEvents.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(UpcomingEventsWidgetComponent);
    fixture.detectChanges();

    expect(shadowText(fixture)).toContain('Failed to load upcoming items.');
    expect(shadowText(fixture)).not.toContain('Nothing in the next');
  });
});
