import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import {
  CalendarDto,
  CalendarSubscriptionDto,
  EventDto,
  PaginatedResult,
  PlannerTaskDto
} from '../core/models/planner.models';
import { CalendarService } from '../core/services/calendar.service';
import { EventService } from '../core/services/event.service';
import { PlannerTaskService } from '../core/services/planner-task.service';
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

    calendarService.getCalendars.and.returnValue(of(makePaginatedResult([makeCalendar()])));
    calendarService.getUserSubscriptions.and.returnValue(of([] as CalendarSubscriptionDto[]));
    calendarService.getPublicCalendars.and.returnValue(of(makePaginatedResult([])));
    eventService.getEvents.and.returnValue(of(makePaginatedResult([] as EventDto[])));
    taskService.getTasks.and.returnValue(of(makePaginatedResult([] as PlannerTaskDto[])));

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        { provide: CalendarService, useValue: calendarService },
        { provide: EventService, useValue: eventService },
        { provide: PlannerTaskService, useValue: taskService }
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
      rangeStart: new Date(2026, 5, 29).toISOString(),
      rangeEnd: new Date(2026, 7, 10).toISOString()
    }));
    expect(taskParams).toEqual(jasmine.objectContaining({
      rangeStart: new Date(2026, 5, 29).toISOString(),
      rangeEnd: new Date(2026, 7, 10).toISOString()
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
      rangeStart: new Date(2026, 6, 27).toISOString(),
      rangeEnd: new Date(2026, 8, 7).toISOString()
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

    const visibleStart = new Date(2026, 5, 29);
    const visibleEnd = new Date(2026, 7, 10);
    const items = component.items();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.start >= visibleStart && item.start < visibleEnd)).toBeTrue();
    expect(items.every((item) => item.title === 'Weekly Sync')).toBeTrue();
  });
});
