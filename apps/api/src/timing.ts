import { performance } from 'node:perf_hooks';

export function nowMs(): number {
  return performance.now();
}

export function elapsedMs(startMs: number): number {
  return Math.max(performance.now() - startMs, 0);
}

export function serverTimingHeader(timings: {
  sheetsMs: number;
  mappingMs: number;
  totalMs: number;
}): string {
  return [
    `sheets;dur=${timings.sheetsMs.toFixed(1)}`,
    `mapping;dur=${timings.mappingMs.toFixed(1)}`,
    `total;dur=${timings.totalMs.toFixed(1)}`
  ].join(', ');
}
