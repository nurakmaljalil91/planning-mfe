import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import {
  CalendarSubscriptionDto,
  EventDto,
  PlannerTaskDto,
  ReminderDto
} from '../core/models/planner.models';
import { CalendarService } from '../core/services/calendar.service';
import { EventService } from '../core/services/event.service';
import { PlannerTaskService } from '../core/services/planner-task.service';
import { ReminderService } from '../core/services/reminder.service';
import { CalendarComponent } from './calendar.component';
import {
  makeCalendar,
  makeEvent,
  makePaginatedResult,
  makeReminder,
  makeTask
} from './testing/calendar-fixtures';

describe('CalendarComponent item dialog editing', () => {
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
    taskService = jasmine.createSpyObj<PlannerTaskService>('PlannerTaskService', [
      'getTasks',
      'updateTask',
      'deleteTask'
    ]);
    reminderService = jasmine.createSpyObj<ReminderService>('ReminderService', [
      'getReminders',
      'updateReminder',
      'deleteReminder'
    ]);

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

  describe('editing items from the item dialog', () => {
    const click = (): Event => new MouseEvent('click');

    const openById = (id: string): void => {
      const item = component.items().find((candidate) => candidate.id === id);
      if (!item) {
        throw new Error(`Calendar item ${id} not loaded`);
      }
      component.openItem(click(), item);
    };

    const render = (): void => {
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    };

    beforeEach(() => {
      component.currentDate = new Date(2026, 6, 15);
      calendarService.getCalendars.and.returnValue(of(makePaginatedResult([
        makeCalendar(), makeCalendar({ id: 2, title: 'Work', isPrimary: false })
      ])));
      eventService.getEvents.and.returnValue(of(makePaginatedResult([
        makeEvent({ id: 1 }),
        makeEvent({ id: 12, title: 'Other event' }),
        makeEvent({
          id: 23,
          calendarId: 2,
          startTime: '2026-07-15T12:00:00.000Z',
          endTime: '2026-07-15T13:00:00.000Z'
        })
      ])));
      taskService.getTasks.and.returnValue(of(makePaginatedResult([
        makeTask({ id: 1, title: 'Pay bill' }),
        makeTask({ id: 12, title: 'Other task' }),
        makeTask({ id: 30, title: 'Undated task', dueDate: null, reminder: '2026-07-16T08:00:00.000Z' })
      ])));
      reminderService.getReminders.and.returnValue(of(makePaginatedResult([makeReminder()])));
      fixture.detectChanges();
    });

    describe('events', () => {
      it('still saves an event edit through the event service', () => {
        eventService.updateEvent.and.returnValue(of(makeEvent({ id: 1, title: 'Renamed event' })));
        openById('event-1');
        component.editDraft!.title = 'Renamed event';

        component.saveEdit();

        expect(eventService.updateEvent)
          .toHaveBeenCalledWith(1, jasmine.objectContaining({ title: 'Renamed event' }));
        expect(component.items().find((item) => item.id === 'event-1')?.title).toBe('Renamed event');
        expect(component.isItemDetailOpen).toBeFalse();
      });

      it('still deletes an event without removing events that share a numeric prefix', () => {
        eventService.deleteEvent.and.returnValue(of(undefined));
        openById('event-1');

        component.deleteItem();

        expect(eventService.deleteEvent).toHaveBeenCalledWith(1);
        const ids = component.items().map((item) => item.id);
        expect(ids).not.toContain('event-1');
        expect(ids).toContain('event-12');
      });
    });

    describe('tasks', () => {
      it('saves an edited title and due date and updates the calendar item', () => {
        const due = new Date(2026, 6, 20, 14, 30);
        taskService.updateTask.and.returnValue(of(makeTask({
          id: 1,
          title: 'Pay water bill',
          dueDate: due.toISOString()
        })));
        openById('task-1');
        component.editDraft!.title = '  Pay water bill  ';
        component.editDraft!.startDate = '2026-07-20';
        component.editDraft!.startTime = '14:30';

        component.saveEdit();

        expect(taskService.updateTask).toHaveBeenCalledWith(1, { title: 'Pay water bill', dueDate: due.toISOString() });
        const updated = component.items().find((item) => item.id === 'task-1');
        expect(updated?.title).toBe('Pay water bill');
        expect(updated?.start.getTime()).toBe(due.getTime());
        expect(component.isItemDetailOpen).toBeFalse();
        expect(component.error()).toBeNull();
      });

      it('keeps the dialog open with the edits and shows an error when the save is rejected', () => {
        taskService.updateTask.and.returnValue(throwError(() => new Error('Forbidden')));
        openById('task-1');
        component.editDraft!.title = 'Pay water bill';

        component.saveEdit();

        expect(component.isItemDetailOpen).toBeTrue();
        expect(component.error()).toBe('Forbidden');
        expect(component.editDraft?.title).toBe('Pay water bill');
        expect(component.items().find((item) => item.id === 'task-1')?.title).toBe('Pay bill');
        expect(component.isLoading()).toBeFalse();
      });

      it('does not send a request when the title is empty', () => {
        openById('task-1');
        component.editDraft!.title = '   ';

        component.saveEdit();

        expect(taskService.updateTask).not.toHaveBeenCalled();
        expect(component.error()).toBe('Title is required');
        expect(component.isItemDetailOpen).toBeTrue();
      });

      it('does not send a request when the date is missing', () => {
        openById('task-1');
        component.editDraft!.startDate = '';

        component.saveEdit();

        expect(taskService.updateTask).not.toHaveBeenCalled();
        expect(component.error()).toBe('Date is required');
      });

      it('saves the displayed reminder time as the due date for a task without a due date', () => {
        taskService.updateTask.and.callFake((id) => of(makeTask({
          id,
          title: 'Undated task',
          dueDate: '2026-07-16T08:00:00.000Z'
        })));
        openById('task-30');

        component.saveEdit();

        expect(taskService.updateTask).toHaveBeenCalledWith(30, {
          title: 'Undated task',
          dueDate: new Date('2026-07-16T08:00:00.000Z').toISOString()
        });
      });

      it('deletes only the opened task', () => {
        taskService.deleteTask.and.returnValue(of(undefined));
        openById('task-1');

        component.deleteItem();

        expect(taskService.deleteTask).toHaveBeenCalledWith(1);
        const ids = component.items().map((item) => item.id);
        expect(ids).not.toContain('task-1');
        expect(ids).toContain('task-12');
        expect(component.isItemDetailOpen).toBeFalse();
      });

      it('keeps the task and the dialog when the delete is rejected', () => {
        taskService.deleteTask.and.returnValue(throwError(() => new Error('Forbidden')));
        openById('task-1');

        component.deleteItem();

        expect(component.isItemDetailOpen).toBeTrue();
        expect(component.error()).toBe('Forbidden');
        expect(component.items().some((item) => item.id === 'task-1')).toBeTrue();
      });
    });

    describe('reminders', () => {
      it('saves an edited title and time and keeps the parent calendar', () => {
        const remindAt = new Date(2026, 6, 15, 10, 15);
        reminderService.updateReminder.and.returnValue(of(makeReminder({
          title: 'Print notes',
          reminderDateTime: remindAt.toISOString()
        })));
        openById('reminder-45');
        component.editDraft!.title = 'Print notes';
        component.editDraft!.startDate = '2026-07-15';
        component.editDraft!.startTime = '10:15';

        component.saveEdit();

        expect(reminderService.updateReminder).toHaveBeenCalledWith(45, {
          title: 'Print notes',
          reminderDateTime: remindAt.toISOString()
        });
        const updated = component.items().find((item) => item.id === 'reminder-45');
        expect(updated?.title).toBe('Print notes');
        expect(updated?.calendarId).toBe(2);
        expect(updated?.start.getTime()).toBe(remindAt.getTime());
        expect(component.isItemDetailOpen).toBeFalse();
      });

      it('keeps the dialog open and the reminder unchanged when the save is rejected', () => {
        reminderService.updateReminder.and.returnValue(throwError(() => new Error('Not found')));
        openById('reminder-45');
        component.editDraft!.title = 'Print notes';

        component.saveEdit();

        expect(component.isItemDetailOpen).toBeTrue();
        expect(component.error()).toBe('Not found');
        expect(component.items().find((item) => item.id === 'reminder-45')?.title).toBe('Prepare notes');
      });

      it('deletes the opened reminder', () => {
        reminderService.deleteReminder.and.returnValue(of(undefined));
        openById('reminder-45');

        component.deleteItem();

        expect(reminderService.deleteReminder).toHaveBeenCalledWith(45);
        expect(component.items().some((item) => item.id === 'reminder-45')).toBeFalse();
        expect(component.isItemDetailOpen).toBeFalse();
      });

      it('keeps the reminder and the dialog when the delete is rejected', () => {
        reminderService.deleteReminder.and.returnValue(throwError(() => new Error('Forbidden')));
        openById('reminder-45');

        component.deleteItem();

        expect(component.isItemDetailOpen).toBeTrue();
        expect(component.error()).toBe('Forbidden');
        expect(component.items().some((item) => item.id === 'reminder-45')).toBeTrue();
      });
    });

    it('reports an error instead of closing silently for an unrecognised item', () => {
      component.openItem(click(), {
        id: 'unknown-1',
        title: 'Mystery',
        type: 'event',
        start: new Date(2026, 6, 15)
      });

      component.deleteItem();

      expect(component.isItemDetailOpen).toBeTrue();
      expect(component.error()).toBe('This item cannot be deleted from the calendar');
    });

    describe('dialog template', () => {
      const dialogButtonLabels = (): string[] =>
        Array.from(fixture.nativeElement.querySelectorAll('cxs-dialog cxs-button') as NodeListOf<HTMLElement>)
          .map((button) => button.textContent?.trim() ?? '');

      it('renders Save and due date/time inputs for a task', () => {
        openById('task-1');
        render();

        expect(dialogButtonLabels()).toContain('Save');
        expect(fixture.nativeElement.querySelector('input[aria-label="Due date"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('input[aria-label="Due time"]')).not.toBeNull();
      });

      it('renders Save and reminder date/time inputs for a reminder', () => {
        openById('reminder-45');
        render();

        expect(dialogButtonLabels()).toContain('Save');
        expect(fixture.nativeElement.querySelector('input[aria-label="Reminder date"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('input[aria-label="Reminder time"]')).not.toBeNull();
      });
    });
  });
});
