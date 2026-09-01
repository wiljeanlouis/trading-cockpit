/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID?: string;
  readonly VITE_TRADING_COCKPIT_GATEWAY?: 'mock' | 'http';
  readonly VITE_TRADING_COCKPIT_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}