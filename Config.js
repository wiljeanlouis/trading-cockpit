// ============================================================
// CONFIGURATION
// ============================================================
const FINVIZ_BASE_URL =
  'https://elite.finviz.com/export/screener';

const SIGNALS_HISTORY_SHEET =
  'Signals History';

const MOMENTUM_RANKING_SHEET =
  'Momentum Ranking';

const MOMENTUM_SCORE_CONFIG_SHEET =
  'Momentum Score Config';

const WATCHLIST_SHEET =
  'Watchlist';  

const TRADE_PLANS_SHEET =
  'Trade Plans';

const POSITIONS_SHEET =
  'Positions';  

const JOURNAL_SHEET =
  'Journal';

const DASHBOARD_SHEET =
  'Dashboard';  

const COCKPIT_CONFIG_SHEET =
  'Cockpit Config';

const ANALYTICS_SHEET =
  'Analytics'; 

const STRATEGIES_SHEET =
  'Strategies';   

const SCREENERS = [
  {
    strategy: 'Momentum Breakout',
    version: 'V1',
    strategyId: 'MOMENTUM_BREAKOUT',
    sheetName: 'Finviz - Momentum',

    query:
      'v=151' +
      '&f=cap_smallover,sh_avgvol_o500,sh_price_o10,sh_relvol_o1,' +
      'ta_highlow52w_b0to5h,ta_perf_4wup,ta_rsi_50to70,' +
      'ta_sma20_pa,ta_sma200_pa,ta_sma50_pa' +
      '&ft=3' +
      '&c=0,1,2,3,4,5,6,7,67,65,66,63,64,59,57,52,54,53,42,43,68'
  }
];

const STRATEGY_HEADERS = [
  'Strategy ID',
  'Name',
  'Version',
  'Type',
  'Enabled',
  'Risk %',
  'Max Positions',
  'Description'
];
