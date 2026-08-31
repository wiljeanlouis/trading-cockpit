export interface GoogleIdentityCredentialResponse {
  credential?: string;
}

export interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleIdentityCredentialResponse) => void;
        auto_select?: boolean;
      }): void;
      renderButton(
        parent: HTMLElement,
        options: {
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
          width?: number;
        }
      ): void;
      disableAutoSelect(): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'trading-cockpit-google-identity';
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

export function loadGoogleIdentityScript(): Promise<GoogleIdentityApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    script.id = GOOGLE_IDENTITY_SCRIPT_ID;
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google);
      } else {
        reject(new Error('Google Identity Services did not initialize.'));
      }
    };
    script.onerror = () => reject(new Error('Unable to load Google Identity Services.'));
    if (!existing) document.head.appendChild(script);
  });
}
