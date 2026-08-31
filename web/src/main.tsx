import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { AuthenticatedCockpit } from './app/AuthenticatedCockpit';
import { createCockpitGateway } from './app/create-cockpit-gateway';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('React root element is missing.');

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      {import.meta.env.DEV ? (
        <App gateway={createCockpitGateway()} development />
      ) : (
        <AuthenticatedCockpit />
      )}
    </HashRouter>
  </StrictMode>
);
