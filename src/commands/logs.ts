import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register logs commands: logs:list */
export function registerLogsCommands(yargs: Argv): Argv {
  return yargs.command(
    'logs:list',
    'List activity logs',
    (y) =>
      y
        .option('type', { type: 'string', describe: 'Filter by log type' })
        .option('status', { type: 'string', describe: 'Filter by status' })
        .option('platform', { type: 'string', describe: 'Filter by platform' })
        .option('action', { type: 'string', describe: 'Filter by action' })
        .option('search', { type: 'string', describe: 'Search term' })
        .option('days', { type: 'number', describe: 'Look back this many days' })
        .option('limit', { type: 'number', describe: 'Max results', default: 50 })
        .option('skip', { type: 'number', describe: 'Skip N results', default: 0 }),
    async (argv) => {
      try {
        const late = createClient();
        const query: Record<string, unknown> = { limit: argv.limit, skip: argv.skip };
        for (const k of ['type', 'status', 'platform', 'action', 'search', 'days'] as const) {
          if (argv[k] !== undefined) query[k] = argv[k];
        }
        const { data } = await late.logs.listLogs({ query: query as any });
        output(data, argv.pretty as boolean);
      } catch (err) {
        handleError(err);
      }
    },
  );
}
