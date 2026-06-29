import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register analytics commands: analytics:posts, analytics:daily, analytics:best-time */
export function registerAnalyticsCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'analytics:posts',
      'Get post analytics',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('accountId', { type: 'string', describe: 'Filter by social account ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('postId', { type: 'string', describe: 'Get analytics for a specific post' })
          .option('source', { type: 'string', describe: 'Filter by source (late, external, all)' })
          .option('from', { type: 'string', describe: 'Start date (ISO 8601)' })
          .option('to', { type: 'string', describe: 'End date (ISO 8601)' })
          .option('sortBy', { type: 'string', describe: 'Sort by (date, engagement)', default: 'date' })
          .option('order', { type: 'string', describe: 'Sort order (asc, desc)', default: 'desc' })
          .option('page', { type: 'number', describe: 'Page number', default: 1 })
          .option('limit', { type: 'number', describe: 'Results per page', default: 50 }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {
            page: argv.page,
            limit: argv.limit,
            sortBy: argv.sortBy,
            order: argv.order,
          };
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.accountId) query.accountId = argv.accountId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.postId) query.postId = argv.postId;
          if (argv.source) query.source = argv.source;
          if (argv.from) query.fromDate = argv.from;
          if (argv.to) query.toDate = argv.to;

          const { data } = await late.analytics.getAnalytics({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'analytics:daily',
      'Get daily analytics metrics',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('accountId', { type: 'string', describe: 'Filter by social account ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('source', { type: 'string', describe: 'Filter by post origin (all, late, external)' })
          .option('from', { type: 'string', describe: 'Start date (ISO 8601)' })
          .option('to', { type: 'string', describe: 'End date (ISO 8601)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.accountId) query.accountId = argv.accountId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.source) query.source = argv.source;
          if (argv.from) query.fromDate = argv.from;
          if (argv.to) query.toDate = argv.to;

          const { data } = await late.analytics.getDailyMetrics({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'analytics:best-time',
      'Get best posting times',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('accountId', { type: 'string', describe: 'Filter by social account ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('source', { type: 'string', describe: 'Filter by post origin (all, late, external)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.accountId) query.accountId = argv.accountId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.source) query.source = argv.source;

          const { data } = await late.analytics.getBestTimeToPost({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
