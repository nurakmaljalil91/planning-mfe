import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CalendarDto,
  CalendarSubscriptionDto,
  CreateCalendarDto,
  CreatePublicCalendarDto,
  PaginatedResult,
  PaginationParams,
  UpdateCalendarDto
} from '../models/planner.models';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/calendars`;

  getCalendars(params?: PaginationParams): Observable<PaginatedResult<CalendarDto>> {
    const httpParams = this.buildPaginationParams(params);

    return this.http
      .get<BaseResponse<PaginatedResult<CalendarDto>>>(this.baseUrl, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  getCalendarById(id: number): Observable<CalendarDto> {
    return this.http
      .get<BaseResponse<CalendarDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createCalendar(dto: CreateCalendarDto): Observable<CalendarDto> {
    return this.http
      .post<BaseResponse<CalendarDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  updateCalendar(id: number, dto: UpdateCalendarDto): Observable<CalendarDto> {
    return this.http
      .patch<BaseResponse<CalendarDto>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  deleteCalendar(id: number): Observable<void> {
    return this.http
      .delete<BaseResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }

  getPublicCalendars(params?: PaginationParams): Observable<PaginatedResult<CalendarDto>> {
    let httpParams = new HttpParams();
    if (params?.page !== null && params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.total !== null && params?.total !== undefined) {
      httpParams = httpParams.set('total', params.total.toString());
    }
    return this.http
      .get<BaseResponse<PaginatedResult<CalendarDto>>>(`${this.baseUrl}/public`, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  getUserSubscriptions(): Observable<CalendarSubscriptionDto[]> {
    return this.http
      .get<BaseResponse<CalendarSubscriptionDto[]>>(`${this.baseUrl}/subscriptions`)
      .pipe(map((response) => response.data));
  }

  subscribeToCalendar(calendarId: number): Observable<CalendarSubscriptionDto> {
    return this.http
      .post<BaseResponse<CalendarSubscriptionDto>>(`${this.baseUrl}/${calendarId}/subscribe`, {})
      .pipe(map((response) => response.data));
  }

  unsubscribeFromCalendar(calendarId: number): Observable<void> {
    return this.http
      .delete<BaseResponse<void>>(`${this.baseUrl}/${calendarId}/subscribe`)
      .pipe(map(() => undefined));
  }

  toggleCalendarVisibility(calendarId: number): Observable<CalendarDto> {
    return this.http
      .patch<BaseResponse<CalendarDto>>(`${this.baseUrl}/${calendarId}/visibility`, {})
      .pipe(map((response) => response.data));
  }

  toggleSubscriptionVisibility(calendarId: number): Observable<CalendarSubscriptionDto> {
    return this.http
      .patch<BaseResponse<CalendarSubscriptionDto>>(`${this.baseUrl}/subscriptions/${calendarId}/visibility`, {})
      .pipe(map((response) => response.data));
  }

  createPublicCalendar(dto: CreatePublicCalendarDto): Observable<CalendarDto> {
    return this.http
      .post<BaseResponse<CalendarDto>>(`${this.baseUrl}/public`, dto)
      .pipe(map((response) => response.data));
  }

  private buildPaginationParams(params?: PaginationParams): HttpParams {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== null && value !== undefined) {
        httpParams = httpParams.set(key, value.toString());
      }
    }

    return httpParams;
  }
}
