import type { AuthenticatedPrincipal } from '../auth/google-id-token-auth';

export interface RequestContext {
  principal: AuthenticatedPrincipal;
}
