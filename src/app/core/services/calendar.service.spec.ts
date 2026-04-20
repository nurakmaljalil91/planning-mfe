import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { CalendarDto, BaseResponse, PaginatedResult } from '../models/planner.models';
import { CalendarService } from './calendar.service';

const BASE_URL = `${environment.apiBaseUrl}/api/calendars`;

const mockCalendar: CalendarDto = {
  id: 1,
  title: 'My Calendar',
  description: null,
  timeZone: 'UTC',
  isPrimary: true,
  isGoogleCalendar: false,
  userId: 'user-1',
  events: [],
  tasks: []
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
});
