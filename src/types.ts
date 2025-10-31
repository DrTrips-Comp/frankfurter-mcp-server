/**
 * Type definitions for Frankfurter API responses
 */

// Base response from Frankfurter API
export interface FrankfurterBaseResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

// Time series response
export interface FrankfurterTimeSeriesResponse {
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

// Currencies list response
export interface FrankfurterCurrenciesResponse {
  [currencyCode: string]: string;
}

// Pagination metadata
export interface PaginationMeta {
  has_more: boolean;
  next_start_date?: string;
  showing_days: number;
  total_days?: number;
}

// Truncation metadata
export interface TruncationMeta {
  truncated: boolean;
  truncation_message?: string;
  original_length?: number;
}
