import { AuthenticationError, AuthorizationError } from '../auth/google-id-token-auth';

export interface ApiErrorResponse {
  statusCode: number;
  body: {
    error: string;
  };
}

export function apiErrorResponse(error: unknown): ApiErrorResponse {
  if (error instanceof AuthenticationError) {
    return {
      statusCode: 401,
      body: { error: 'Authentication required.' }
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      statusCode: 403,
      body: { error: 'Forbidden.' }
    };
  }

  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      body: { error: error.message }
    };
  }

  if (error instanceof NotImplementedError) {
    return {
      statusCode: 501,
      body: { error: error.message }
    };
  }

  if (error instanceof Error) {
    const message = error.message;
    if (/introuvable|inconnue|absent ou vide|est absent/i.test(message)) {
      return { statusCode: 404, body: { error: message } };
    }
    if (/déjà|existe déjà|n'est plus modifiable|CANCELLED|EXECUTED|duplicate/i.test(message)) {
      return { statusCode: 409, body: { error: message } };
    }
    if (/doit|requis|invalide|supérieur|inférieur|aucun|aucune|obligatoire/i.test(message)) {
      return { statusCode: 422, body: { error: message } };
    }
  }

  return {
    statusCode: 500,
    body: { error: 'Unexpected Trading Cockpit server error.' }
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
