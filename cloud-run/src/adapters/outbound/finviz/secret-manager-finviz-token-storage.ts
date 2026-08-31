import { google } from 'googleapis';
import type { FinvizTokenStorage } from './finviz-token-service';

export class SecretManagerFinvizTokenStorage implements FinvizTokenStorage {
  constructor(private readonly configuredSecretName = readSecretName()) {}

  async get(): Promise<string | null> {
    if (!this.configuredSecretName) return null;
    const secretName = this.configuredSecretName;
    const client = await secretManagerClient();
    try {
      const response = await client.projects.secrets.versions.access({
        name: `${secretName}/versions/latest`
      });
      return response.data.payload?.data
        ? Buffer.from(response.data.payload.data, 'base64').toString('utf8')
        : null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async set(token: string): Promise<void> {
    const secretName = requiredSecretName(this.configuredSecretName);
    const client = await secretManagerClient();
    await ensureSecret(client, secretName);
    await client.projects.secrets.addVersion({
      parent: secretName,
      requestBody: {
        payload: {
          data: Buffer.from(token, 'utf8').toString('base64')
        }
      }
    });
  }

  async delete(): Promise<void> {
    const secretName = requiredSecretName(this.configuredSecretName);
    const client = await secretManagerClient();
    try {
      const latest = await client.projects.secrets.versions.access({
        name: `${secretName}/versions/latest`
      });
      const versionName = latest.data.name;
      if (!versionName) return;
      await client.projects.secrets.versions.destroy({ name: versionName });
    } catch (error) {
      if (isNotFound(error)) return;
      throw error;
    }
  }
}

async function secretManagerClient() {
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  return google.secretmanager({ version: 'v1', auth });
}

async function ensureSecret(
  client: ReturnType<typeof google.secretmanager>,
  secretName: string
): Promise<void> {
  try {
    await client.projects.secrets.get({ name: secretName });
  } catch (error) {
    if (!isNotFound(error)) throw error;
    const match = secretName.match(/^(projects\/[^/]+)\/secrets\/([^/]+)$/);
    if (!match)
      throw new Error('TRADING_COCKPIT_FINVIZ_TOKEN_SECRET must be projects/*/secrets/*.');
    await client.projects.secrets.create({
      parent: match[1],
      secretId: match[2],
      requestBody: {
        replication: {
          automatic: {}
        }
      }
    });
  }
}

function readSecretName(): string | null {
  const value = String(process.env.TRADING_COCKPIT_FINVIZ_TOKEN_SECRET ?? '').trim();
  return value || null;
}

function requiredSecretName(value: string | null): string {
  if (!value) {
    throw new Error('TRADING_COCKPIT_FINVIZ_TOKEN_SECRET is required for Finviz token storage.');
  }
  return value;
}

function isNotFound(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    Number((error as { code?: unknown }).code) === 404
  );
}
