import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import {
  CalendarDto,
  CalendarSubscriptionDto,
  EventDto,
  PaginatedResult,
  PlannerTaskDto,
  ReminderDto
} from '../core/models/planner.models';
import { CalendarService } from '../core/services/calendar.service';
import { EventService } from '../core/services/event.service';
import { PlannerTaskService } from '../core/services/planner-task.service';
import { ReminderService } from '../core/services/reminder.service';
import { CalendarComponent } from './calendar.component';

const makeCalendar = (overrides: Partial<CalendarDto> = {}): CalendarDto => ({
  id: 1,
  title: 'My Calendar',
  description: null,
  timeZone: null,
  isPrimary: true,
  isPublic: false,
  isVisible: true,
  isGoogleCalendar: false,
  userId: 'user-1',
  color: null,
  events: [],
  tasks: [],
  ...overrides
});

const makeEvent = (overrides: Partial<EventDto> = {}): EventDto => ({
  id: 1,
  calendarId: 1,
  title: 'Event',
  description: null,
  startTime: '2026-07-06T09:00:00.000Z',
  endTime: '2026-07-06T10:00:00.000Z',
  location: null,
  isAllDay: false,
  isRecurring: false,
  recurrenceRule: null,
  reminders: [],
  ...overrides
});

const makePaginatedResult = <T>(items: T[]): PaginatedResult<T> => ({
  items,
  pageNumber: 1,
  totalPages: 1,
  totalCount: items.length,
  hasPreviousPage: false,
  hasNextPage: false
});

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;
  let component: CalendarComponent;
  let calendarService: jasmine.SpyObj<CalendarService>;
  let eventService: jasmine.SpyObj<EventService>;
  let taskService: jasmine.SpyObj<PlannerTaskService>;
  let reminderService: jasmine.SpyObj<ReminderService>;

  beforeEach(async () => {
    calendarService = jasmine.createSpyObj<CalendarService>('CalendarService', [
      'getCalendars',
      'getUserSubscriptions',
      'getPublicCalendars',
      'createCalendar',
      'toggleCalendarVisibility',
      'toggleSubscriptionVisibility',
      'updateCalendar',
      'subscribeToCalendar',
      'unsubscribeFromCalendar'
    ]);
    eventService = jasmine.createSpyObj<EventService>('EventService', [
      'getEvents',
      'updateEvent',
      'deleteEvent'
    ]);
    taskService = jasmine.createSpyObj<PlannerTaskService>('PlannerTaskService', ['getTasks']);
    reminderService = jasmine.createSpyObj<ReminderService>('ReminderService', ['getReminders']);

    calendarService.getCalendars.and.returnValue(of(makePaginatedResult([makeCalendar()])));
    calendarService.getUserSubscriptions.and.returnValue(of([] as CalendarSubscriptionDto[]));
    calendarService.getPublicCalendars.and.returnValue(of(makePaginatedResult([])));
    eventService.getEvents.and.returnValue(of(makePaginatedResult([] as EventDto[])));
    taskService.getTasks.and.returnValue(of(makePaginatedResult([] as PlannerTaskDto[])));
    reminderService.getReminders.and.returnValue(of(makePaginatedResult([] as ReminderDto[])));

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        { provide: CalendarService, useValue: calendarService },
        { provide: EventService, useValue: eventService },
        { provide: PlannerTaskService, useValue: taskService },
        { provide: ReminderService, useValue: reminderService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
  });

  it('should request the rendered month grid range when loading calendar items', () => {
    component.currentDate = new Date(2026, 6, 15);

    fixture.detectChanges();

    expect(eventService.getEvents).toHaveBeenCalled();
    expect(taskService.getTasks).toHaveBeenCalled();

    const eventParams = eventService.getEvents.calls.mostRecent().args[1];
    const taskParams = taskService.getTasks.calls.mostRecent().args[1];
    expect(eventParams).toEqual(jasmine.objectContaining({
      page: 1,
      total: 500,
      rangeStart: new Date(2026, 5, 28).toISOString(),
      rangeEnd: new Date(2026, 7, 9).toISOString()
    }));
    expect(taskParams).toEqual(jasmine.objectContaining({
      rangeStart: new Date(2026, 5, 28).toISOString(),
      rangeEnd: new Date(2026, 7, 9).toISOString()
    }));
  });

  it('should reload calendar items when navigating to the next month', () => {
    component.currentDate = new Date(2026, 6, 15);
    fixture.detectChanges();
    eventService.getEvents.calls.reset();

    component.next();

    expect(eventService.getEvents).toHaveBeenCalledTimes(1);
    const eventParams = eventService.getEvents.calls.mostRecent().args[1];
    expect(eventParams).toEqual(jasmine.objectContaining({
      rangeStart: new Date(2026, 6, 26).toISOString(),
      rangeEnd: new Date(2026, 8, 6).toISOString()
    }));
  });

  it('should expand recurring events only within the visible range', () => {
    component.currentDate = new Date(2026, 6, 15);
    eventService.getEvents.and.returnValue(of(makePaginatedResult([
      makeEvent({
        id: 20,
        title: 'Weekly Sync',
        startTime: '2026-01-05T09:00:00.000Z',
        endTime: '2026-01-05T10:00:00.000Z',
        isRecurring: true,
        recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000Z'
      })
    ])));

    fixture.detectChanges();

    const visibleStart = new Date(2026, 5, 28);
    const visibleEnd = new Date(2026, 7, 9);
    const items = component.items();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.start >= visibleStart && item.start < visibleEnd)).toBeTrue();
    expect(items.every((item) => item.title === 'Weekly Sync')).toBeTrue();
  });

  it('loads a persisted reminder with its parent calendar and hides it with that calendar', () => {
    component.currentDate = new Date(2026, 6, 15);
    calendarService.getCalendars.and.returnValue(of(makePaginatedResult([
      makeCalendar(), makeCalendar({ id: 2, title: 'Work', isPrimary: false })
    ])));
    eventService.getEvents.and.returnValue(of(makePaginatedResult([
      makeEvent({ id: 23, calendarId: 2, startTime: '2026-07-15T12:00:00.000Z' })
    ])));
    reminderService.getReminders.and.returnValue(of(makePaginatedResult([{
      id: 45,
      eventId: 23,
      title: 'Prepare notes',
      reminderDateTime: '2026-07-15T11:00:00.000Z',
      isSent: false
    }])));

    fixture.detectChanges();

    const reminder = component.items().find((item) => item.id === 'reminder-45');
    expect(reminder?.calendarId).toBe(2);
    expect(component.itemsForDate(new Date(2026, 6, 15)).some((item) => item.id === 'reminder-45')).toBeTrue();

    component.ownCalendars.update((calendars) => calendars.map((calendar) =>
      calendar.id === 2 ? { ...calendar, isVisible: false } : calendar
    ));
    expect(component.itemsForDate(new Date(2026, 6, 15)).some((item) => item.id === 'reminder-45')).toBeFalse();
  });
  describe('Sunday week start', () => {
    const sameDay = (actual: Date, expected: Date): void => {
      expect(actual.toDateString()).toBe(expected.toDateString());
    };

    it('starts the July 2026 month grid on Sunday 28 June and ends it on Saturday 8 August', () => {
      component.currentDate = new Date(2026, 6, 15);

      const days = component.monthDays;

      expect(days.length).toBe(42);
      sameDay(days[0].date, new Date(2026, 5, 28));
      expect(days[0].date.getDay()).toBe(0);
      sameDay(days[41].date, new Date(2026, 7, 8));
      expect(days[41].date.getDay()).toBe(6);
    });

    it('starts the November 2026 month grid on Sunday 1 November', () => {
      component.currentDate = new Date(2026, 10, 20);

      sameDay(component.monthDays[0].date, new Date(2026, 10, 1));
    });

    it('renders month view weekday headers from Sun to Sat', () => {
      component.currentDate = new Date(2026, 6, 15);
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.grid-cols-7') as HTMLElement;
      const labels = Array.from(header.children).map((el) => el.textContent?.trim());

      expect(labels).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    });

    for (const [label, current] of [
      ['Wednesday', new Date(2026, 10, 11)],
      ['Sunday', new Date(2026, 10, 8)],
      ['Saturday', new Date(2026, 10, 14)]
    ] as const) {
      it(`shows Sunday 8 to Saturday 14 November 2026 in week view when the current date is a ${label}`, () => {
        component.currentDate = current;
        component.setView('week');

        const days = component.weekDaysWithItems;
        expect(days.length).toBe(7);
        sameDay(days[0].date, new Date(2026, 10, 8));
        sameDay(days[6].date, new Date(2026, 10, 14));
        expect(component.viewLabel).toBe('Nov 8 - Nov 14');

        const eventParams = eventService.getEvents.calls.mostRecent().args[1];
        expect(eventParams).toEqual(jasmine.objectContaining({
          rangeStart: new Date(2026, 10, 8).toISOString(),
          rangeEnd: new Date(2026, 10, 15).toISOString()
        }));
      });
    }
  });
});
