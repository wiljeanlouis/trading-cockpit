export const SIGNAL_HISTORY_BASE_HEADERS = [
  'Signal Date',
  'Detected At',
  'Strategy ID',
  'Strategy',
  'Strategy Version',
  'Ticker'
] as const;

export const FINVIZ_MOMENTUM_EXPORT_HEADERS = [
  'No.',
  'Ticker',
  'Company',
  'Sector',
  'Industry',
  'Country',
  'Market Cap',
  'P/E',
  'Volume',
  'Price',
  'Change',
  'Average Volume',
  'Relative Volume',
  'Relative Strength Index (14)',
  '52-Week High',
  '20-Day Simple Moving Average',
  '200-Day Simple Moving Average',
  '50-Day Simple Moving Average',
  'Performance (Week)',
  'Performance (Month)',
  'Earnings Date'
] as const;

export function signalsHistoryHeaderForFinvizHeader(header: string): string {
  return header === 'Ticker' ? 'Finviz Ticker' : header;
}

export const MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS = FINVIZ_MOMENTUM_EXPORT_HEADERS.map(
  signalsHistoryHeaderForFinvizHeader
);

export const SIGNALS_HISTORY_HEADERS = [
  ...SIGNAL_HISTORY_BASE_HEADERS,
  ...MOMENTUM_BREAKOUT_SIGNAL_ATTRIBUTE_HEADERS
] as const;
