import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { BaseResponse, PaginatedResult, PlannerTaskDto } from '../models/planner.models';
import { PlannerTaskService } from './planner-task.service';

const BASE_URL = `${environment.apiBaseUrl}/api/plannertasks`;

const mockTask: PlannerTaskDto = {
  id: 1,
  calendarId: 1,
  title: 'Finalize roadmap',
  note: 'Check with PM',
  priority: 2,
  dueDate: '2026-04-25T17:00:00Z',
  reminder: null,
  isCompleted: false
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

describe('PlannerTaskService', () => {
  let service: PlannerTaskService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PlannerTaskService]
    });

    service = TestBed.inject(PlannerTaskService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  describe('getTasks', () => {
    it('should GET /api/plannertasks and return paginated result', () => {
      let result: PaginatedResult<PlannerTaskDto> | undefined;

      service.getTasks().subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      expect(req.request.method).toBe('GET');
      req.flush(makePaginatedResponse([mockTask]));

      expect(result?.items.length).toBe(1);
      expect(result?.items[0].title).toBe('Finalize roadmap');
    });

    it('should include calendarId query param when provided', () => {
      service.getTasks(7).subscribe();

      const req = httpController.expectOne(
        (r) => r.url === BASE_URL && r.params.get('calendarId') === '7'
      );
      req.flush(makePaginatedResponse([]));
    });

    it('should include pagination params when provided', () => {
      service.getTasks(undefined, { page: 3, total: 25, descending: true }).subscribe();

      const req = httpController.expectOne(
        (r) =>
          r.url === BASE_URL &&
          r.params.get('page') === '3' &&
          r.params.get('descending') === 'true'
      );
      req.flush(makePaginatedResponse([]));
    });

    it('should return empty items when no tasks exist', () => {
      let result: PaginatedResult<PlannerTaskDto> | undefined;

      service.getTasks().subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      req.flush(makePaginatedResponse([]));

      expect(result?.items).toEqual([]);
      expect(result?.totalCount).toBe(0);
    });
  });

  describe('createTask', () => {
    it('should POST /api/plannertasks and return created task', () => {
      let result: PlannerTaskDto | undefined;
      const dto = { calendarId: 1, title: 'New Task', priority: 1 as const };

      service.createTask(dto).subscribe((r) => (result = r));

      const req = httpController.expectOne(BASE_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(makeSingleResponse({ ...mockTask, title: 'New Task' }));

      expect(result?.title).toBe('New Task');
    });
  });

  describe('updateTask', () => {
    it('should PATCH /api/plannertasks/{id} and return updated task', () => {
      let result: PlannerTaskDto | undefined;

      service.updateTask(1, { title: 'Updated Task' }).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ title: 'Updated Task' });
      req.flush(makeSingleResponse({ ...mockTask, title: 'Updated Task' }));

      expect(result?.title).toBe('Updated Task');
    });
  });

  describe('deleteTask', () => {
    it('should DELETE /api/plannertasks/{id}', () => {
      let completed = false;

      service.deleteTask(1).subscribe({ complete: () => (completed = true) });

      const req = httpController.expectOne(`${BASE_URL}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(makeSingleResponse(null));

      expect(completed).toBe(true);
    });
  });

  describe('completeTask', () => {
    it('should PATCH /api/plannertasks/{id}/complete and return updated task', () => {
      let result: PlannerTaskDto | undefined;

      service.completeTask(1).subscribe((r) => (result = r));

      const req = httpController.expectOne(`${BASE_URL}/1/complete`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(makeSingleResponse({ ...mockTask, isCompleted: true }));

      expect(result?.isCompleted).toBe(true);
    });
  });
});
