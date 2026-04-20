import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CreateReminderDto,
  PaginatedResult,
  PaginationParams,
  ReminderDto,
  UpdateReminderDto
} from '../models/planner.models';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/reminders`;

  getReminders(
    eventId?: number,
    params?: PaginationParams
  ): Observable<PaginatedResult<ReminderDto>> {
    let httpParams = new HttpParams();
    if (eventId != null) {
      httpParams = httpParams.set('eventId', eventId.toString());
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
