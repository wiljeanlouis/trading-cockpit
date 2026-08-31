export interface CorsResult {
  allowed: boolean;
  headers: Record<string, string>;
  rejectedOrigin?: string;
}

const ALLOWED_METHODS = 'GET,POST,PATCH,PUT,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization,Content-Type';

export function evaluateCors(dependencies: {
  origin: string | undefined;
  allowedOrigins: readonly string[];
}): CorsResult {
  if (!dependencies.origin) {
    return { allowed: true, headers: {} };
  }

  if (!dependencies.allowedOrigins.includes(dependencies.origin)) {
    return {
      allowed: false,
      headers: {},
      rejectedOrigin: dependencies.origin
    };
  }

  return {
    allowed: true,
    headers: corsHeadersForOrigin(dependencies.origin)
  };
}

export function corsHeadersForOrigin(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
}
