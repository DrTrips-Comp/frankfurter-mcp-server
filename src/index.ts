#!/usr/bin/env node

/**
 * Frankfurter MCP Server
 * Provides currency exchange tools using the Frankfurter API
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { ResponseFormat, SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { makeApiRequest } from "./services/frankfurter-client.js";
import {
  formatAsJSON,
  formatRatesAsMarkdown,
  formatConversionAsMarkdown,
  formatTimeSeriesAsMarkdown,
  formatCurrenciesAsMarkdown,
  formatResponse,
} from "./services/formatter.js";
import type {
  FrankfurterBaseResponse,
  FrankfurterTimeSeriesResponse,
  FrankfurterCurrenciesResponse,
} from "./types.js";

// Zod Schemas for Tool Inputs

const ConvertCurrencySchema = z
  .object({
    from: z.string().length(3, "Currency code must be 3 characters"),
    to: z.string().length(3, "Currency code must be 3 characters"),
    amount: z.number().positive("Amount must be positive"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .optional(),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
  })
  .strict();

const GetLatestRatesSchema = z
  .object({
    base: z
      .string()
      .length(3, "Currency code must be 3 characters")
      .optional(),
    symbols: z.array(z.string().length(3)).optional(),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
  })
  .strict();

const GetHistoricalRatesSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    base: z
      .string()
      .length(3, "Currency code must be 3 characters")
      .optional(),
    symbols: z.array(z.string().length(3)).optional(),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
  })
  .strict();

const GetTimeSeriesSchema = z
  .object({
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
    base: z
      .string()
      .length(3, "Currency code must be 3 characters")
      .optional(),
    symbols: z.array(z.string().length(3)).optional(),
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
  })
  .strict();

const ListCurrenciesSchema = z
  .object({
    response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
  })
  .strict();

// Initialize MCP Server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool 1: Convert Currency
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "frankfurter_convert_currency",
        description:
          "Convert an amount from one currency to another using real exchange rates. " +
          "Supports both current (latest) and historical conversions. " +
          "Example: Convert 100 EUR to USD, or convert using historical rates from a specific date. " +
          "Returns the converted amount, exchange rate, and date of conversion. " +
          "Note: All dates are in UTC. Historical data available from 1999-01-04 onwards.",
        inputSchema: {
          type: "object",
          properties: {
            from: {
              type: "string",
              description: "Source currency code (3-letter ISO code, e.g., EUR, USD, GBP)",
            },
            to: {
              type: "string",
              description: "Target currency code (3-letter ISO code, e.g., EUR, USD, GBP)",
            },
            amount: {
              type: "number",
              description: "Amount to convert (must be positive)",
            },
            date: {
              type: "string",
              description:
                "Optional: Date for historical conversion (YYYY-MM-DD format). " +
                "If omitted, uses latest available rates.",
            },
            response_format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Response format: 'json' for structured data, 'markdown' for human-readable",
              default: "markdown",
            },
          },
          required: ["from", "to", "amount"],
        },
      },
      {
        name: "frankfurter_get_latest_rates",
        description:
          "Get the latest exchange rates for a base currency. " +
          "Returns current exchange rates (updated daily at 4 PM CET). " +
          "You can specify a base currency (defaults to EUR) and filter specific target currencies. " +
          "Example: Get latest EUR rates, or get USD rates for specific currencies like GBP and JPY. " +
          "Note: Rates are updated once per day by the European Central Bank.",
        inputSchema: {
          type: "object",
          properties: {
            base: {
              type: "string",
              description:
                "Optional: Base currency code (3-letter ISO code). Defaults to EUR.",
            },
            symbols: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional: Array of target currency codes to filter results. " +
                "If omitted, returns rates for all available currencies.",
            },
            response_format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Response format: 'json' for structured data, 'markdown' for human-readable",
              default: "markdown",
            },
          },
        },
      },
      {
        name: "frankfurter_get_historical_rates",
        description:
          "Get exchange rates for a specific historical date. " +
          "Returns rates from any date starting from 1999-01-04. " +
          "You can specify a base currency and filter specific target currencies. " +
          "Example: Get EUR rates for 2020-01-15, or get USD rates against GBP for a specific date. " +
          "Note: If the specified date is a weekend or holiday, the API returns rates from the nearest business day. " +
          "All dates are in UTC.",
        inputSchema: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Historical date in YYYY-MM-DD format (must be >= 1999-01-04)",
            },
            base: {
              type: "string",
              description:
                "Optional: Base currency code (3-letter ISO code). Defaults to EUR.",
            },
            symbols: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional: Array of target currency codes to filter results.",
            },
            response_format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Response format: 'json' for structured data, 'markdown' for human-readable",
              default: "markdown",
            },
          },
          required: ["date"],
        },
      },
      {
        name: "frankfurter_get_time_series",
        description:
          "Get exchange rate time series data over a date range. " +
          "Returns daily exchange rates between two dates for trend analysis and charting. " +
          "You can specify a base currency and filter specific target currencies. " +
          "Example: Get EUR/USD rates for January 2024, or compare EUR against multiple currencies over a month. " +
          "Note: Large date ranges may be truncated. For best results, query smaller ranges (e.g., 1-3 months). " +
          "All dates are in UTC. Data available from 1999-01-04 onwards.",
        inputSchema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format (must be >= 1999-01-04)",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format (must be after start_date)",
            },
            base: {
              type: "string",
              description:
                "Optional: Base currency code (3-letter ISO code). Defaults to EUR.",
            },
            symbols: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional: Array of target currency codes to filter results. " +
                "Recommended to limit to 2-5 currencies for readability.",
            },
            response_format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Response format: 'json' for structured data, 'markdown' for human-readable",
              default: "markdown",
            },
          },
          required: ["start_date", "end_date"],
        },
      },
      {
        name: "frankfurter_list_currencies",
        description:
          "List all available currencies supported by the Frankfurter API. " +
          "Returns currency codes (e.g., USD, EUR, GBP) and their full names. " +
          "Use this to discover valid currency codes for other tools. " +
          "Example: See all supported currencies before making a conversion. " +
          "The list includes major currencies and many minor ones (30+ currencies total).",
        inputSchema: {
          type: "object",
          properties: {
            response_format: {
              type: "string",
              enum: ["json", "markdown"],
              description: "Response format: 'json' for structured data, 'markdown' for human-readable",
              default: "markdown",
            },
          },
        },
      },
    ],
  };
});

// Tool Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "frankfurter_convert_currency": {
        const validated = ConvertCurrencySchema.parse(args);
        const { from, to, amount, date, response_format } = validated;

        // Build endpoint and params
        const endpoint = date ? `/${date}` : "/latest";
        const params: Record<string, string> = {
          from: from.toUpperCase(),
          to: to.toUpperCase(),
        };

        // Make API request
        const data = await makeApiRequest<FrankfurterBaseResponse>(endpoint, params);

        // Calculate conversion
        const rate = data.rates[to.toUpperCase()];
        const result = amount * rate;

        // Format response
        let content: string;
        if (response_format === ResponseFormat.JSON) {
          content = formatAsJSON({
            from: from.toUpperCase(),
            to: to.toUpperCase(),
            amount,
            rate,
            result,
            date: data.date,
          });
        } else {
          content = formatConversionAsMarkdown(
            from.toUpperCase(),
            to.toUpperCase(),
            amount,
            rate,
            result,
            data.date
          );
        }

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "frankfurter_get_latest_rates": {
        const validated = GetLatestRatesSchema.parse(args);
        const { base, symbols, response_format } = validated;

        // Build params
        const params: Record<string, string | string[]> = {};
        if (base) params.base = base.toUpperCase();
        if (symbols) params.symbols = symbols.map((s) => s.toUpperCase());

        // Make API request
        const data = await makeApiRequest<FrankfurterBaseResponse>("/latest", params);

        // Format response
        let content: string;
        if (response_format === ResponseFormat.JSON) {
          content = formatAsJSON(data);
        } else {
          content = formatRatesAsMarkdown(data.rates, data.base, data.date);
        }

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "frankfurter_get_historical_rates": {
        const validated = GetHistoricalRatesSchema.parse(args);
        const { date, base, symbols, response_format } = validated;

        // Validate date is not in future
        const queryDate = new Date(date);
        const today = new Date();
        if (queryDate > today) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Date '${date}' is in the future. For current rates, use frankfurter_get_latest_rates instead.`,
              },
            ],
            isError: true,
          };
        }

        // Build params
        const params: Record<string, string | string[]> = {};
        if (base) params.base = base.toUpperCase();
        if (symbols) params.symbols = symbols.map((s) => s.toUpperCase());

        // Make API request
        const data = await makeApiRequest<FrankfurterBaseResponse>(`/${date}`, params);

        // Format response
        let content: string;
        if (response_format === ResponseFormat.JSON) {
          content = formatAsJSON(data);
        } else {
          content = formatRatesAsMarkdown(data.rates, data.base, data.date);
        }

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "frankfurter_get_time_series": {
        const validated = GetTimeSeriesSchema.parse(args);
        const { start_date, end_date, base, symbols, response_format } = validated;

        // Validate date range
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (startDate >= endDate) {
          return {
            content: [
              {
                type: "text",
                text: `Error: start_date '${start_date}' must be before end_date '${end_date}'.`,
              },
            ],
            isError: true,
          };
        }

        // Build params
        const params: Record<string, string | string[]> = {};
        if (base) params.base = base.toUpperCase();
        if (symbols) params.symbols = symbols.map((s) => s.toUpperCase());

        // Make API request
        const data = await makeApiRequest<FrankfurterTimeSeriesResponse>(
          `/${start_date}..${end_date}`,
          params
        );

        // Format response
        let content: string;
        if (response_format === ResponseFormat.JSON) {
          content = formatAsJSON(data);
        } else {
          const symbolList = symbols
            ? symbols.map((s) => s.toUpperCase())
            : Object.keys(Object.values(data.rates)[0] || {});

          content = formatTimeSeriesAsMarkdown(data.rates, data.base, symbolList);
        }

        // Apply truncation if needed
        content = formatResponse(
          content,
          response_format,
          response_format === ResponseFormat.MARKDOWN
            ? undefined
            : () => content
        );

        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "frankfurter_list_currencies": {
        const validated = ListCurrenciesSchema.parse(args);
        const { response_format } = validated;

        // Make API request
        const data = await makeApiRequest<FrankfurterCurrenciesResponse>("/currencies");

        // Format response
        let content: string;
        if (response_format === ResponseFormat.JSON) {
          content = formatAsJSON(data);
        } else {
          content = formatCurrenciesAsMarkdown(data);
        }

        return {
          content: [{ type: "text", text: content }],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown tool '${name}'. Available tools: frankfurter_convert_currency, frankfurter_get_latest_rates, frankfurter_get_historical_rates, frankfurter_get_time_series, frankfurter_list_currencies`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid parameters - ${errors}`,
          },
        ],
        isError: true,
      };
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Frankfurter MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
