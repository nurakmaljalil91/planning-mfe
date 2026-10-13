import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CreateReminderDto,
  PaginatedResult,
  PaginationParams,
  ReminderDto,
  UpdateReminderDto
} from '../models/planner.models';
import { toHttpParams } from './http-params';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/reminders`;

  getReminders(
    eventId?: number,
    params?: PaginationParams
  ): Observable<PaginatedResult<ReminderDto>> {
    const httpParams = toHttpParams({
      eventId,
      page: params?.page,
      total: params?.total,
      sortBy: params?.sortBy,
      descending: params?.descending,
      filter: params?.filter,
    });

    return this.http
      .get<BaseResponse<PaginatedResult<ReminderDto>>>(this.baseUrl, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  createReminder(dto: CreateReminderDto): Observable<ReminderDto> {
    return this.http
      .post<BaseResponse<ReminderDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  updateReminder(id: number, dto: UpdateReminderDto): Observable<ReminderDto> {
    return this.http
      .patch<BaseResponse<ReminderDto>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  deleteReminder(id: number): Observable<void> {
    return this.http
      .delete<BaseResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
