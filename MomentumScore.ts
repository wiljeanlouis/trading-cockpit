// MomentumScore.js is generated from this file by `npm run build`.

type MomentumScoreInput = number | '' | null | undefined;

function score52WeekHigh(value: MomentumScoreInput): number {
  if (value === null) {
    return 0;
  }

  const distance = Math.abs(value as number);

  if (distance <= 0.01) {
    return 25;
  }

  if (distance <= 0.02) {
    return 22;
  }

  if (distance <= 0.03) {
    return 18;
  }

  if (distance <= 0.04) {
    return 14;
  }

  if (distance <= 0.05) {
    return 10;
  }

  return 0;
}

function scoreRelativeVolume(value: MomentumScoreInput): number {
  if (value === null) {
    return 0;
  }

  if ((value as number) >= 2.0) {
    return 25;
  }

  if ((value as number) >= 1.5) {
    return 20;
  }

  if ((value as number) >= 1.25) {
    return 15;
  }

  if ((value as number) >= 1.0) {
    return 10;
  }

  return 0;
}

function scoreMonthlyPerformance(value: MomentumScoreInput): number {
  if (value === null) {
    return 0;
  }

  if ((value as number) >= 0.2) {
    return 20;
  }

  if ((value as number) >= 0.15) {
    return 17;
  }

  if ((value as number) >= 0.1) {
    return 14;
  }

  if ((value as number) >= 0.05) {
    return 10;
  }

  if ((value as number) >= 0) {
    return 5;
  }

  return 0;
}

function scoreRsi(value: MomentumScoreInput): number {
  if (value === null) {
    return 0;
  }

  if ((value as number) >= 60 && (value as number) <= 67) {
    return 15;
  }

  if ((value as number) >= 55 && (value as number) < 60) {
    return 12;
  }

  if ((value as number) > 67 && (value as number) <= 70) {
    return 10;
  }

  if ((value as number) >= 50 && (value as number) < 55) {
    return 7;
  }

  return 0;
}

function scoreSma20(value: MomentumScoreInput): number {
  if (value === null) {
    return 0;
  }

  if ((value as number) >= 0.02 && (value as number) <= 0.08) {
    return 15;
  }

  if ((value as number) >= 0 && (value as number) < 0.02) {
    return 10;
  }

  if ((value as number) > 0.08 && (value as number) <= 0.12) {
    return 10;
  }

  if ((value as number) > 0.12) {
    return 5;
  }

  return 0;
}
