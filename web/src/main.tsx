import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createCockpitGateway } from './app/create-cockpit-gateway';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('React root element is missing.');

createRoot(container).render(
  <StrictMode>
    <App gateway={createCockpitGateway()} development={import.meta.env.DEV} />
  </StrictMode>
);
