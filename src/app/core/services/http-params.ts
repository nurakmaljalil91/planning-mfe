import { HttpParams } from '@angular/common/http';

type QueryValue = string | number | boolean | null | undefined;

/**
 * Builds HttpParams from a record, skipping null and undefined values.
 */
export function toHttpParams(values: Record<string, QueryValue>): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined) {
      httpParams = httpParams.set(key, value.toString());
    }
  }
  return httpParams;
}
