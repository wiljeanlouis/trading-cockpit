export const SIGNAL_HISTORY_BASE_HEADERS = [
  'Signal Date',
  'Detected At',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker'
] as const;

export const MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS = [
  'No.',
  'Finviz Ticker',
  'Company',
  'Sector',
  'Industry',
  'Country',
  'Market Cap',
  'P/E',
  'Price',
  'Change',
  'Volume',
  'Relative Volume',
  'Sales',
  'EPS this Y',
  'EPS next Y',
  'Performance (Month)',
  'Performance (Quarter)',
  'Performance (Half Year)',
  '52-Week High',
  'Relative Strength Index (14)',
  '20-Day Simple Moving Average'
] as const;

export const SIGNALS_HISTORY_HEADERS = [
  ...SIGNAL_HISTORY_BASE_HEADERS,
  ...MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS
] as const;
