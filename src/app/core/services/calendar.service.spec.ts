import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { BaseResponse, CalendarDto, CalendarSubscriptionDto, PaginatedResult } from '../models/planner.models';
import { CalendarService } from './calendar.service';

const BASE_URL = `${environment.apiBaseUrl}/api/calendars`;

const mockCalendar: CalendarDto = {
  id: 1,
  title: 'My Calendar',
  description: null,
  timeZone: 'UTC',
  isPrimary: true,
  isPublic: false,
  isVisible: true,
  isGoogleCalendar: false,
  userId: 'user-1',
  color: null,
  events: [],
  tasks: []
};

const mockSubscription: CalendarSubscriptionDto = {
  id: 10,
  userId: 'user-1',
  calendarId: 5,
  isVisible: true,
  calendar: null
};

const makePaginatedResponse = <T>(items: T[]): BaseResponse<PaginatedResult<T>> => ({
  success: true,
  message: null,
  errors: null,
  data: {
    items,
    pageNumber: 1,
    totalPages: 1,
    totalCount: items.length,
    hasPreviousPage: false,
    hasNextPage: false
  }
});

const makeSingleResponse = <T>(data: T): BaseResponse<T> => ({
  success: true,
  message: null,
  errors: null,
  data
});

describe('CalendarService', () => {
  let service: CalendarService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CalendarService]
    });

    service = TestBed.inject(CalendarService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  describe('getCalendars', () => {
    it('should GET /api/calendars and return paginated result', () => {
      let result: PaginatedResult<CalendarDto> | undefined;

      service.getCalendars().subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      expect(req.request.method).toBe('GET');
      req.flush(makePaginatedResponse([mockCalendar]));

      expect(result?.items.length).toBe(1);
      expect(result?.items[0].title).toBe('My Calendar');
    });

    it('should include pagination query params when provided', () => {
      service.getCalendars({ page: 2, total: 10, filter: 'work' }).subscribe();

      const req = httpController.expectOne(
        (r) => r.url === BASE_URL && r.params.get('page') === '2' && r.params.get('filter') === 'work'
      );
      expect(req.request.params.get('total')).toBe('10');
      req.flush(makePaginatedResponse([]));
    });
  });

  describe('getCalendarById', () => {
    it('should GET /api/calendars/{id} and return the calendar', () => {
      let result: CalendarDto | undefined;

      service.getCalendarById(1).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(makeSingleResponse(mockCalendar));

      expect(result?.id).toBe(1);
    });
  });

  describe('createCalendar', () => {
    it('should POST /api/calendars and return the created calendar', () => {
      let result: CalendarDto | undefined;

      service.createCalendar({ title: 'Work' }).subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ title: 'Work' });
      req.flush(makeSingleResponse({ ...mockCalendar, title: 'Work' }));

      expect(result?.title).toBe('Work');
    });
  });

  describe('updateCalendar', () => {
    it('should PATCH /api/calendars/{id} and return the updated calendar', () => {
      let result: CalendarDto | undefined;

      service.updateCalendar(1, { title: 'Updated' }).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Updated' });
      req.flush(makeSingleResponse({ ...mockCalendar, title: 'Updated' }));

      expect(result?.title).toBe('Updated');
    });
  });

  describe('deleteCalendar', () => {
    it('should DELETE /api/calendars/{id}', () => {
      let completed = false;

      service.deleteCalendar(1).subscribe({ complete: () => (completed = true) });

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(makeSingleResponse(null));

      expect(completed).toBe(true);
    });
  });

  describe('getPublicCalendars', () => {
    it('should GET /api/calendars/public and return paginated result', () => {
      let result: PaginatedResult<CalendarDto> | undefined;

      service.getPublicCalendars({ page: 1, total: 50 }).subscribe((r) => (result = r));

      const req = httpController.expectOne(
        (r) => r.url === `${BASE_URL}/public` && r.params.get('page') === '1'
      );
      expect(req.request.method).toBe('GET');
      req.flush(makePaginatedResponse([{ ...mockCalendar, isPublic: true }]));

      expect(result?.items[0].isPublic).toBe(true);
    });
  });

  describe('getUserSubscriptions', () => {
    it('should GET /api/calendars/subscriptions and return array', () => {
      let result: CalendarSubscriptionDto[] | undefined;

      service.getUserSubscriptions().subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/subscriptions`);
      expect(req.request.method).toBe('GET');
      req.flush(makeSingleResponse([mockSubscription]));

      expect(result?.length).toBe(1);
      expect(result?.[0].calendarId).toBe(5);
    });
  });

  describe('subscribeToCalendar', () => {
    it('should POST /api/calendars/{id}/subscribe and return subscription', () => {
      let result: CalendarSubscriptionDto | undefined;

      service.subscribeToCalendar(5).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/5/subscribe`);
      expect(req.request.method).toBe('POST');
      req.flush(makeSingleResponse(mockSubscription));

      expect(result?.calendarId).toBe(5);
    });
  });

  describe('unsubscribeFromCalendar', () => {
    it('should DELETE /api/calendars/{id}/subscribe', () => {
      let completed = false;

      service.unsubscribeFromCalendar(5).subscribe({ complete: () => (completed = true) });

      const req = httpController.expectOne(`${BASE_URL}/5/subscribe`);
      expect(req.request.method).toBe('DELETE');
      req.flush(makeSingleResponse(null));

      expect(completed).toBe(true);
    });
  });

  describe('toggleCalendarVisibility', () => {
    it('should PATCH /api/calendars/{id}/visibility and return updated calendar', () => {
      let result: CalendarDto | undefined;

      service.toggleCalendarVisibility(1).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1/visibility`);
      expect(req.request.method).toBe('PATCH');
      req.flush(makeSingleResponse({ ...mockCalendar, isVisible: false }));

      expect(result?.isVisible).toBe(false);
    });
  });

  describe('toggleSubscriptionVisibility', () => {
    it('should PATCH /api/calendars/subscriptions/{id}/visibility and return updated subscription', () => {
      let result: CalendarSubscriptionDto | undefined;

      service.toggleSubscriptionVisibility(5).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/subscriptions/5/visibility`);
      expect(req.request.method).toBe('PATCH');
      req.flush(makeSingleResponse({ ...mockSubscription, isVisible: false }));

      expect(result?.isVisible).toBe(false);
    });
  });

  describe('createPublicCalendar', () => {
    it('should POST /api/calendars/public and return the created public calendar', () => {
      let result: CalendarDto | undefined;
      const dto = {
        description: 'Official Malaysia public holidays and observances.',
        timeZone: 'Asia/Kuala_Lumpur',
        title: 'Malaysia Holidays'
      };

      service.createPublicCalendar(dto).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/public`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(makeSingleResponse({ ...mockCalendar, ...dto, isPublic: true }));

      expect(result?.title).toBe('Malaysia Holidays');
      expect(result?.isPublic).toBe(true);
    });
  });
});
