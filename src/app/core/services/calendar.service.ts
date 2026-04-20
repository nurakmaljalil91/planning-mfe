import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CalendarDto,
  CalendarSubscriptionDto,
  CreateCalendarDto,
  PaginatedResult,
  PaginationParams,
  UpdateCalendarDto
} from '../models/planner.models';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/calendars`;

  getCalendars(params?: PaginationParams): Observable<PaginatedResult<CalendarDto>> {
    let httpParams = new HttpParams();
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
    if (params?.page != null) httpParams = httpParams.set('page', params.page.toString());
    if (params?.total != null) httpParams = httpParams.set('total', params.total.toString());
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

  createPublicCalendar(dto: CreateCalendarDto): Observable<CalendarDto> {
    return this.http
      .post<BaseResponse<CalendarDto>>(`${this.baseUrl}/public`, dto)
      .pipe(map((response) => response.data));
  }
}
