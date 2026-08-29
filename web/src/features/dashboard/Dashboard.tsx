import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummaryDto } from '@trading-cockpit/contracts';
import type { CockpitGateway } from '../../infrastructure/cockpit-gateway';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  gateway: CockpitGateway;
}

interface DashboardState {
  summary: DashboardSummaryDto | null;
  loading: boolean;
  error: string | null;
}

const METRICS: Array<{ key: keyof DashboardSummaryDto; label: string; detail: string }> = [
  { key: 'signals', label: 'Signals', detail: 'Latest momentum snapshot' },
  { key: 'watchlist', label: 'Watchlist', detail: 'Tracked candidates' },
  { key: 'ready', label: 'Ready', detail: 'Candidates ready to plan' },
  { key: 'activeTradePlans', label: 'Trade plans', detail: 'Draft or ready' },
  { key: 'openPositions', label: 'Open positions', detail: 'Currently open' },
  { key: 'closedTrades', label: 'Closed trades', detail: 'Journal entries' }
];

function formattedTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function Dashboard({ gateway }: DashboardProps) {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    loading: true,
    error: null
  });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const summary = await gateway.getDashboardSummary();
      setState({ summary, loading: false, error: null });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }, [gateway]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-[1260px] px-12 pt-12 pb-16 max-[900px]:px-[26px] max-[900px]:py-9">
      <header className="mb-[38px] flex items-end justify-between gap-8 max-[620px]:flex-col max-[620px]:items-start">
        <div>
          <p className="mb-2 text-[10px] font-extrabold tracking-[0.18em] text-[#4ee1a0] uppercase">
            Trading overview
          </p>
          <h1 className="mb-2 text-[clamp(32px,4vw,48px)] font-bold tracking-[-0.04em]">
            Dashboard
          </h1>
          <p className="m-0 text-sm text-[#7f8fa6]">Live workflow counts from Trading Cockpit</p>
        </div>
        <div className="flex items-center gap-4 max-[620px]:flex-col max-[620px]:items-start">
          {state.summary && (
            <p className="m-0 text-[11px] text-[#6f8098]">
              Updated {formattedTimestamp(state.summary.generatedAt)}
            </p>
          )}
          <Button onClick={() => void load()} disabled={state.loading}>
            <span aria-hidden="true">↻</span>
            {state.loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </div>
      </header>

      {state.loading && !state.summary && (
        <section
          className="flex min-h-[220px] items-center justify-center gap-3 rounded-[14px] border border-[#1c3045] bg-[rgba(11,23,38,0.75)] text-[#8495ac]"
          aria-live="polite"
        >
          <span
            className="size-[18px] animate-spin rounded-full border-2 border-[#27413f] border-t-[#4ee1a0]"
            aria-hidden="true"
          />
          Loading cockpit data…
        </section>
      )}

      {state.error && (
        <section
          className="flex min-h-[220px] items-center justify-between gap-3 rounded-[14px] border border-[#61343a] bg-[rgba(61,23,31,0.45)] p-6 text-[#ffb9b9]"
          role="alert"
        >
          <div>
            <strong>Dashboard unavailable</strong>
            <p className="mt-1.5 mb-0 text-[#bd8a90]">{state.error}</p>
          </div>
          <Button variant="retry" onClick={() => void load()}>
            Try again
          </Button>
        </section>
      )}

      {state.summary && (
        <>
          <section
            className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1"
            aria-label="Trading workflow summary"
          >
            {METRICS.map((metric) => (
              <article
                className="relative min-h-[170px] overflow-hidden rounded-[14px] border border-[#1d3045] bg-[linear-gradient(145deg,rgba(18,32,50,0.92),rgba(11,23,38,0.9))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition hover:-translate-y-px hover:border-[#2c4b56]"
                key={metric.key}
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,#4ee1a0,transparent_70%)]" />
                <p className="mb-[18px] text-[11px] font-extrabold tracking-[0.12em] text-[#8393a9] uppercase">
                  {metric.label}
                </p>
                <strong className="mb-3 block text-[42px] tracking-[-0.05em] text-[#f5f8fc] tabular-nums">
                  {state.summary?.[metric.key]}
                </strong>
                <span className="text-[11px] text-[#60728b]">{metric.detail}</span>
              </article>
            ))}
          </section>

          <section className="mt-5 flex items-center justify-between gap-7 rounded-[14px] border border-[#1b2b3f] bg-[rgba(10,22,37,0.72)] px-7 py-[26px] max-[900px]:flex-col max-[900px]:items-start">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.18em] text-[#4ee1a0] uppercase">
                Workflow pulse
              </p>
              <h2 className="m-0 text-xl font-bold">From signal to closed trade</h2>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-[#8da0b8] max-[620px]:flex-wrap">
              <span>Signals</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Watchlist</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Plans</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Positions</span>
              <i className="h-px w-[18px] bg-[#31524d]" />
              <span>Journal</span>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
