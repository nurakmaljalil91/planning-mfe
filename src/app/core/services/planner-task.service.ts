import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CreatePlannerTaskDto,
  PaginatedResult,
  PaginationParams,
  PlannerTaskDto,
  UpdatePlannerTaskDto
} from '../models/planner.models';

@Injectable({ providedIn: 'root' })
export class PlannerTaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/plannertasks`;

  getTasks(
    calendarId?: number,
    params?: PaginationParams
  ): Observable<PaginatedResult<PlannerTaskDto>> {
    let httpParams = new HttpParams();
    if (calendarId != null) {
      httpParams = httpParams.set('calendarId', calendarId.toString());
    }
    if (params?.page != null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.total != null) {
      httpParams = httpParams.set('total', params.total.toString());
    }
    if (params?.sortBy != null) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params?.descending != null) {
      httpParams = httpParams.set('descending', params.descending.toString());
    }
    if (params?.filter != null) {
      httpParams = httpParams.set('filter', params.filter);
    }

    return this.http
      .get<BaseResponse<PaginatedResult<PlannerTaskDto>>>(this.baseUrl, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  createTask(dto: CreatePlannerTaskDto): Observable<PlannerTaskDto> {
    return this.http
      .post<BaseResponse<PlannerTaskDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  updateTask(id: number, dto: UpdatePlannerTaskDto): Observable<PlannerTaskDto> {
    return this.http
      .patch<BaseResponse<PlannerTaskDto>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  deleteTask(id: number): Observable<void> {
    return this.http
      .delete<BaseResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }

  completeTask(id: number): Observable<PlannerTaskDto> {
    return this.http
      .patch<BaseResponse<PlannerTaskDto>>(`${this.baseUrl}/${id}/complete`, {})
      .pipe(map((response) => response.data));
  }
}
