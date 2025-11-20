import { corsHeaders } from "./auth-middleware.ts";

export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  statusCode: number;
}

export interface ACPError {
  error: string;
  details?: string;
  code?: string;
}

export interface MCPError {
  jsonrpc: '2.0';
  id: string | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Standardized error codes for ACP
 */
export const ACP_ERROR_CODES = {
  INVALID_REQUEST: 'ACP_INVALID_REQUEST',
  UNAUTHORIZED: 'ACP_UNAUTHORIZED',
  FORBIDDEN: 'ACP_FORBIDDEN',
  NOT_FOUND: 'ACP_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'ACP_RATE_LIMIT_EXCEEDED',
  PAYMENT_FAILED: 'ACP_PAYMENT_FAILED',
  INSUFFICIENT_FUNDS: 'ACP_INSUFFICIENT_FUNDS',
  SESSION_EXPIRED: 'ACP_SESSION_EXPIRED',
  LISTING_NOT_AVAILABLE: 'ACP_LISTING_NOT_AVAILABLE',
  INTERNAL_ERROR: 'ACP_INTERNAL_ERROR',
} as const;

/**
 * Standardized error codes for MCP (JSON-RPC 2.0)
 */
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  AUTH_ERROR: -32000,
  RATE_LIMIT: -32001,
  FORBIDDEN: -32003,
  NOT_FOUND: -32004,
  INVALID_STATE: -32005,
  AI_VISIBILITY_DISABLED: -32006,
  SELF_TRADE: -32007,
} as const;

/**
 * Create standardized ACP error response
 */
export function createACPError(
  error: string,
  details?: string,
  code?: string,
  statusCode: number = 400
): Response {
  const errorResponse: ACPError = {
    error,
    ...(details && { details }),
    ...(code && { code }),
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create standardized MCP error response (JSON-RPC 2.0)
 */
export function createMCPError(
  code: number,
  message: string,
  data?: any,
  id: string | null = null
): Response {
  const errorResponse: MCPError = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data && { data }),
    },
  };

  // Map error codes to HTTP status codes
  let statusCode = 500;
  if (code === MCP_ERROR_CODES.AUTH_ERROR || code === MCP_ERROR_CODES.FORBIDDEN) {
    statusCode = 403;
  } else if (code === MCP_ERROR_CODES.NOT_FOUND) {
    statusCode = 404;
  } else if (code === MCP_ERROR_CODES.RATE_LIMIT) {
    statusCode = 429;
  } else if (code === MCP_ERROR_CODES.INVALID_REQUEST || code === MCP_ERROR_CODES.INVALID_PARAMS) {
    statusCode = 400;
  }

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: any): Response | null {
  if (error?.name === 'ZodError' && error?.errors) {
    return createACPError(
      'Validation failed',
      error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
      ACP_ERROR_CODES.INVALID_REQUEST,
      400
    );
  }
  return null;
}

/**
 * Handle common database errors
 */
export function handleDatabaseError(error: any): string {
  if (error?.code === '23505') {
    return 'Duplicate entry - this record already exists';
  }
  if (error?.code === '23503') {
    return 'Referenced record does not exist';
  }
  if (error?.code === '23514') {
    return 'Data validation failed - check your input values';
  }
  if (error?.code === 'PGRST116') {
    return 'Record not found';
  }
  return error?.message || 'Database error occurred';
}

