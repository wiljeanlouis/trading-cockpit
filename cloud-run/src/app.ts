import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import {
  authenticateGoogleBearerToken,
  GoogleAuthLibraryIdTokenVerifier,
  type GoogleIdTokenVerifier
} from './auth/google-id-token-auth';
import {
  createGoogleSheetsApiClient,
  type SheetsValuesClient
} from './adapters/outbound/google-sheets-api/google-sheets-api-client';
import type { CloudRunAuthConfig, CloudRunCorsConfig } from './config';
import { evaluateCors } from './http/cors';
import { apiErrorResponse } from './http/errors';
import { handleHealth } from './http/routes/health';
import { handleMutationRoute, isMutationRoute } from './http/routes/mutations';
import { handleMigratedQueryRoute, isMigratedQueryRoute } from './http/routes/queries';
import { handleGetWatchlist } from './http/routes/watchlist';
import { createStaticAssetServer, type StaticAssetServer } from './http/static-assets';

export interface CloudRunAppDependencies {
  spreadsheetId: string;
  auth: CloudRunAuthConfig;
  cors: CloudRunCorsConfig;
  sheetsClientFactory?: () => Promise<SheetsValuesClient>;
  tokenVerifier?: GoogleIdTokenVerifier;
  staticAssetsPath?: string;
  staticAssets?: StaticAssetServer;
  now?: () => Date;
}

export interface CloudRunHttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

type CloudRunRequestHandler = (request: {
  method: string;
  url: string;
  headers?: IncomingHttpHeadersLike;
  body?: string;
}) => Promise<CloudRunHttpResponse>;

export function createCloudRunApp({
  spreadsheetId,
  auth,
  cors,
  sheetsClientFactory = createGoogleSheetsApiClient,
  tokenVerifier = new GoogleAuthLibraryIdTokenVerifier(),
  staticAssetsPath,
  staticAssets,
  now = () => new Date()
}: CloudRunAppDependencies): Server {
  const handleRequest = createCloudRunRequestHandler({
    spreadsheetId,
    auth,
    cors,
    sheetsClientFactory,
    tokenVerifier,
    staticAssetsPath,
    staticAssets,
    now
  });

  return createServer(async (request, response) => {
    try {
      const result = await handleRequest({
        method: request.method ?? 'GET',
        url: request.url ?? '/',
        headers: request.headers,
        body: await readRequestBody(request)
      });
      sendHttpResponse(response, result.statusCode, result.body, result.headers);
    } catch (error) {
      const result = unexpectedErrorResponse(error, spreadsheetId);
      sendHttpResponse(response, result.statusCode, result.body, result.headers);
    } finally {
      drainRequest(request);
    }
  });
}

export function createCloudRunRequestHandler({
  spreadsheetId,
  auth,
  cors,
  sheetsClientFactory = createGoogleSheetsApiClient,
  tokenVerifier = new GoogleAuthLibraryIdTokenVerifier(),
  staticAssetsPath,
  staticAssets,
  now = () => new Date()
}: CloudRunAppDependencies): CloudRunRequestHandler {
  const sharedSheetsClientFactory = reuseSheetsClient(sheetsClientFactory);
  const staticAssetServer =
    staticAssets ??
    createStaticAssetServer({
      webDistPath: staticAssetsPath ?? defaultStaticAssetsPath()
    });

  return ({ method, url, headers, body }) =>
    handleCloudRunRequest({
      method,
      url,
      headers: headers ?? {},
      body,
      spreadsheetId,
      auth,
      cors,
      sheetsClientFactory: sharedSheetsClientFactory,
      tokenVerifier,
      staticAssets: staticAssetServer,
      now
    });
}

export async function handleCloudRunRequest(dependencies: {
  method: string;
  url: string;
  headers?: IncomingHttpHeadersLike;
  body?: string;
  spreadsheetId: string;
  auth: CloudRunAuthConfig;
  cors: CloudRunCorsConfig;
  sheetsClientFactory: () => Promise<SheetsValuesClient>;
  tokenVerifier: GoogleIdTokenVerifier;
  staticAssetsPath?: string;
  staticAssets?: StaticAssetServer;
  now?: () => Date;
}): Promise<CloudRunHttpResponse> {
  const method = dependencies.method.toUpperCase();
  const pathname = requestPathname(dependencies.url);
  const headers = normalizeHeaders(dependencies.headers ?? {});
  const cors = evaluateCors({
    origin: headers.origin,
    allowedOrigins: dependencies.cors.allowedOrigins
  });

  if (!cors.allowed) {
    logRejectedCorsOrigin(cors.rejectedOrigin);
    return jsonResponse(403, { error: 'Origin is not allowed.' });
  }

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors.headers,
      body: null
    };
  }

  if (method === 'GET' && pathname === '/health') {
    return withCorsHeaders(handleHealth(), cors.headers);
  }

  if (pathname.startsWith('/api/')) {
    try {
      const principal = await authenticateGoogleBearerToken({
        authorizationHeader: headers.authorization,
        googleClientId: dependencies.auth.googleClientId,
        allowedEmails: dependencies.auth.allowedEmails,
        verifier: dependencies.tokenVerifier
      });
      const context = { principal };
      const routeResponse =
        method === 'GET' && pathname === '/api/watchlist'
          ? await handleGetWatchlist({
              context,
              spreadsheetId: dependencies.spreadsheetId,
              sheetsClientFactory: dependencies.sheetsClientFactory,
              now: dependencies.now ?? (() => new Date())
            })
          : isMigratedQueryRoute(method, pathname)
            ? await handleMigratedQueryRoute({
                context,
                method,
                pathname,
                spreadsheetId: dependencies.spreadsheetId,
                sheetsClientFactory: dependencies.sheetsClientFactory,
                now: dependencies.now ?? (() => new Date())
              })
            : isMutationRoute(method, pathname)
              ? await handleMutationRoute({
                  context,
                  method,
                  pathname,
                  body: dependencies.body,
                  spreadsheetId: dependencies.spreadsheetId,
                  sheetsClientFactory: dependencies.sheetsClientFactory,
                  now: dependencies.now ?? (() => new Date())
                })
              : jsonResponse(404, { error: 'Not found' });

      return withCorsHeaders(routeResponse, cors.headers);
    } catch (error) {
      return withCorsHeaders(errorResponse(error, dependencies.spreadsheetId), cors.headers);
    }
  }

  const staticAssets =
    dependencies.staticAssets ??
    (dependencies.staticAssetsPath
      ? createStaticAssetServer({ webDistPath: dependencies.staticAssetsPath })
      : undefined);
  const staticResponse = await staticAssets?.serve({ method, pathname });
  if (staticResponse) return withCorsHeaders(staticResponse, cors.headers);

  return withCorsHeaders(jsonResponse(404, { error: 'Not found' }), cors.headers);
}

function reuseSheetsClient(
  sheetsClientFactory: () => Promise<SheetsValuesClient>
): () => Promise<SheetsValuesClient> {
  let clientPromise: Promise<SheetsValuesClient> | null = null;

  return () => {
    clientPromise ??= sheetsClientFactory();
    return clientPromise;
  };
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {}
): CloudRunHttpResponse {
  return {
    statusCode,
    headers,
    body
  };
}

function errorResponse(error: unknown, spreadsheetId: string): CloudRunHttpResponse {
  const response = apiErrorResponse(error);
  if (response.statusCode >= 500) {
    logSafeError(error, spreadsheetId);
  }
  return jsonResponse(response.statusCode, response.body);
}

function unexpectedErrorResponse(error: unknown, spreadsheetId: string): CloudRunHttpResponse {
  logSafeError(error, spreadsheetId);
  return jsonResponse(500, { error: 'Unexpected Trading Cockpit server error.' });
}

function logSafeError(error: unknown, spreadsheetId: string): void {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = spreadsheetId
    ? rawMessage.replaceAll(spreadsheetId, '[redacted-spreadsheet-id]')
    : rawMessage;
  console.error('[trading-cockpit-cloud-run] request failed', { message });
}

function sendHttpResponse(
  response: ServerResponse,
  statusCode: number,
  value: unknown,
  headers: Record<string, string> = {}
): void {
  const contentType = headers['Content-Type'] ?? 'application/json; charset=utf-8';
  response.writeHead(statusCode, {
    ...headers,
    'Content-Type': contentType
  });

  if (value === null || value === undefined) {
    response.end('');
  } else if (Buffer.isBuffer(value)) {
    response.end(value);
  } else if (contentType.startsWith('application/json')) {
    response.end(JSON.stringify(value));
  } else {
    response.end(String(value));
  }
}

function drainRequest(request: IncomingMessage): void {
  request.resume();
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  if (!(Symbol.asyncIterator in request)) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function withCorsHeaders(
  response: CloudRunHttpResponse,
  corsHeaders: Record<string, string>
): CloudRunHttpResponse {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...corsHeaders
    }
  };
}

function normalizeHeaders(headers: IncomingHttpHeadersLike): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(',') : value;
  }
  return normalized;
}

function requestPathname(url: string): string {
  return new URL(url, 'http://localhost').pathname;
}

function logRejectedCorsOrigin(origin: string | undefined): void {
  console.warn('[trading-cockpit-cloud-run] rejected CORS origin', {
    origin: origin ? '[redacted-origin]' : undefined
  });
}

function defaultStaticAssetsPath(): string {
  return new URL('../../web/dist/', import.meta.url).pathname;
}

type IncomingHttpHeadersLike = Record<string, string | string[] | undefined>;
