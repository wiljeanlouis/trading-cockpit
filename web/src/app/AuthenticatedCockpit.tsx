import { useEffect, useMemo, useRef, useState } from 'react';
import { App } from './App';
import { Button } from '../components/ui/button';
import { HttpCockpitGateway } from '../infrastructure/http/http-cockpit-gateway';
import {
  loadGoogleIdentityScript,
  type GoogleIdentityApi,
  type GoogleIdentityCredentialResponse
} from '../infrastructure/auth/google-identity';

type AuthState =
  | { status: 'initializing'; token: null; error: null }
  | { status: 'unauthenticated'; token: null; error: string | null }
  | { status: 'authenticated'; token: string; error: null }
  | { status: 'failure'; token: null; error: string };

export function AuthenticatedCockpit() {
  const clientId = import.meta.env.VITE_TRADING_COCKPIT_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const googleRef = useRef<GoogleIdentityApi | null>(null);
  const [auth, setAuth] = useState<AuthState>({
    status: 'initializing',
    token: null,
    error: null
  });

  useEffect(() => {
    let active = true;
    if (!clientId) {
      setAuth({
        status: 'failure',
        token: null,
        error: 'Google OAuth client ID is missing.'
      });
      return;
    }

    loadGoogleIdentityScript()
      .then((google) => {
        if (!active) return;
        googleRef.current = google;
        google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          callback: (response) => {
            handleCredential(response, setAuth);
          }
        });
        if (buttonRef.current) {
          buttonRef.current.replaceChildren();
          google.accounts.id.renderButton(buttonRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            width: 280
          });
        }
        setAuth({ status: 'unauthenticated', token: null, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuth({
          status: 'failure',
          token: null,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  const gateway = useMemo(
    () =>
      auth.status === 'authenticated'
        ? new HttpCockpitGateway({
            getIdToken: () => auth.token,
            onUnauthorized: () => {
              googleRef.current?.accounts.id.disableAutoSelect();
              setAuth({
                status: 'unauthenticated',
                token: null,
                error: 'Your Google session expired. Please sign in again.'
              });
            }
          })
        : null,
    [auth]
  );

  if (auth.status === 'authenticated' && gateway) {
    return <App gateway={gateway} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_85%_0%,#132844_0,#07101d_34%)] px-6 py-10 text-[#d6e5f4]">
      <section className="w-full max-w-[460px] rounded-[24px] border border-[#1c3045] bg-[rgba(7,15,28,0.88)] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <span className="mx-auto mb-5 grid size-[48px] place-items-center rounded-[13px] bg-[#4ee1a0] text-[15px] font-black text-[#04111a] shadow-[0_0_28px_rgba(78,225,160,0.22)]">
          TC
        </span>
        <p className="mb-2 text-[10px] font-extrabold tracking-[0.18em] text-[#4ee1a0] uppercase">
          Trading Cockpit
        </p>
        <h1 className="mb-3 text-[clamp(30px,5vw,42px)] font-bold tracking-[-0.04em]">Sign in</h1>
        <p className="mx-auto mb-7 max-w-[340px] text-sm leading-6 text-[#8392a9]">
          Use your authorized Google account to open the Cloud Run Cockpit.
        </p>

        {auth.status === 'initializing' && (
          <p className="text-sm text-[#8392a9]" aria-live="polite">
            Initializing Google sign-in…
          </p>
        )}

        <div
          ref={buttonRef}
          className={auth.status === 'initializing' || auth.status === 'failure' ? 'hidden' : ''}
        />

        {auth.status === 'failure' && (
          <div className="space-y-4" role="alert">
            <p className="text-sm text-[#ffb9b9]">{auth.error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {auth.status === 'unauthenticated' && auth.error && (
          <p className="mt-5 text-sm text-[#ffcf8a]" role="alert">
            {auth.error}
          </p>
        )}
      </section>
    </main>
  );
}

function handleCredential(
  response: GoogleIdentityCredentialResponse,
  setAuth: (state: AuthState) => void
): void {
  const token = String(response.credential ?? '').trim();
  if (!token) {
    setAuth({
      status: 'failure',
      token: null,
      error: 'Google sign-in did not return an ID token.'
    });
    return;
  }
  setAuth({ status: 'authenticated', token, error: null });
}
