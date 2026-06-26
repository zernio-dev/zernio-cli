import { LateApiError } from '@zernio/node';
import { outputError } from './output.js';

const HINT_401 =
  'The Zernio API key is accepted, but the underlying social-platform token ' +
  'may have expired or lost permission. Run "zernio accounts:health" to check ' +
  'account status. If the account shows tokenValid: false or needsReconnect: true, ' +
  'reconnect it in the Zernio dashboard. If accounts:health still reports healthy, ' +
  'contact Zernio support with the request details.';

/**
 * Handle errors from SDK calls.
 * LateApiError instances get structured JSON output; everything else gets a generic message.
 * 401 responses include an actionable hint (see #3).
 */
export function handleError(err: unknown): never {
  if (err instanceof LateApiError) {
    if (err.statusCode === 401) {
      outputError(err.message, err.statusCode, { hint: HINT_401 });
    }
    outputError(err.message, err.statusCode);
  }
  outputError((err as Error).message);
}
