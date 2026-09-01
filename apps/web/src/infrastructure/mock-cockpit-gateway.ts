import type {
  AnalyticsDto,
  AddMomentumCandidateToWatchlistRequest,
  AddMomentumCandidateToWatchlistResponse,
  AdminOverviewDto,
  CreateTradePlanRequest,
  CreateTradePlanResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  CreateFundedTradingAccountRequest,
  CreateTradingAccountRequest,
  DashboardDto,
  DashboardSummaryDto,
  RecordCapitalTransactionRequest,
  RecordCapitalTransactionResponse,
  CapitalTransactionDto,
  ExecuteTradePlanRequest,
  ExecuteTradePlanResponse,
  OpenPositionsDto,
  JournalDto,
  JournalItemDto,
  MomentumRankingDto,
  MomentumRankingItemDto,
  PositionItemDto,
  TradePlanItemDto,
  TradePlansDto,
  TradingConfigDto,
  TradingAccountsDto,
  TradingAccountMutationResponse,
  AdminAccountDto,
  WatchlistDto,
  UpdateTradePlanPlanningRequest,
  UpdateTradePlanPlanningResponse,
  UpdateTradingAccountRequest
} from '@trading-cockpit/contracts';
import type { CockpitGateway } from './cockpit-gateway';

const DEVELOPMENT_SUMMARY: DashboardSummaryDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  signals: 18,
  watchlist: 8,
  ready: 3,
  activeTradePlans: 2,
  openPositions: 1,
  closedTrades: 14
};

const DEVELOPMENT_WATCHLIST: WatchlistDto = {
  generatedAt: '2026-08-28T16:00:00.000Z',
  items: [
    {
      id: 'W-BOX-20260827',
      ticker: 'BOX',
      company: 'Box, Inc.',
      sector: 'Technology',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-27T04:00:00.000Z',
      signalPrice: 33.4,
      currentPrice: 34.82,
      momentumScore: 87,
      status: 'READY',
      setupStatus: 'VALID',
      breakoutLevel: 34.5,
      invalidationLevel: 32.8,
      earningsDate: '2026-09-10T04:00:00.000Z',
      eventRisk: 'CLEAR',
      notes: 'Development fixture'
    },
    {
      id: 'W-URNB-20260826',
      ticker: 'URNB',
      company: 'Ur-Nergy Inc.',
      sector: 'Energy',
      strategyId: 'MOMENTUM_BREAKOUT',
      strategyName: 'Momentum Breakout',
      strategyVersion: '1.0',
      signalDate: '2026-08-26T04:00:00.000Z',
      signalPrice: 1.68,
      currentPrice: 1.74,
      momentumScore: 72,
      status: 'WATCHING',
      setupStatus: '',
      breakoutLevel: null,
      invalidationLevel: null,
      earningsDate: null,
      eventRisk: null,
      notes: null
    }
  ]
};

const DEVELOPMENT_MOMENTUM_RANKING: MomentumRankingItemDto[] = [
  {
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-28',
    ticker: 'NVDA',
    company: 'NVIDIA Corp',
    sector: 'Technology',
    price: 217.55,
    high52: 220,
    high52Score: 20,
    relativeVolume: 1.8,
    relativeVolumeScore: 18,
    performanceMonth: 0.12,
    performanceScore: 16,
    rsi: 63,
    rsiScore: 14,
    sma20: 1.03,
    sma20Score: 18,
    momentumScore: 86,
    reviewStatus: 'READY',
    watchlistStatus: null
  },
  {
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-27',
    ticker: 'BOX',
    company: 'Box, Inc.',
    sector: 'Technology',
    price: 34.98,
    high52: 36,
    high52Score: 18,
    relativeVolume: 1.5,
    relativeVolumeScore: 16,
    performanceMonth: 0.09,
    performanceScore: 14,
    rsi: 59,
    rsiScore: 13,
    sma20: 1.02,
    sma20Score: 17,
    momentumScore: 87,
    reviewStatus: 'WATCH',
    watchlistStatus: 'READY'
  },
  {
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-26',
    ticker: 'URNB',
    company: 'Ur-Nergy Inc.',
    sector: 'Energy',
    price: 1.74,
    high52: 1.9,
    high52Score: 15,
    relativeVolume: 1.2,
    relativeVolumeScore: 13,
    performanceMonth: 0.07,
    performanceScore: 12,
    rsi: 55,
    rsiScore: 12,
    sma20: 1.01,
    sma20Score: 14,
    momentumScore: 72,
    reviewStatus: 'REVIEW',
    watchlistStatus: null
  }
];

const DEVELOPMENT_TRADE_PLANS: TradePlanItemDto[] = [
  {
    id: 'DEMO-TP-BOX',
    watchlistId: 'W-BOX-20260827',
    accountId: 'DEMO-CAD',
    ticker: 'BOX',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-27T04:00:00.000Z',
    signalPrice: 33.4,
    referencePrice: 34.82,
    momentumScore: 87,
    setupStatus: 'CONFIRMED',
    breakoutLevel: 34.5,
    invalidationLevel: 32.8,
    eventRisk: 'CLEAR',
    createdAt: '2026-08-28T14:00:00.000Z',
    entryType: 'BREAKOUT',
    entryPrice: 35,
    stopPrice: 32.8,
    targetPrice: 40,
    riskPerShare: 2.2,
    rewardPerShare: 5,
    riskReward: 2.27,
    accountEquity: 10_000,
    riskPercent: 0.01,
    maxRisk: 100,
    positionSize: 45,
    positionValue: 1575,
    status: 'READY',
    notes: 'Development fixture',
    executionEligibility: { eligible: true, reason: null }
  },
  {
    id: 'DEMO-TP-URNB',
    watchlistId: 'W-URNB-20260826',
    accountId: 'DEMO-USD',
    ticker: 'URNB',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    signalDate: '2026-08-26T04:00:00.000Z',
    signalPrice: 1.68,
    referencePrice: 1.74,
    momentumScore: 72,
    setupStatus: null,
    breakoutLevel: null,
    invalidationLevel: 1.55,
    eventRisk: null,
    createdAt: '2026-08-28T15:00:00.000Z',
    entryType: 'BREAKOUT',
    entryPrice: null,
    stopPrice: 1.55,
    targetPrice: null,
    riskPerShare: null,
    rewardPerShare: null,
    riskReward: null,
    accountEquity: 20_000,
    riskPercent: 0.005,
    maxRisk: 100,
    positionSize: null,
    positionValue: null,
    status: 'DRAFT',
    notes: null,
    executionEligibility: { eligible: false, reason: "URNB n'a pas d'Entry Price." }
  }
];

const DEVELOPMENT_POSITIONS: PositionItemDto[] = [
  {
    id: 'DEMO-P-BOX-DEMO-CAD',
    accountId: 'DEMO-CAD',
    tradePlanId: 'DEMO-TP-BOX',
    watchlistId: 'W-BOX-20260827',
    ticker: 'BOX',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    openedAt: '2026-08-28T15:30:00.000Z',
    plannedEntry: 35,
    actualEntry: 35,
    plannedQuantity: 45,
    actualQuantity: 45,
    initialStop: 32.8,
    currentStop: 32.8,
    target: 40,
    plannedMaxRisk: 100,
    plannedRiskReward: 2.27,
    currentPrice: 35.6,
    unrealizedPnl: 27,
    unrealizedPnlPercent: 0.0171,
    status: 'OPEN',
    notes: 'Development fixture'
  }
];

const DEVELOPMENT_JOURNAL: JournalItemDto[] = [
  {
    id: 'DEMO-J-BOX',
    positionId: 'DEMO-P-BOX-CLOSED',
    accountId: 'DEMO-CAD',
    tradePlanId: 'DEMO-TP-BOX-CLOSED',
    watchlistId: 'W-BOX-20260820',
    strategyId: 'MOMENTUM_BREAKOUT',
    strategyName: 'Momentum Breakout',
    strategyVersion: '1.0',
    ticker: 'BOX',
    openedAt: '2026-08-20T14:30:00.000Z',
    closedAt: '2026-08-27T15:45:00.000Z',
    plannedEntry: 33,
    actualEntry: 33.1,
    exitPrice: 36.5,
    quantity: 40,
    initialStop: 31,
    target: 38,
    plannedMaxRisk: 84,
    plannedRiskReward: 2.38,
    realizedPnl: 136,
    returnPercent: 0.1027,
    rMultiple: 1.619,
    outcome: 'WIN',
    exitReason: 'MANUAL',
    executionNotes: 'Development fixture',
    lessonsLearned: 'Respect the setup and scale deliberately.',
    followedPlan: 'YES'
  }
];

const DEVELOPMENT_ANALYTICS: AnalyticsDto = {
  generatedAt: '2026-08-28T16:10:00.000Z',
  available: true,
  summary: {
    trades: 14,
    wins: 9,
    losses: 4,
    breakeven: 1,
    winRate: 0.6428571428571429,
    profitFactor: 2.14,
    totalPnl: 1287,
    realizedPnl: 1287,
    averagePnl: 91.93,
    bestPnl: 240,
    grossProfit: 1820,
    grossLoss: -533,
    worstPnl: -142,
    totalR: 18.2,
    averageR: 1.3,
    expectancyR: 0.42,
    averageWinnerR: 2.08,
    averageLoserR: -0.71,
    bestR: 4.1
  },
  byStrategy: [
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategy: 'Momentum Breakout',
      trades: 14,
      wins: 9,
      winRate: 0.6428571428571429,
      totalPnl: 1287,
      averageR: 1.3,
      totalR: 18.2
    }
  ],
  byStrategyVersion: [
    {
      strategyId: 'MOMENTUM_BREAKOUT',
      strategy: 'Momentum Breakout',
      version: 'V1',
      trades: 14,
      wins: 9,
      winRate: 0.6428571428571429,
      totalPnl: 1287,
      averageR: 1.3,
      totalR: 18.2
    }
  ]
};

const DEVELOPMENT_TRADING_CONFIG: TradingConfigDto = {
  settings: []
};

export class MockCockpitGateway implements CockpitGateway {
  private watchlistItems = DEVELOPMENT_WATCHLIST.items.map((item) => ({ ...item }));
  private momentumRankingItems = DEVELOPMENT_MOMENTUM_RANKING.map((item) => ({ ...item }));
  private tradePlanItems = DEVELOPMENT_TRADE_PLANS.map((item) => ({ ...item }));
  private positionItems = DEVELOPMENT_POSITIONS.map((item) => ({ ...item }));
  private journalItems = DEVELOPMENT_JOURNAL.map((item) => ({ ...item }));
  private analytics = { ...DEVELOPMENT_ANALYTICS };
  private finvizConfigured = true;
  private tradingConfig = { ...DEVELOPMENT_TRADING_CONFIG };
  private accounts: AdminAccountDto[] = [
    {
      id: 'DEMO-CAD',
      name: 'Development CAD',
      baseCurrency: 'CAD',
      riskPercentPerTrade: 0.005,
      financialSummary: {
        initialFunding: 10_000,
        deposits: 1_000,
        withdrawals: 0,
        netExternalCapital: 11_000,
        realizedPnl: 287,
        realizedEquity: 11_287
      },
      capitalTransactions: [
        {
          transactionId: 'CT-DEMO-CAD-1',
          accountId: 'DEMO-CAD',
          type: 'INITIAL_FUNDING',
          amount: 10_000,
          occurredAt: '2026-08-01T12:00:00.000Z',
          note: 'Initial funding'
        },
        {
          transactionId: 'CT-DEMO-CAD-2',
          accountId: 'DEMO-CAD',
          type: 'DEPOSIT',
          amount: 1_000,
          occurredAt: '2026-08-15T12:00:00.000Z',
          note: 'Monthly contribution'
        }
      ]
    },
    {
      id: 'DEMO-USD',
      name: 'Development USD',
      baseCurrency: 'USD',
      riskPercentPerTrade: 0.01,
      financialSummary: {
        initialFunding: 5_000,
        deposits: 0,
        withdrawals: 0,
        netExternalCapital: 5_000,
        realizedPnl: 0,
        realizedEquity: 5_000
      },
      capitalTransactions: [
        {
          transactionId: 'CT-DEMO-USD-1',
          accountId: 'DEMO-USD',
          type: 'INITIAL_FUNDING',
          amount: 5_000,
          occurredAt: '2026-08-01T12:00:00.000Z',
          note: 'Initial funding'
        }
      ]
    }
  ];

  async getDashboard(): Promise<DashboardDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const generatedAt = new Date().toISOString();
    const activeWatchlist = this.watchlistItems.filter((item) => item.ticker);
    const ready = activeWatchlist.filter((item) => item.status === 'READY');
    const nearBreakout = activeWatchlist
      .filter(
        (item) =>
          ['WATCHING', 'READY'].includes(item.status) &&
          item.breakoutLevel !== null &&
          item.currentPrice !== null &&
          item.currentPrice <= item.breakoutLevel &&
          (item.breakoutLevel - item.currentPrice) / item.breakoutLevel <= 0.02
      )
      .map((item) => ({
        ticker: item.ticker,
        distance:
          item.breakoutLevel && item.currentPrice
            ? (item.currentPrice - item.breakoutLevel) / item.breakoutLevel
            : 0,
        currentPrice: item.currentPrice,
        breakoutLevel: item.breakoutLevel,
        setupStatus: item.setupStatus
      }));
    const openPositions = this.positionItems.filter((item) => item.status === 'OPEN');
    const closedTrades = this.analytics.summary.trades;
    const pipeline = {
      signals: this.momentumRankingItems.length,
      watchlist: activeWatchlist.length,
      ready: ready.length,
      nearBreakout: nearBreakout.length,
      activeTradePlans: this.tradePlanItems.filter((item) =>
        ['DRAFT', 'READY'].includes(item.status)
      ).length,
      openPositions: openPositions.length,
      closedTrades
    };

    return {
      generatedAt,
      summary: {
        generatedAt,
        signals: pipeline.signals,
        watchlist: pipeline.watchlist,
        ready: pipeline.ready,
        activeTradePlans: pipeline.activeTradePlans,
        openPositions: pipeline.openPositions,
        closedTrades
      },
      account: {
        accountName: 'All Accounts',
        accountEquity: this.analytics.summary.totalPnl,
        realizedEquity: this.analytics.summary.totalPnl,
        netExternalCapital: 0,
        realizedPnl: this.analytics.summary.totalPnl,
        accountCount: 2,
        maxPositionPercent: 0,
        currency: 'CAD',
        scope: { type: 'ALL' }
      },
      pipeline,
      performance: {
        trades: this.analytics.summary.trades,
        wins: this.analytics.summary.wins,
        losses: this.analytics.summary.losses,
        breakeven: this.analytics.summary.breakeven,
        realizedPnl: this.analytics.summary.totalPnl,
        netExternalCapital: 0,
        realizedEquity: this.analytics.summary.totalPnl,
        winRate: this.analytics.summary.winRate,
        profitFactor: this.analytics.summary.profitFactor,
        averageR: this.analytics.summary.averageR,
        totalR: this.analytics.summary.totalR
      },
      topMomentum: this.momentumRankingItems.slice(0, 5).map((item, index) => ({
        rank: index + 1,
        ticker: item.ticker,
        score: item.momentumScore,
        price: item.price,
        high52: item.high52,
        relativeVolume: item.relativeVolume,
        rsi: item.rsi,
        reviewStatus: item.reviewStatus
      })),
      watchlistPreview: activeWatchlist
        .filter((item) => item.status !== 'REJECTED')
        .slice(0, 5)
        .map((item) => ({
          ticker: item.ticker,
          currentPrice: item.currentPrice,
          signalPrice: item.signalPrice,
          changeSinceSignal:
            item.currentPrice !== null && item.signalPrice !== null
              ? item.currentPrice / item.signalPrice - 1
              : null,
          breakoutLevel: item.breakoutLevel,
          distanceToBreakout:
            item.breakoutLevel !== null && item.currentPrice !== null
              ? (item.currentPrice - item.breakoutLevel) / item.breakoutLevel
              : null,
          setupStatus: item.setupStatus,
          status: item.status
        })),
      openPositionsPreview: openPositions.slice(0, 5).map((item) => ({
        ticker: item.ticker,
        actualEntry: item.actualEntry,
        currentPrice: item.currentPrice,
        currentStop: item.currentStop,
        target: item.target,
        actualQuantity: item.actualQuantity,
        unrealizedPnl: item.unrealizedPnl,
        unrealizedPnlPercent: item.unrealizedPnlPercent
      })),
      actions: {
        nearBreakout,
        ready: ready.map((item) => ({
          ticker: item.ticker,
          currentPrice: item.currentPrice,
          breakoutLevel: item.breakoutLevel,
          setupStatus: item.setupStatus
        })),
        openPositions: openPositions.map((item) => ({
          ticker: item.ticker,
          actualEntry: item.actualEntry,
          currentPrice: item.currentPrice,
          currentStop: item.currentStop,
          unrealizedPnlPercent: item.unrealizedPnlPercent,
          stopDistance:
            item.currentPrice !== null && item.currentPrice > 0 && item.currentStop !== null
              ? (item.currentPrice - item.currentStop) / item.currentPrice
              : null
        }))
      }
    };
  }

  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ...DEVELOPMENT_SUMMARY, generatedAt: new Date().toISOString() };
  }

  async refreshFinviz(): Promise<number> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return 2;
  }

  async getAnalytics(): Promise<AnalyticsDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ...this.analytics, generatedAt: new Date().toISOString() };
  }

  async getWatchlist(): Promise<WatchlistDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.watchlistItems.map((item) => ({ ...item }))
    };
  }

  async getMomentumRanking(): Promise<MomentumRankingDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.momentumRankingItems.map((item) => ({ ...item }))
    };
  }

  async getTradingAccounts(): Promise<TradingAccountsDto> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      accounts: this.accounts.map(({ id, name, baseCurrency, riskPercentPerTrade }) => ({
        id,
        name,
        baseCurrency,
        riskPercentPerTrade
      }))
    };
  }

  async getAdminOverview(): Promise<AdminOverviewDto> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      finviz: { configured: this.finvizConfigured },
      accounts: this.accounts.map((account) => ({
        ...account,
        financialSummary: { ...account.financialSummary },
        capitalTransactions: account.capitalTransactions.map((transaction) => ({ ...transaction }))
      }))
    };
  }

  async getTradingConfig(): Promise<TradingConfigDto> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ...this.tradingConfig };
  }

  async setupMomentumRanking(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  async refreshMomentumRanking(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  async addMomentumCandidateToWatchlist(
    request: AddMomentumCandidateToWatchlistRequest
  ): Promise<AddMomentumCandidateToWatchlistResponse> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const candidate = this.momentumRankingItems.find(
      (item) =>
        item.strategyId === request.strategyId &&
        item.strategyVersion === request.strategyVersion &&
        item.signalDate === request.signalDate &&
        item.ticker === request.ticker
    );
    if (!candidate) throw new Error(`Development Momentum candidate not found: ${request.ticker}`);

    const existing = this.watchlistItems.find(
      (item) =>
        item.strategyId === candidate.strategyId &&
        item.strategyVersion === candidate.strategyVersion &&
        item.ticker === candidate.ticker &&
        !['CLOSED', 'REJECTED'].includes(item.status.toUpperCase())
    );
    if (existing) {
      candidate.watchlistStatus = existing.status;
      return {
        kind: 'duplicate',
        watchlistId: existing.id,
        ticker: existing.ticker,
        status: existing.status
      };
    }

    const watchlistId = `W-${candidate.ticker}-${candidate.signalDate}`;
    this.watchlistItems.push({
      id: watchlistId,
      ticker: candidate.ticker,
      company: candidate.company,
      sector: candidate.sector,
      strategyId: candidate.strategyId,
      strategyName: candidate.strategyName,
      strategyVersion: candidate.strategyVersion,
      signalDate: candidate.signalDate,
      signalPrice: candidate.price,
      currentPrice: candidate.price,
      momentumScore: candidate.momentumScore,
      status: 'WATCHING',
      setupStatus: '',
      breakoutLevel: null,
      invalidationLevel: null,
      earningsDate: null,
      eventRisk: null,
      notes: 'Added from Discovery mock'
    });
    candidate.watchlistStatus = 'WATCHING';
    return {
      kind: 'added',
      watchlistId,
      ticker: candidate.ticker,
      status: 'WATCHING'
    };
  }

  async setupStrategies(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  async validateStrategies(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return true;
  }

  async setupCockpitConfig(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  async setupTradingAccounts(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  async createTradingAccount(
    request: CreateTradingAccountRequest
  ): Promise<TradingAccountMutationResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      id: request.accountId.trim().toUpperCase(),
      name: request.name.trim(),
      baseCurrency: request.baseCurrency.trim().toUpperCase(),
      riskPercentPerTrade: request.riskPercentPerTrade
    };
  }

  async createFundedTradingAccount(
    request: CreateFundedTradingAccountRequest
  ): Promise<TradingAccountMutationResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const account: AdminAccountDto = {
      id: request.accountId.trim().toUpperCase(),
      name: request.name.trim(),
      baseCurrency: request.baseCurrency.trim().toUpperCase(),
      riskPercentPerTrade: request.riskPercentPerTrade,
      financialSummary: {
        initialFunding: request.initialAmount,
        deposits: 0,
        withdrawals: 0,
        netExternalCapital: request.initialAmount,
        realizedPnl: 0,
        realizedEquity: request.initialAmount
      },
      capitalTransactions: [
        {
          transactionId: `CT-INITIAL_FUNDING-${request.accountId}-${Date.now()}`,
          accountId: request.accountId.trim().toUpperCase(),
          type: 'INITIAL_FUNDING',
          amount: request.initialAmount,
          occurredAt: new Date().toISOString(),
          note: 'Initial funding'
        }
      ]
    };
    this.accounts.push(account);
    return account;
  }

  async updateTradingAccount(
    request: UpdateTradingAccountRequest
  ): Promise<TradingAccountMutationResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const updated = {
      id: request.accountId.trim().toUpperCase(),
      name: request.name.trim(),
      baseCurrency: request.baseCurrency.trim().toUpperCase(),
      riskPercentPerTrade: request.riskPercentPerTrade
    };
    this.accounts = this.accounts.map((account) =>
      account.id === updated.id ? { ...account, ...updated } : account
    );
    return updated;
  }

  async recordCapitalTransaction(
    request: RecordCapitalTransactionRequest
  ): Promise<RecordCapitalTransactionResponse> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const transaction: CapitalTransactionDto = {
      transactionId: `CT-${request.type}-${request.accountId}-${Date.now()}`,
      accountId: request.accountId,
      type: request.type,
      amount: request.amount,
      occurredAt: new Date().toISOString(),
      note: request.note ?? ''
    };
    const account = this.accounts.find((candidate) => candidate.id === request.accountId);
    if (account) {
      account.capitalTransactions.unshift(transaction);
      if (request.type === 'DEPOSIT') account.financialSummary.deposits += request.amount;
      if (request.type === 'WITHDRAWAL') account.financialSummary.withdrawals += request.amount;
      account.financialSummary.netExternalCapital =
        account.financialSummary.initialFunding +
        account.financialSummary.deposits -
        account.financialSummary.withdrawals;
      account.financialSummary.realizedEquity =
        account.financialSummary.netExternalCapital + account.financialSummary.realizedPnl;
    }
    return transaction;
  }

  async checkFinvizAuth(): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return this.finvizConfigured;
  }

  async setFinvizToken(token: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.finvizConfigured = Boolean(token?.trim());
  }

  async deleteFinvizToken(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    this.finvizConfigured = false;
  }

  async createTradePlan(request: CreateTradePlanRequest): Promise<CreateTradePlanResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const candidate = this.watchlistItems.find((item) => item.id === request.watchlistId);
    if (!candidate) throw new Error(`Development candidate not found: ${request.watchlistId}`);
    candidate.status = 'PLANNED';
    const tradePlanId = `DEMO-TP-${candidate.ticker}-${request.accountId}`;
    return {
      kind: 'created',
      tradePlanId,
      watchlistId: candidate.id,
      ticker: candidate.ticker,
      accountId: request.accountId,
      status: 'DRAFT'
    };
  }

  async getTradePlans(): Promise<TradePlansDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.tradePlanItems.map((item) => ({ ...item }))
    };
  }

  async executeTradePlan(request: ExecuteTradePlanRequest): Promise<ExecuteTradePlanResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const plan = this.tradePlanItems.find((item) => item.id === request.tradePlanId);
    if (!plan) throw new Error(`Development Trade Plan not found: ${request.tradePlanId}`);
    plan.status = 'EXECUTED';
    return {
      kind: 'opened',
      positionId: `DEMO-P-${plan.ticker}-${plan.accountId}`,
      tradePlanId: plan.id,
      accountId: plan.accountId,
      ticker: plan.ticker,
      openedAt: new Date().toISOString(),
      actualEntry: plan.entryPrice,
      actualQuantity: plan.positionSize,
      positionStatus: 'OPEN'
    };
  }

  async getOpenPositions(): Promise<OpenPositionsDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.positionItems.map((item) => ({ ...item }))
    };
  }

  async closePosition(request: ClosePositionRequest): Promise<ClosePositionResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const index = this.positionItems.findIndex((position) => position.id === request.positionId);
    if (index < 0) throw new Error(`Development Position not found: ${request.positionId}`);
    const [position] = this.positionItems.splice(index, 1);
    return {
      positionId: position.id,
      accountId: position.accountId,
      ticker: position.ticker,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      exitPrice: request.exitPrice,
      realizedPnl: null,
      journalCreated: true
    };
  }

  async getJournal(): Promise<JournalDto> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      generatedAt: new Date().toISOString(),
      items: this.journalItems.map((item) => ({ ...item }))
    };
  }

  async updateTradePlanPlanning(
    request: UpdateTradePlanPlanningRequest
  ): Promise<UpdateTradePlanPlanningResponse> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const plan = this.tradePlanItems.find((item) => item.id === request.tradePlanId);
    if (!plan) throw new Error(`Development Trade Plan not found: ${request.tradePlanId}`);
    plan.entryPrice = request.entryPrice;
    plan.stopPrice = request.stopPrice;
    plan.targetPrice = request.targetPrice;
    plan.executionEligibility = { eligible: true, reason: null };
    return { tradePlanId: plan.id, status: plan.status };
  }
}
