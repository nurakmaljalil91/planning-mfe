import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BaseResponse,
  CreateEventDto,
  EventDto,
  PaginatedResult,
  PaginationParams,
  UpdateEventDto
} from '../models/planner.models';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/events`;

  getEvents(calendarId?: number, params?: PaginationParams): Observable<PaginatedResult<EventDto>> {
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
      .get<BaseResponse<PaginatedResult<EventDto>>>(this.baseUrl, { params: httpParams })
      .pipe(map((response) => response.data));
  }

  getEventById(id: number): Observable<EventDto> {
    return this.http
      .get<BaseResponse<EventDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  createEvent(dto: CreateEventDto): Observable<EventDto> {
    return this.http
      .post<BaseResponse<EventDto>>(this.baseUrl, dto)
      .pipe(map((response) => response.data));
  }

  updateEvent(id: number, dto: UpdateEventDto): Observable<EventDto> {
    return this.http
      .patch<BaseResponse<EventDto>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map((response) => response.data));
  }

  deleteEvent(id: number): Observable<void> {
    return this.http
      .delete<BaseResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
