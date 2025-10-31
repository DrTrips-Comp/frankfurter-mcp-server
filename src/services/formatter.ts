/**
 * Response formatting utilities
 * Handles conversion between JSON and Markdown formats with truncation support
 */

import { CHARACTER_LIMIT, ResponseFormat } from "../constants.js";
import { TruncationMeta } from "../types.js";

/**
 * Format data as JSON string
 * @param data - Data to format
 * @returns JSON string
 */
export function formatAsJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format currency rates as Markdown table
 * @param rates - Currency rates object
 * @param base - Base currency code
 * @param date - Date of rates
 * @returns Markdown formatted string
 */
export function formatRatesAsMarkdown(
  rates: Record<string, number>,
  base: string,
  date: string
): string {
  const entries = Object.entries(rates);

  let markdown = `## Exchange Rates for ${base}\n\n`;
  markdown += `**Date:** ${date}\n\n`;
  markdown += `| Currency | Rate |\n`;
  markdown += `|----------|------|\n`;

  for (const [currency, rate] of entries) {
    markdown += `| ${currency} | ${rate.toFixed(4)} |\n`;
  }

  return markdown;
}

/**
 * Format time series data as Markdown
 * @param rates - Time series rates data
 * @param base - Base currency code
 * @param symbols - Target currency symbols
 * @returns Markdown formatted string
 */
export function formatTimeSeriesAsMarkdown(
  rates: Record<string, Record<string, number>>,
  base: string,
  symbols: string[]
): string {
  const dates = Object.keys(rates).sort();

  let markdown = `## Time Series Exchange Rates for ${base}\n\n`;
  markdown += `**Symbols:** ${symbols.join(", ")}\n\n`;
  markdown += `| Date | ${symbols.join(" | ")} |\n`;
  markdown += `|------|${symbols.map(() => "------").join("|")}|\n`;

  for (const date of dates) {
    const dateRates = rates[date];
    const rateValues = symbols
      .map((symbol) => {
        const rate = dateRates[symbol];
        return rate !== undefined ? rate.toFixed(4) : "N/A";
      })
      .join(" | ");

    markdown += `| ${date} | ${rateValues} |\n`;
  }

  return markdown;
}

/**
 * Format conversion result as Markdown
 * @param from - Source currency
 * @param to - Target currency
 * @param amount - Amount to convert
 * @param rate - Exchange rate
 * @param result - Conversion result
 * @param date - Date of conversion
 * @returns Markdown formatted string
 */
export function formatConversionAsMarkdown(
  from: string,
  to: string,
  amount: number,
  rate: number,
  result: number,
  date: string
): string {
  let markdown = `## Currency Conversion\n\n`;
  markdown += `**${amount.toFixed(2)} ${from} = ${result.toFixed(2)} ${to}**\n\n`;
  markdown += `- Exchange Rate: ${rate.toFixed(4)}\n`;
  markdown += `- Date: ${date}\n`;

  return markdown;
}

/**
 * Format currencies list as Markdown
 * @param currencies - Currencies object
 * @returns Markdown formatted string
 */
export function formatCurrenciesAsMarkdown(
  currencies: Record<string, string>
): string {
  const entries = Object.entries(currencies).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  let markdown = `## Available Currencies\n\n`;
  markdown += `| Code | Name |\n`;
  markdown += `|------|------|\n`;

  for (const [code, name] of entries) {
    markdown += `| ${code} | ${name} |\n`;
  }

  markdown += `\n**Total:** ${entries.length} currencies\n`;

  return markdown;
}

/**
 * Truncate content if it exceeds the character limit
 * @param content - Content to check and potentially truncate
 * @param format - Response format
 * @returns Truncated content and metadata
 */
export function truncateIfNeeded(
  content: string,
  format: ResponseFormat
): { content: string; meta: TruncationMeta } {
  if (content.length <= CHARACTER_LIMIT) {
    return {
      content,
      meta: { truncated: false },
    };
  }

  // Truncate to CHARACTER_LIMIT
  const truncated = content.substring(0, CHARACTER_LIMIT);

  const truncationMessage =
    format === ResponseFormat.MARKDOWN
      ? `\n\n---\n\n**Note:** Response was truncated due to size limit (${CHARACTER_LIMIT} characters). ` +
        `To see more data, try:\n` +
        `- Narrowing the date range\n` +
        `- Filtering with the 'symbols' parameter\n` +
        `- Using pagination parameters\n`
      : "\n\n[TRUNCATED: Response exceeded character limit]";

  return {
    content: truncated + truncationMessage,
    meta: {
      truncated: true,
      truncation_message: "Response exceeded character limit and was truncated",
      original_length: content.length,
    },
  };
}

/**
 * Format response based on requested format
 * @param data - Data to format
 * @param format - Desired format
 * @param formatter - Optional custom markdown formatter
 * @returns Formatted and potentially truncated string
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  formatter?: (data: any) => string
): string {
  let content: string;

  if (format === ResponseFormat.JSON) {
    content = formatAsJSON(data);
  } else {
    content = formatter ? formatter(data) : formatAsJSON(data);
  }

  const { content: finalContent } = truncateIfNeeded(content, format);
  return finalContent;
}
