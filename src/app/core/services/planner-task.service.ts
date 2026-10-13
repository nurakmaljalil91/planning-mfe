import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CreatePlannerTaskDto,
  PaginatedResult,
  PaginationParams,
  PlannerTaskDto,
  UpdatePlannerTaskDto
} from '../models/planner.models';
import { toHttpParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class PlannerTaskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/plannertasks`;

  getTasks(
    calendarId?: number,
    params?: PaginationParams
  ): Observable<PaginatedResult<PlannerTaskDto>> {
    const httpParams = toHttpParams({ calendarId, ...params });

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
