import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CalendarDto, PaginatedResult } from '../core/models/planner.models';
import { CalendarService } from '../core/services/calendar.service';
import { ManageCalendarPage } from './manage-calendar-page';

const calendar: CalendarDto = {
  color: '#3b82f6',
  description: 'Official Malaysia public holidays and observances.',
  events: [],
  id: 1,
  isGoogleCalendar: false,
  isPrimary: false,
  isPublic: true,
  isVisible: true,
  tasks: [],
  timeZone: 'Asia/Kuala_Lumpur',
  title: 'Malaysia Holidays',
  userId: 'admin-1',
};

const makePaginatedResult = (items: CalendarDto[]): PaginatedResult<CalendarDto> => ({
  hasNextPage: false,
  hasPreviousPage: false,
  items,
  pageNumber: 1,
  totalCount: items.length,
  totalPages: 1,
});

describe('ManageCalendarPage', () => {
  let component: ManageCalendarPage;
  let fixture: ComponentFixture<ManageCalendarPage>;
  let calendarServiceSpy: jasmine.SpyObj<
    Pick<CalendarService, 'createPublicCalendar' | 'getPublicCalendars'>
  >;

  beforeEach(async () => {
    calendarServiceSpy = jasmine.createSpyObj('CalendarService', [
      'createPublicCalendar',
      'getPublicCalendars',
    ]);
    calendarServiceSpy.getPublicCalendars.and.returnValue(of(makePaginatedResult([calendar])));
    calendarServiceSpy.createPublicCalendar.and.returnValue(of(calendar));

    await TestBed.configureTestingModule({
      imports: [ManageCalendarPage],
      providers: [{ provide: CalendarService, useValue: calendarServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageCalendarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load public calendars', () => {
    expect(calendarServiceSpy.getPublicCalendars).toHaveBeenCalledWith({ page: 1, total: 50 });
    expect(component.calendars()).toEqual([calendar]);
    expect(component.publicCalendarCount()).toBe(1);
  });

  it('should create a public calendar', () => {
    component.draft.set({
      description: ' Official Malaysia public holidays and observances. ',
      timeZone: ' Asia/Kuala_Lumpur ',
      title: ' Malaysia Holidays ',
    });

    component.createCalendar();

    expect(calendarServiceSpy.createPublicCalendar).toHaveBeenCalledWith({
      description: 'Official Malaysia public holidays and observances.',
      timeZone: 'Asia/Kuala_Lumpur',
      title: 'Malaysia Holidays',
    });
    expect(component.successMessage()).toBe('Malaysia Holidays is available for users to subscribe.');
  });

  it('should require a calendar name', () => {
    component.draft.set({
      description: null,
      timeZone: 'Asia/Kuala_Lumpur',
      title: '   ',
    });

    component.createCalendar();

    expect(calendarServiceSpy.createPublicCalendar).not.toHaveBeenCalled();
    expect(component.error()).toBe('Calendar name is required.');
  });

  it('should show create errors', () => {
    calendarServiceSpy.createPublicCalendar.and.returnValue(
      throwError(() => ({ error: { message: 'Only admins can create public calendars.' } })),
    );

    component.createCalendar();

    expect(component.error()).toBe('Only admins can create public calendars.');
  });
});
