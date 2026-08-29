import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import type { CockpitGateway } from '../infrastructure/cockpit-gateway';
import { Dashboard } from '../features/dashboard/Dashboard';
import { Watchlist } from '../features/watchlist/Watchlist';
import { TradePlans } from '../features/trade-plans/TradePlans';
import { Positions } from '../features/positions/Positions';
import { Journal } from '../features/journal/Journal';

interface AppProps {
  gateway: CockpitGateway;
  development?: boolean;
}

const navBaseClassName =
  'flex min-h-11 w-full items-center gap-3 rounded-[9px] px-3 text-left text-sm text-[#93a2b8] no-underline transition-colors hover:bg-[rgba(78,225,160,0.06)] hover:text-[#d6e5f4] max-[900px]:justify-center max-[900px]:px-0 max-[900px]:text-[0px] max-[900px]:[&>span]:text-xl';

function navClassName({ isActive }: { isActive: boolean }): string {
  return `${navBaseClassName} ${
    isActive
      ? 'bg-[linear-gradient(90deg,rgba(78,225,160,0.16),rgba(78,225,160,0.04))] text-[#eafff5] shadow-[inset_3px_0_#4ee1a0]'
      : ''
  }`;
}

export function App({ gateway, development = false }: AppProps) {
  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr] bg-[radial-gradient(circle_at_85%_0%,#132844_0,#07101d_34%)] max-[900px]:grid-cols-[84px_1fr] max-[620px]:block">
      <aside className="sticky top-0 flex h-screen flex-col border-r border-[#1c2a3d] bg-[rgba(7,15,28,0.92)] px-5 py-7 backdrop-blur-2xl max-[900px]:px-3 max-[620px]:static max-[620px]:h-auto max-[620px]:w-full max-[620px]:flex-row max-[620px]:px-[18px] max-[620px]:py-[14px]">
        <div className="flex items-center gap-3 px-2 pb-8 max-[900px]:justify-center max-[900px]:px-0 max-[620px]:p-0">
          <span className="grid size-[38px] place-items-center rounded-[10px] bg-[#4ee1a0] text-[13px] font-black text-[#04111a] shadow-[0_0_28px_rgba(78,225,160,0.22)]">
            TC
          </span>
          <div>
            <strong className="block text-[13px] tracking-[0.12em] uppercase max-[900px]:hidden">
              Trading
            </strong>
            <span className="block text-[10px] tracking-[0.12em] text-[#71819a] uppercase max-[900px]:hidden">
              Cockpit
            </span>
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="max-[620px]:ml-auto max-[620px]:flex max-[620px]:gap-2"
        >
          <p className="mx-[10px] mt-5 mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#566780] uppercase max-[900px]:hidden">
            Trading
          </p>
          <NavLink to="/" end className={navClassName}>
            <span aria-hidden="true">⌁</span>
            Dashboard
          </NavLink>
          <NavLink to="/watchlist" className={navClassName}>
            <span aria-hidden="true">◉</span>
            Watchlist
          </NavLink>
          <NavLink to="/trade-plans" className={navClassName}>
            <span aria-hidden="true">◇</span>
            Trade Plans
          </NavLink>
          <NavLink to="/positions" className={navClassName}>
            <span aria-hidden="true">↗</span>
            Positions
          </NavLink>
          <NavLink to="/journal" className={navClassName}>
            <span aria-hidden="true">▤</span>
            Journal
          </NavLink>
          <div className="mx-2 mt-6 mb-[10px] h-px bg-[#1a293c] max-[620px]:hidden" />
          <p className="mx-[10px] mt-5 mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[#566780] uppercase max-[900px]:hidden">
            Administration
          </p>
          <span
            className={`${navBaseClassName} cursor-default opacity-50 max-[620px]:hidden`}
            aria-disabled="true"
          >
            <span aria-hidden="true">⚙</span>
            Administration
            <small className="ml-auto text-[9px] tracking-[0.1em] text-[#687a92] uppercase max-[900px]:hidden">
              Later
            </small>
          </span>
        </nav>

        <div className="mt-auto flex items-center gap-2 border-t border-[#17263a] px-[10px] pt-4 text-[11px] text-[#71819a] max-[900px]:hidden">
          <span className="size-[7px] rounded-full bg-[#4ee1a0] shadow-[0_0_10px_#4ee1a0]" />
          Apps Script backend
        </div>
      </aside>

      <div className="min-w-0">
        {development && (
          <div className="bg-[#e7b84b] px-6 py-[7px] text-center text-[11px] font-extrabold tracking-[0.08em] text-[#201600] uppercase">
            Development mock data
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard gateway={gateway} />} />
          <Route path="/watchlist" element={<Watchlist gateway={gateway} />} />
          <Route path="/trade-plans" element={<TradePlans gateway={gateway} />} />
          <Route path="/positions" element={<Positions gateway={gateway} />} />
          <Route path="/journal" element={<Journal gateway={gateway} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
