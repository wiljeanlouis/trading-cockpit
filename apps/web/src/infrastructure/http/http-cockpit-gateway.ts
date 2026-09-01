import type {
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  AnalyticsDto,
  ClosePositionRequest,
  ClosePositionResponse,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  DashboardDto,
  DashboardSummaryDto,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  JournalDto,
  MomentumRankingDto,
  OpenPositionsDto,
  RecordCapitalTransactionRequest,
  RecordCapitalTransactionResponse,
  TradePlansDto,
  TradingAccountsDto,
  TradingConfigDto,
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse,
  WatchlistDto
} from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../cockpit-gateway';
import type { AccountScopedQuery, AnalyticsQuery } from '../cockpit-gateway';

type TokenProvider = () => string | null | Promise<string | null>;

export class HttpCockpitGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'HttpCockpitGatewayError';
  }
}

export interface HttpCockpitGatewayOptions {
  getIdToken: TokenProvider;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => void;
}

export class HttpCockpitGateway implements CockpitGateway {
  private readonly fetchImpl: typeof fetch;
  private readonly getIdToken: TokenProvider;
  private readonly onUnauthorized?: () => void;

  constructor(options: HttpCockpitGatewayOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.getIdToken = options.getIdToken;
    this.onUnauthorized = options.onUnauthorized;
  }

  getDashboard(query?: AccountScopedQuery): Promise<DashboardDto> {
    return this.get(withQuery('/api/dashboard', query));
  }

  getDashboardSummary(): Promise<DashboardSummaryDto> {
    return this.get('/api/dashboard/summary');
  }

  getWatchlist(): Promise<WatchlistDto> {
    return this.get('/api/watchlist');
  }

  getMomentumRanking(): Promise<MomentumRankingDto> {
    return this.get('/api/discovery/momentum-ranking');
  }

  async refreshFinviz(): Promise<number> {
    const response = await this.post<{ archived?: number } | number>(
      '/api/discovery/finviz/refresh-signals'
    );
    return typeof response === 'number' ? response : Number(response.archived ?? 0);
  }

  async refreshMomentumRanking(): Promise<void> {
    await this.post('/api/discovery/momentum-ranking/refresh');
  }

  addMomentumCandidateToWatchlist(
    request: AddMomentumCandidateToWatchlistRequest
  ): Promise<AddMomentumCandidateToWatchlistResponse> {
    return this.post('/api/discovery/momentum-ranking/watchlist', request);
  }

  getAnalytics(query?: AnalyticsQuery): Promise<AnalyticsDto> {
    return this.get(withQuery('/api/analytics', query));
  }

  getTradingAccounts(): Promise<TradingAccountsDto> {
    return this.get('/api/admin/trading-accounts');
  }

  getTradingConfig(): Promise<TradingConfigDto> {
    return this.get('/api/admin/trading-config');
  }

  async setupMomentumRanking(): Promise<void> {
    await this.post('/api/admin/momentum-ranking/setup');
  }

  async setupStrategies(): Promise<void> {
    await this.post('/api/admin/strategies/setup');
  }

  validateStrategies(): Promise<boolean> {
    return this.get('/api/admin/strategies/validation');
  }

  async setupCockpitConfig(): Promise<void> {
    await this.post('/api/admin/trading-config/setup');
  }

  async setupTradingAccounts(): Promise<void> {
    await this.post('/api/admin/trading-accounts/setup');
  }

  recordCapitalTransaction(
    request: RecordCapitalTransactionRequest
  ): Promise<RecordCapitalTransactionResponse> {
    return this.post('/api/admin/capital-transactions', request);
  }

  async checkFinvizAuth(): Promise<boolean> {
    const response = await this.get<{ configured?: boolean } | boolean>('/api/admin/finviz/auth');
    return typeof response === 'boolean' ? response : Boolean(response.configured);
  }

  async setFinvizToken(token: string): Promise<void> {
    await this.put('/api/admin/finviz/token', { token });
  }

  async deleteFinvizToken(): Promise<void> {
    await this.delete('/api/admin/finviz/token');
  }

  createTradePlan(request: CreateTradePlanRequest): Promise<CreateTradePlanResponse> {
    return this.post('/api/trade-plans', request);
  }

  getTradePlans(): Promise<TradePlansDto> {
    return this.get('/api/trade-plans');
  }

  executeTradePlan(request: ExecuteTradePlanRequest): Promise<ExecuteTradePlanResponse> {
    return this.post(`/api/trade-plans/${encodeURIComponent(request.tradePlanId)}/execute`, {
      tradePlanId: request.tradePlanId
    });
  }

  getOpenPositions(): Promise<OpenPositionsDto> {
    return this.get('/api/positions/open');
  }

  closePosition(request: ClosePositionRequest): Promise<ClosePositionResponse> {
    return this.post(`/api/positions/${encodeURIComponent(request.positionId)}/close`, request);
  }

  getJournal(): Promise<JournalDto> {
    return this.get('/api/journal');
  }

  updateTradePlanPlanning(
    request: UpdateTradePlanPlanningRequest
  ): Promise<UpdateTradePlanPlanningResponse> {
    return this.patch(
      `/api/trade-plans/${encodeURIComponent(request.tradePlanId)}/planning`,
      request
    );
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  private delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getIdToken();
    if (!token) {
      this.onUnauthorized?.();
      throw new HttpCockpitGatewayError('Authentication required.', 401);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(path, init);
    const payload = await parseJsonResponse(response);
    if (!response.ok) {
      if (response.status === 401) this.onUnauthorized?.();
      throw new HttpCockpitGatewayError(errorMessage(payload, response.status), response.status);
    }
    return payload as T;
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpCockpitGatewayError('Invalid JSON response from Trading Cockpit API.', 500);
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return String(payload.error || `Trading Cockpit API request failed (${status}).`);
  }
  return `Trading Cockpit API request failed (${status}).`;
}

function withQuery(path: string, query?: AccountScopedQuery | AnalyticsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    const normalized = String(value ?? '').trim();
    if (normalized) params.set(key, normalized);
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}
