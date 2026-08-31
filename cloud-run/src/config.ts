export interface CloudRunConfig {
  spreadsheetId: string;
  port: number;
  staticAssetsPath: string;
  auth: CloudRunAuthConfig;
  cors: CloudRunCorsConfig;
}

export interface CloudRunAuthConfig {
  googleClientId: string;
  allowedEmails: readonly string[];
}

export interface CloudRunCorsConfig {
  allowedOrigins: readonly string[];
}

export function requireSpreadsheetId(env: NodeJS.ProcessEnv = process.env): string {
  return requireEnvValue(
    env,
    'TRADING_COCKPIT_SPREADSHEET_ID',
    'TRADING_COCKPIT_SPREADSHEET_ID is required for Trading Cockpit Cloud Run.'
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): CloudRunConfig {
  return {
    spreadsheetId: requireSpreadsheetId(env),
    port: readPort(env),
    staticAssetsPath: readStaticAssetsPath(env),
    auth: {
      googleClientId: requireEnvValue(
        env,
        'TRADING_COCKPIT_GOOGLE_CLIENT_ID',
        'TRADING_COCKPIT_GOOGLE_CLIENT_ID is required for Trading Cockpit Cloud Run authentication.'
      ),
      allowedEmails: requireCsvEnvValue(
        env,
        'TRADING_COCKPIT_ALLOWED_EMAILS',
        'TRADING_COCKPIT_ALLOWED_EMAILS must contain at least one authorized email.'
      )
    },
    cors: {
      allowedOrigins: requireCsvEnvValue(
        env,
        'TRADING_COCKPIT_ALLOWED_ORIGINS',
        'TRADING_COCKPIT_ALLOWED_ORIGINS must contain at least one allowed origin.'
      )
    }
  };
}

function readStaticAssetsPath(env: NodeJS.ProcessEnv): string {
  const configured = String(env.TRADING_COCKPIT_WEB_DIST_DIR ?? '').trim();
  if (configured) return configured;
  return new URL('../../web/dist/', import.meta.url).pathname;
}

function readPort(env: NodeJS.ProcessEnv): number {
  const rawPort = String(env.PORT ?? '').trim();
  if (!rawPort) return 8080;

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer when provided.');
  }

  return port;
}

function requireCsvEnvValue(env: NodeJS.ProcessEnv, key: string, errorMessage: string): string[] {
  const values = String(env[key] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(errorMessage);
  }

  return values;
}

function requireEnvValue(env: NodeJS.ProcessEnv, key: string, errorMessage: string): string {
  const value = String(env[key] ?? '').trim();
  if (!value) {
    throw new Error(errorMessage);
  }
  return value;
}
