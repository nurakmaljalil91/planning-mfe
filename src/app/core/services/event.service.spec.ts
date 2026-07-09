import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { BaseResponse, EventDto, PaginatedResult } from '../models/planner.models';
import { EventService } from './event.service';

const BASE_URL = `${environment.apiBaseUrl}/api/events`;

const mockEvent: EventDto = {
  id: 1,
  calendarId: 1,
  title: 'Sprint Planning',
  description: null,
  startTime: '2026-04-20T10:00:00Z',
  endTime: '2026-04-20T11:00:00Z',
  location: 'Room A',
  isAllDay: false,
  isRecurring: false,
  recurrenceRule: null,
  reminders: []
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

describe('EventService', () => {
  let service: EventService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EventService]
    });

    service = TestBed.inject(EventService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  describe('getEvents', () => {
    it('should GET /api/events and return paginated result', () => {
      let result: PaginatedResult<EventDto> | undefined;

      service.getEvents().subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      expect(req.request.method).toBe('GET');
      req.flush(makePaginatedResponse([mockEvent]));

      expect(result?.items.length).toBe(1);
      expect(result?.items[0].title).toBe('Sprint Planning');
    });

    it('should include calendarId query param when provided', () => {
      service.getEvents(5).subscribe();

      const req = httpController.expectOne(
        (r) => r.url === BASE_URL && r.params.get('calendarId') === '5'
      );
      req.flush(makePaginatedResponse([]));
    });

    it('should include pagination params when provided', () => {
      service.getEvents(undefined, { page: 1, total: 50 }).subscribe();

      const req = httpController.expectOne(
        (r) => r.url === BASE_URL && r.params.get('page') === '1' && r.params.get('total') === '50'
      );
      req.flush(makePaginatedResponse([]));
    });

    it('should include visible range params when provided', () => {
      service.getEvents(undefined, {
        rangeStart: '2026-07-01T00:00:00.000Z',
        rangeEnd: '2026-08-01T00:00:00.000Z'
      }).subscribe();

      const req = httpController.expectOne(
        (r) =>
          r.url === BASE_URL &&
          r.params.get('rangeStart') === '2026-07-01T00:00:00.000Z' &&
          r.params.get('rangeEnd') === '2026-08-01T00:00:00.000Z'
      );
      req.flush(makePaginatedResponse([]));
    });

    it('should include both calendarId and pagination params', () => {
      service.getEvents(3, { page: 2, total: 20 }).subscribe();

      const req = httpController.expectOne(
        (r) =>
          r.url === BASE_URL &&
          r.params.get('calendarId') === '3' &&
          r.params.get('page') === '2'
      );
      req.flush(makePaginatedResponse([]));
    });
  });

  describe('getEventById', () => {
    it('should GET /api/events/{id} and return the event', () => {
      let result: EventDto | undefined;

      service.getEventById(1).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(makeSingleResponse(mockEvent));

      expect(result?.id).toBe(1);
      expect(result?.location).toBe('Room A');
    });
  });

  describe('createEvent', () => {
    it('should POST /api/events and return created event', () => {
      let result: EventDto | undefined;
      const dto = {
        calendarId: 1,
        title: 'New Event',
        startTime: '2026-04-20T09:00:00Z',
        endTime: '2026-04-20T10:00:00Z'
      };

      service.createEvent(dto).subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(makeSingleResponse({ ...mockEvent, title: 'New Event' }));

      expect(result?.title).toBe('New Event');
    });
  });

  describe('updateEvent', () => {
    it('should PATCH /api/events/{id} and return updated event', () => {
      let result: EventDto | undefined;

      service.updateEvent(1, { title: 'Updated' }).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Updated' });
      req.flush(makeSingleResponse({ ...mockEvent, title: 'Updated' }));

      expect(result?.title).toBe('Updated');
    });
  });

  describe('deleteEvent', () => {
    it('should DELETE /api/events/{id}', () => {
      let completed = false;

      service.deleteEvent(1).subscribe({ complete: () => (completed = true) });

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(makeSingleResponse(null));

      expect(completed).toBe(true);
    });
  });
});
