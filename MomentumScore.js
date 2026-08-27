function score52WeekHigh(value) {
  if (value === null) {
    return 0;
  }

  const distance =
    Math.abs(value);

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


function scoreRelativeVolume(value) {
  if (value === null) {
    return 0;
  }

  if (value >= 2.0) {
    return 25;
  }

  if (value >= 1.5) {
    return 20;
  }

  if (value >= 1.25) {
    return 15;
  }

  if (value >= 1.0) {
    return 10;
  }

  return 0;
}


function scoreMonthlyPerformance(value) {
  if (value === null) {
    return 0;
  }

  if (value >= 0.20) {
    return 20;
  }

  if (value >= 0.15) {
    return 17;
  }

  if (value >= 0.10) {
    return 14;
  }

  if (value >= 0.05) {
    return 10;
  }

  if (value >= 0) {
    return 5;
  }

  return 0;
}


function scoreRsi(value) {
  if (value === null) {
    return 0;
  }

  if (
    value >= 60 &&
    value <= 67
  ) {
    return 15;
  }

  if (
    value >= 55 &&
    value < 60
  ) {
    return 12;
  }

  if (
    value > 67 &&
    value <= 70
  ) {
    return 10;
  }

  if (
    value >= 50 &&
    value < 55
  ) {
    return 7;
  }

  return 0;
}


function scoreSma20(value) {
  if (value === null) {
    return 0;
  }

  if (
    value >= 0.02 &&
    value <= 0.08
  ) {
    return 15;
  }

  if (
    value >= 0 &&
    value < 0.02
  ) {
    return 10;
  }

  if (
    value > 0.08 &&
    value <= 0.12
  ) {
    return 10;
  }

  if (value > 0.12) {
    return 5;
  }

  return 0;
}