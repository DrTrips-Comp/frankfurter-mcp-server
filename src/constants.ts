/**
 * Constants used throughout the Currency MCP Server
 */

// Frankfurter API configuration
export const API_BASE_URL = "https://api.frankfurter.dev/v1";

// Character limit for responses (to prevent overwhelming LLM context)
export const CHARACTER_LIMIT = 25000;

// API timeout configuration (in milliseconds)
export const API_TIMEOUT = 10000;

// Response format options
export enum ResponseFormat {
  JSON = "json",
  MARKDOWN = "markdown",
}

// Server metadata
export const SERVER_NAME = "frankfurter-mcp-server";
export const SERVER_VERSION = "1.0.0";
