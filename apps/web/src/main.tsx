import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { AuthenticatedCockpit } from './app/AuthenticatedCockpit';
import { createCockpitGateway } from './app/create-cockpit-gateway';
import './styles.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('React root element is missing.');
}

const useMockGateway = shouldUseMockGateway();

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      {useMockGateway ? (
        <App gateway={createCockpitGateway()} development />
      ) : (
        <AuthenticatedCockpit />
      )}
    </HashRouter>
  </StrictMode>
);

function shouldUseMockGateway(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  const gatewayMode = String(
    import.meta.env.VITE_TRADING_COCKPIT_GATEWAY ?? 'mock'
  )
    .trim()
    .toLowerCase();

  if (gatewayMode === 'mock') {
    return true;
  }

  if (gatewayMode === 'http') {
    return false;
  }

  throw new Error(
    `Unsupported VITE_TRADING_COCKPIT_GATEWAY value: ${gatewayMode}. Expected "mock" or "http".`
  );
}