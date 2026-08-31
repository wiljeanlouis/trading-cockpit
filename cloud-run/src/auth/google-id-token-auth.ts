import { OAuth2Client } from 'google-auth-library';

export interface AuthenticatedPrincipal {
  email: string;
  subject: string;
}

export interface GoogleTokenPayload {
  audience: string;
  email: string;
  emailVerified: boolean;
  issuer: string;
  subject: string;
}

export interface GoogleIdTokenVerifier {
  verify(idToken: string, audience: string): Promise<GoogleTokenPayload>;
}

export class GoogleAuthLibraryIdTokenVerifier implements GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  async verify(idToken: string, audience: string): Promise<GoogleTokenPayload> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Google ID token has no payload.');
    }

    return {
      audience: String(payload.aud ?? ''),
      email: String(payload.email ?? ''),
      emailVerified: payload.email_verified === true,
      issuer: String(payload.iss ?? ''),
      subject: String(payload.sub ?? '')
    };
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Forbidden.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export async function authenticateGoogleBearerToken(dependencies: {
  authorizationHeader: string | undefined;
  googleClientId: string;
  allowedEmails: readonly string[];
  verifier: GoogleIdTokenVerifier;
}): Promise<AuthenticatedPrincipal> {
  const token = readBearerToken(dependencies.authorizationHeader);
  const payload = await verifyToken({
    token,
    audience: dependencies.googleClientId,
    verifier: dependencies.verifier
  });

  if (!payload.email || !payload.subject) {
    throw new AuthenticationError('Google ID token is missing required identity claims.');
  }

  if (!payload.emailVerified) {
    throw new AuthenticationError('Google account email must be verified.');
  }

  const allowedEmails = new Set(dependencies.allowedEmails.map((email) => email.toLowerCase()));
  if (!allowedEmails.has(payload.email.toLowerCase())) {
    throw new AuthorizationError('Authenticated user is not authorized for Trading Cockpit.');
  }

  return {
    email: payload.email,
    subject: payload.subject
  };
}

async function verifyToken(dependencies: {
  token: string;
  audience: string;
  verifier: GoogleIdTokenVerifier;
}): Promise<GoogleTokenPayload> {
  try {
    const payload = await dependencies.verifier.verify(dependencies.token, dependencies.audience);
    if (!isAllowedIssuer(payload.issuer)) {
      throw new AuthenticationError('Google ID token issuer is not trusted.');
    }
    if (payload.audience !== dependencies.audience) {
      throw new AuthenticationError('Google ID token audience does not match this application.');
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError('Invalid Google ID token.');
  }
}

function readBearerToken(authorizationHeader: string | undefined): string {
  if (!authorizationHeader) {
    throw new AuthenticationError('Authorization header is required.');
  }

  const [scheme, token, ...extra] = authorizationHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    throw new AuthenticationError('Authorization header must use Bearer token authentication.');
  }

  return token;
}

function isAllowedIssuer(issuer: string): boolean {
  return issuer === 'https://accounts.google.com' || issuer === 'accounts.google.com';
}
