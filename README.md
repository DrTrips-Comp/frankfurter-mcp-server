# Frankfurter MCP Server

A Model Context Protocol (MCP) server that provides currency exchange operations using the [Frankfurter API](https://www.frankfurter.app/). This server enables LLMs to perform real-time currency conversions, query historical exchange rates, analyze time series data, and discover available currencies.

## Features

- **Currency Conversion**: Convert amounts between currencies using current or historical exchange rates
- **Latest Rates**: Get the most recent exchange rates (updated daily at 4 PM CET)
- **Historical Rates**: Query exchange rates for any date since 1999-01-04
- **Time Series Analysis**: Retrieve exchange rate trends over date ranges
- **Currency Discovery**: List all 30+ supported currencies with full names
- **Dual Output Formats**: Both JSON (structured) and Markdown (human-readable) response formats
- **Error Handling**: Clear, actionable error messages to guide correct usage
- **Context-Efficient**: Automatic truncation for large responses to protect LLM context windows

## Installation

### Prerequisites

- Node.js >= 18
- npm or yarn

### Setup

```bash
# Clone or download this repository
cd frankfurter-mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Test the server
node dist/index.js
```

## Configuration

Add this server to your Claude Desktop configuration:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "frankfurter": {
      "command": "node",
      "args": ["/absolute/path/to/drtrips-currency-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### 1. frankfurter_convert_currency

Convert an amount from one currency to another.

**Parameters:**
- `from` (required): Source currency code (3-letter ISO, e.g., "EUR", "USD")
- `to` (required): Target currency code (3-letter ISO)
- `amount` (required): Amount to convert (positive number)
- `date` (optional): Historical date in YYYY-MM-DD format
- `response_format` (optional): "json" or "markdown" (default: "markdown")

**Example:**
```typescript
{
  "from": "EUR",
  "to": "USD",
  "amount": 100,
  "response_format": "markdown"
}
```

### 2. frankfurter_get_latest_rates

Get the latest exchange rates for a base currency.

**Parameters:**
- `base` (optional): Base currency code (default: "EUR")
- `symbols` (optional): Array of target currency codes to filter results
- `response_format` (optional): "json" or "markdown" (default: "markdown")

**Example:**
```typescript
{
  "base": "USD",
  "symbols": ["EUR", "GBP", "JPY"],
  "response_format": "json"
}
```

### 3. frankfurter_get_historical_rates

Get exchange rates for a specific historical date.

**Parameters:**
- `date` (required): Historical date in YYYY-MM-DD format (>= 1999-01-04)
- `base` (optional): Base currency code (default: "EUR")
- `symbols` (optional): Array of target currency codes to filter results
- `response_format` (optional): "json" or "markdown" (default: "markdown")

**Example:**
```typescript
{
  "date": "2020-01-15",
  "base": "EUR",
  "symbols": ["USD", "GBP"],
  "response_format": "markdown"
}
```

### 4. frankfurter_get_time_series

Get exchange rate time series data over a date range.

**Parameters:**
- `start_date` (required): Start date in YYYY-MM-DD format (>= 1999-01-04)
- `end_date` (required): End date in YYYY-MM-DD format (must be after start_date)
- `base` (optional): Base currency code (default: "EUR")
- `symbols` (optional): Array of target currency codes (recommended: 2-5 currencies)
- `response_format` (optional): "json" or "markdown" (default: "markdown")

**Example:**
```typescript
{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "base": "EUR",
  "symbols": ["USD", "GBP"],
  "response_format": "markdown"
}
```

**Note**: Large date ranges may be truncated. For best results, query smaller ranges (1-3 months).

### 5. frankfurter_list_currencies

List all available currencies supported by the Frankfurter API.

**Parameters:**
- `response_format` (optional): "json" or "markdown" (default: "markdown")

**Example:**
```typescript
{
  "response_format": "markdown"
}
```

## Data Source

This server uses the [Frankfurter API](https://www.frankfurter.app/), which provides:
- Exchange rates from the European Central Bank (ECB)
- Daily updates at 4 PM CET
- Historical data from 1999-01-04 onwards
- 30+ currency pairs
- Free access with no API key required

## Design Philosophy

This MCP server follows agent-centric design principles:

- **Workflow-Oriented Tools**: Tools complete useful tasks, not just API wrappers
- **Context-Efficient**: Optimized response formats to minimize token usage
- **Actionable Errors**: Clear guidance to help LLMs correct mistakes
- **Natural Task Flow**: Tool names reflect how humans think about currency operations

## Limitations

- Rates update once daily (not real-time tick-by-tick data)
- No authentication required (public API)
- Character limit of 25,000 per response (with automatic truncation)
- Weekend/holiday dates return nearest business day rates
- All dates are in UTC timezone

## Troubleshooting

### Server won't start
- Verify Node.js >= 18 is installed: `node --version`
- Ensure dependencies are installed: `npm install`
- Check build completed successfully: `npm run build`

### API timeout errors
- The Frankfurter API has a 10-second timeout
- Check your internet connection
- Try the request again after a moment

### Currency code not found
- Use `frankfurter_list_currencies` to see all valid currency codes
- Ensure codes are 3 letters and uppercase (automatically converted)

### Large time series truncated
- Reduce the date range (e.g., query 1 month instead of 1 year)
- Use the `symbols` parameter to filter specific currencies
- Query multiple smaller ranges instead of one large range

## Development

### Project Structure

```
src/
  index.ts              # Main server and tool handlers
  constants.ts          # Configuration constants
  types.ts              # TypeScript type definitions
  services/
    frankfurter-client.ts  # API client with error handling
    formatter.ts           # Response formatting utilities
```

### Scripts

```bash
npm run build    # Compile TypeScript to JavaScript
npm run dev      # Watch mode for development
npm run start    # Run the compiled server
```

### Testing Locally

```bash
# Build the project
npm run build

# Run the server
node dist/index.ts

# The server will run on stdio, waiting for MCP protocol messages
```

## License

MIT

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Maintain the agent-centric design philosophy
2. Add comprehensive error handling with actionable messages
3. Update documentation for any new features
4. Test with the Frankfurter API before submitting

## Links

- [Frankfurter API Documentation](https://www.frankfurter.app/docs/)
- [Model Context Protocol](https://github.com/anthropics/anthropic-sdk-typescript)
- [European Central Bank](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/)

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify the [Frankfurter API status](https://www.frankfurter.app/)
3. Review the tool descriptions in Claude Desktop
4. Open an issue in this repository
