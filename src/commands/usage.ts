import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register usage commands: usage:stats, usage:x-pricing */
export function registerUsageCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'usage:stats',
      'Get usage statistics for your account',
      (y) => y.option('reconcile', { type: 'boolean', describe: 'Recompute usage from source instead of cached counters' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.reconcile !== undefined) query.reconcile = argv.reconcile;
          const { data } = await late.usage.getUsageStats({ query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'usage:x-pricing',
      'Get current X (Twitter) API pricing',
      (y) => y,
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.usage.getXApiPricing();
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
