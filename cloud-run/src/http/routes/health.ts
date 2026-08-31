import type { CloudRunHttpResponse } from '../../app';

export function handleHealth(): CloudRunHttpResponse {
  return {
    statusCode: 200,
    headers: {},
    body: { ok: true }
  };
}
