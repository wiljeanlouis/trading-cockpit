import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface MomentumScoring {
  score52WeekHigh(value: unknown): number;
  scoreRelativeVolume(value: unknown): number;
  scoreMonthlyPerformance(value: unknown): number;
  scoreRsi(value: unknown): number;
  scoreSma20(value: unknown): number;
}

const source = readFileSync(new URL('../MomentumScore.js', import.meta.url), 'utf8');

const loadMomentumScoring = new Function(
  `${source}\nreturn {` +
    'score52WeekHigh,' +
    'scoreRelativeVolume,' +
    'scoreMonthlyPerformance,' +
    'scoreRsi,' +
    'scoreSma20' +
    '};'
) as () => MomentumScoring;

const scoring = loadMomentumScoring();

describe('score52WeekHigh', () => {
  it.each([
    ['null', null, 0],
    ['empty string', '', 25],
    ['zero', 0, 25],
    ['negative 1% boundary', -0.01, 25],
    ['positive 1% boundary', 0.01, 25],
    ['just past 1%', -0.010001, 22],
    ['negative 2% boundary', -0.02, 22],
    ['just past 2%', -0.020001, 18],
    ['negative 3% boundary', -0.03, 18],
    ['just past 3%', -0.030001, 14],
    ['negative 4% boundary', -0.04, 14],
    ['just past 4%', -0.040001, 10],
    ['negative 5% boundary', -0.05, 10],
    ['past 5%', -0.050001, 0]
  ])('%s', (_label, value, expected) => {
    expect(scoring.score52WeekHigh(value)).toBe(expected);
  });
});

describe('scoreRelativeVolume', () => {
  it.each([
    ['null', null, 0],
    ['empty string', '', 0],
    ['2.0 boundary', 2, 25],
    ['just below 2.0', 1.999, 20],
    ['1.5 boundary', 1.5, 20],
    ['just below 1.5', 1.499, 15],
    ['1.25 boundary', 1.25, 15],
    ['just below 1.25', 1.249, 10],
    ['1.0 boundary', 1, 10],
    ['below 1.0', 0.999, 0]
  ])('%s', (_label, value, expected) => {
    expect(scoring.scoreRelativeVolume(value)).toBe(expected);
  });
});

describe('scoreMonthlyPerformance', () => {
  it.each([
    ['null', null, 0],
    ['empty string', '', 5],
    ['20% boundary', 0.2, 20],
    ['just below 20%', 0.19999, 17],
    ['15% boundary', 0.15, 17],
    ['just below 15%', 0.14999, 14],
    ['10% boundary', 0.1, 14],
    ['just below 10%', 0.09999, 10],
    ['5% boundary', 0.05, 10],
    ['just below 5%', 0.04999, 5],
    ['zero', 0, 5],
    ['negative performance', -0.001, 0]
  ])('%s', (_label, value, expected) => {
    expect(scoring.scoreMonthlyPerformance(value)).toBe(expected);
  });
});

describe('scoreRsi', () => {
  it.each([
    ['null', null, 0],
    ['empty string', '', 0],
    ['60 boundary', 60, 15],
    ['67 boundary', 67, 15],
    ['just below 60', 59.999, 12],
    ['55 boundary', 55, 12],
    ['just above 67', 67.001, 10],
    ['70 boundary', 70, 10],
    ['50 boundary', 50, 7],
    ['just below 55', 54.999, 7],
    ['below 50', 49.999, 0],
    ['above 70', 70.001, 0]
  ])('%s', (_label, value, expected) => {
    expect(scoring.scoreRsi(value)).toBe(expected);
  });
});

describe('scoreSma20', () => {
  it.each([
    ['null', null, 0],
    ['empty string', '', 10],
    ['2% boundary', 0.02, 15],
    ['8% boundary', 0.08, 15],
    ['just below 2%', 0.01999, 10],
    ['zero', 0, 10],
    ['just above 8%', 0.08001, 10],
    ['12% boundary', 0.12, 10],
    ['above 12%', 0.12001, 5],
    ['negative extension', -0.001, 0]
  ])('%s', (_label, value, expected) => {
    expect(scoring.scoreSma20(value)).toBe(expected);
  });
});
