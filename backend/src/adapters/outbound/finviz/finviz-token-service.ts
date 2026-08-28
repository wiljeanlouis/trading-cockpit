export const FINVIZ_TOKEN_MISSING_ERROR =
  'Token Finviz absent. Utilise Trading Cockpit > Configurer Finviz Token.';

export interface FinvizTokenStorage {
  get(): string | null;
  set(token: string): void;
  delete(): void;
}

export class FinvizTokenService {
  constructor(private readonly storage: FinvizTokenStorage) {}

  getToken(): string {
    const token = this.storage.get();
    if (!token || !String(token).trim()) throw new Error(FINVIZ_TOKEN_MISSING_ERROR);
    return String(token).trim();
  }

  setToken(token: unknown): void {
    const normalized = String(token || '').trim();
    if (!normalized) throw new Error('Le token Finviz ne peut pas être vide.');
    this.storage.set(normalized);
  }

  isConfigured(): boolean {
    const token = this.storage.get();
    return Boolean(token && String(token).trim());
  }

  deleteToken(): void {
    this.storage.delete();
  }
}
