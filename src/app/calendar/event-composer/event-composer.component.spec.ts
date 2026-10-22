import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { of, throwError } from 'rxjs';

import { EventService } from '../../core/services/event.service';
import { PlannerTaskService } from '../../core/services/planner-task.service';
import { ReminderService } from '../../core/services/reminder.service';
import { EventDto } from '../../core/models/planner.models';
import { EventComposerComponent } from './event-composer.component';

const event: EventDto = {
  id: 12,
  calendarId: 2,
  title: 'Planning meeting',
  description: null,
  startTime: '2026-07-15T12:00:00.000Z',
  endTime: '2026-07-15T13:00:00.000Z',
  location: null,
  isAllDay: false,
  isRecurring: false,
  recurrenceRule: null,
  reminders: []
};

describe('EventComposerComponent reminders', () => {
  let fixture: ComponentFixture<EventComposerComponent>;
  let component: EventComposerComponent;
  let reminderService: jasmine.SpyObj<ReminderService>;

  beforeEach(async () => {
    reminderService = jasmine.createSpyObj<ReminderService>('ReminderService', ['createReminder']);
    await TestBed.configureTestingModule({
      imports: [EventComposerComponent],
      providers: [
        { provide: EventService, useValue: jasmine.createSpyObj('EventService', ['createEvent']) },
        { provide: PlannerTaskService, useValue: jasmine.createSpyObj('PlannerTaskService', ['createTask']) },
        { provide: ReminderService, useValue: reminderService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(EventComposerComponent);
    component = fixture.componentInstance;
    component.primaryCalendarId = 2;
    component.selectedDate = new Date(2026, 6, 15);
    component.events = [event];
    component.ngOnChanges({ open: new SimpleChange(false, true, false) });
    component.draft.type = 'reminder';
    component.draft.title = 'Prepare notes';
    component.draft.startTime = '11:00';
  });

  it('saves an event-linked reminder and emits the persisted item', () => {
    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
    component.setReminderEvent(12);
    reminderService.createReminder.and.returnValue(of({
      id: 45,
      eventId: 12,
      title: 'Prepare notes',
      reminderDateTime: '2026-07-15T11:00:00.000Z',
      isSent: false
    }));

    component.save();

    expect(reminderService.createReminder).toHaveBeenCalledWith(jasmine.objectContaining({
      eventId: 12,
      title: 'Prepare notes'
    }));
    expect(saved).toHaveBeenCalledWith([jasmine.objectContaining({
      id: 'reminder-45',
      calendarId: 2
    })]);
  });

  it('does not save without a selected event', () => {
    component.save();
    expect(reminderService.createReminder).not.toHaveBeenCalled();
    expect(component.error()).toContain('Choose an event');
  });

  it('keeps the dialog open and reports a failed save', () => {
    const saved = jasmine.createSpy('saved');
    const openChange = jasmine.createSpy('openChange');
    component.saved.subscribe(saved);
    component.openChange.subscribe(openChange);
    component.setReminderEvent(12);
    reminderService.createReminder.and.returnValue(throwError(() => new Error('Server unavailable')));

    component.save();

    expect(component.error()).toBe('Server unavailable');
    expect(saved).not.toHaveBeenCalled();
    expect(openChange).not.toHaveBeenCalled();
  });
});

describe('EventComposerComponent events', () => {
  let component: EventComposerComponent;
  let eventService: jasmine.SpyObj<EventService>;
  let saved: jasmine.Spy;

  const created = (overrides: Partial<EventDto> = {}): EventDto => ({
    ...event,
    id: 30,
    // Monday 6 Jul 2026, 09:00-09:45 local time
    startTime: new Date(2026, 6, 6, 9, 0).toISOString(),
    endTime: new Date(2026, 6, 6, 9, 45).toISOString(),
    ...overrides
  });

  const saveReturning = (dto: EventDto): void => {
    eventService.createEvent.and.returnValue(of(dto));
    component.save();
  };

  beforeEach(async () => {
    eventService = jasmine.createSpyObj<EventService>('EventService', ['createEvent']);
    await TestBed.configureTestingModule({
      imports: [EventComposerComponent],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: PlannerTaskService, useValue: jasmine.createSpyObj('PlannerTaskService', ['createTask']) },
        { provide: ReminderService, useValue: jasmine.createSpyObj('ReminderService', ['createReminder']) }
      ]
    }).compileComponents();
    component = TestBed.createComponent(EventComposerComponent).componentInstance;
    component.primaryCalendarId = 2;
    component.selectedDate = new Date(2026, 6, 6);
    component.ngOnChanges({ open: new SimpleChange(false, true, false) });
    component.draft.type = 'event';
    component.draft.title = 'Standup';
    saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);
  });

  it('emits a single item for a non-recurring event', () => {
    const dto = created();

    saveReturning(dto);

    expect(saved).toHaveBeenCalledOnceWith([jasmine.objectContaining({
      id: 'event-30',
      type: 'event',
      start: new Date(dto.startTime),
      end: new Date(dto.endTime)
    })]);
  });

  it('emits one item per weekly occurrence until UNTIL', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 6, 1, 12, 0));
    try {
      saveReturning(created({ isRecurring: true, recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20260718T000000Z' }));
    } finally {
      jasmine.clock().uninstall();
    }

    const starts = [
      new Date(2026, 6, 6, 9, 0),
      new Date(2026, 6, 8, 9, 0),
      new Date(2026, 6, 13, 9, 0),
      new Date(2026, 6, 15, 9, 0)
    ];
    expect(saved).toHaveBeenCalledOnceWith(starts.map((start) => jasmine.objectContaining({
      id: `event-30-${start.toISOString()}`,
      type: 'event',
      start,
      end: new Date(start.getTime() + 45 * 60 * 1000)
    })));
  });

  it('falls back to a single item for a weekly rule without BYDAY', () => {
    saveReturning(created({ isRecurring: true, recurrenceRule: 'FREQ=WEEKLY' }));

    expect(saved).toHaveBeenCalledOnceWith([jasmine.objectContaining({ id: 'event-30' })]);
  });
});
