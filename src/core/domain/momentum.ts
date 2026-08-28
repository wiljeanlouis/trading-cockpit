export type MomentumMetric = number | null;
export type MomentumScoreInput = number | '' | null | undefined;

export interface MomentumCandidate {
  strategyId: string;
  strategy: string;
  strategyVersion: string;
  signalDate: string;
  ticker: string;
  company: unknown;
  sector: unknown;
  price: MomentumMetric;
  high52: MomentumMetric;
  relativeVolume: MomentumMetric;
  performanceMonth: MomentumMetric;
  rsi: MomentumMetric;
  sma20: MomentumMetric;
}

export interface RankedMomentumCandidate extends MomentumCandidate {
  high52Score: number;
  relativeVolumeScore: number;
  performanceScore: number;
  rsiScore: number;
  sma20Score: number;
  total: number;
}

export function score52WeekHigh(value: MomentumScoreInput): number {
  if (value === null) return 0;
  const distance = Math.abs(value as number);
  if (distance <= 0.01) return 25;
  if (distance <= 0.02) return 22;
  if (distance <= 0.03) return 18;
  if (distance <= 0.04) return 14;
  if (distance <= 0.05) return 10;
  return 0;
}

export function scoreRelativeVolume(value: MomentumScoreInput): number {
  if (value === null) return 0;
  if ((value as number) >= 2) return 25;
  if ((value as number) >= 1.5) return 20;
  if ((value as number) >= 1.25) return 15;
  if ((value as number) >= 1) return 10;
  return 0;
}

export function scoreMonthlyPerformance(value: MomentumScoreInput): number {
  if (value === null) return 0;
  if ((value as number) >= 0.2) return 20;
  if ((value as number) >= 0.15) return 17;
  if ((value as number) >= 0.1) return 14;
  if ((value as number) >= 0.05) return 10;
  if ((value as number) >= 0) return 5;
  return 0;
}

export function scoreRsi(value: MomentumScoreInput): number {
  if (value === null) return 0;
  if ((value as number) >= 60 && (value as number) <= 67) return 15;
  if ((value as number) >= 55 && (value as number) < 60) return 12;
  if ((value as number) > 67 && (value as number) <= 70) return 10;
  if ((value as number) >= 50 && (value as number) < 55) return 7;
  return 0;
}

export function scoreSma20(value: MomentumScoreInput): number {
  if (value === null) return 0;
  if ((value as number) >= 0.02 && (value as number) <= 0.08) return 15;
  if ((value as number) >= 0 && (value as number) < 0.02) return 10;
  if ((value as number) > 0.08 && (value as number) <= 0.12) return 10;
  if ((value as number) > 0.12) return 5;
  return 0;
}

export function rankMomentumCandidate(candidate: MomentumCandidate): RankedMomentumCandidate {
  const high52Score = score52WeekHigh(candidate.high52);
  const relativeVolumeScore = scoreRelativeVolume(candidate.relativeVolume);
  const performanceScore = scoreMonthlyPerformance(candidate.performanceMonth);
  const rsiScore = scoreRsi(candidate.rsi);
  const sma20Score = scoreSma20(candidate.sma20);

  return {
    ...candidate,
    high52Score,
    relativeVolumeScore,
    performanceScore,
    rsiScore,
    sma20Score,
    total: high52Score + relativeVolumeScore + performanceScore + rsiScore + sma20Score
  };
}
