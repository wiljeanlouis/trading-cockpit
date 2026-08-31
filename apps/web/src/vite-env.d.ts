/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
