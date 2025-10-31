/**
 * Frankfurter API Client
 * Handles HTTP requests to the Frankfurter API with proper error handling and timeouts
 */

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { API_BASE_URL, API_TIMEOUT } from "../constants.js";

/**
 * Make a request to the Frankfurter API
 * @param endpoint - The API endpoint (relative to base URL)
 * @param params - Query parameters
 * @returns Parsed JSON response
 */
export async function makeApiRequest<T>(
  endpoint: string,
  params?: Record<string, string | string[]>
): Promise<T> {
  // Convert array parameters to comma-separated strings for the API
  const processedParams: Record<string, string> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      processedParams[key] = Array.isArray(value) ? value.join(",") : value;
    }
  }

  const config: AxiosRequestConfig = {
    timeout: API_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    params: processedParams,
  };

  try {
    const response = await axios.get<T>(`${API_BASE_URL}${endpoint}`, config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw handleApiError(error);
    }
    throw error;
  }
}

/**
 * Handle API errors and convert them to meaningful error messages
 * @param error - Axios error object
 * @returns Error with meaningful message
 */
function handleApiError(error: AxiosError): Error {
  if (error.code === "ECONNABORTED") {
    return new Error(
      "Request timeout: The Frankfurter API did not respond within 10 seconds. Please try again."
    );
  }

  if (error.response) {
    const status = error.response.status;

    switch (status) {
      case 404:
        return new Error(
          "The requested resource was not found. Please check your date range and currency codes."
        );
      case 429:
        return new Error(
          "Rate limit exceeded. Please wait a moment before making more requests."
        );
      case 500:
      case 502:
      case 503:
        return new Error(
          "The Frankfurter API is currently experiencing issues. Please try again later."
        );
      default:
        return new Error(
          `API request failed with status ${status}: ${error.response.statusText}`
        );
    }
  }

  if (error.request) {
    return new Error(
      "Unable to connect to the Frankfurter API. Please check your internet connection."
    );
  }

  return new Error(`An unexpected error occurred: ${error.message}`);
}
