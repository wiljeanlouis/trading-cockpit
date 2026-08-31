export const FINVIZ_TOKEN_MISSING_ERROR =
  'Token Finviz absent. Configure le token Finviz avant de rafraîchir les signaux.';

export interface FinvizTokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  delete(): Promise<void>;
}

export class AsyncFinvizTokenService {
  constructor(private readonly storage: FinvizTokenStorage) {}

  async getToken(): Promise<string> {
    const token = await this.storage.get();
    if (!token || !String(token).trim()) throw new Error(FINVIZ_TOKEN_MISSING_ERROR);
    return String(token).trim();
  }

  async setToken(token: unknown): Promise<void> {
    const normalized = String(token || '').trim();
    if (!normalized) throw new Error('Le token Finviz ne peut pas être vide.');
    await this.storage.set(normalized);
  }

  async isConfigured(): Promise<boolean> {
    const token = await this.storage.get();
    return Boolean(token && String(token).trim());
  }

  async deleteToken(): Promise<void> {
    await this.storage.delete();
  }
}
