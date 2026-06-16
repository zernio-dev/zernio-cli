import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register tracking-tag commands (Meta pixel / measurement tag), scoped to a
 * connected ads account: trackingtags:list, create, get, update, shared-accounts,
 * add-shared, remove-shared, stats.
 */
export function registerTrackingTagCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'trackingtags:list <accountId>',
      'List tracking tags for an account',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .option('adAccountId', { type: 'string', describe: 'Filter by ad account ID' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.adAccountId) query.adAccountId = argv.adAccountId;
          const { data } = await late.trackingtags.listTrackingTags({ path: { accountId: argv.accountId! }, query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:create <accountId>',
      'Create a tracking tag (NOT idempotent — a retry creates a second tag)',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .option('adAccountId', { type: 'string', describe: 'Ad account ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Tag name', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.trackingtags.createTrackingTag({
            path: { accountId: argv.accountId! },
            body: { adAccountId: argv.adAccountId, name: argv.name } as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:get <accountId> <tagId>',
      'Get a tracking tag',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .positional('tagId', { type: 'string', describe: 'Tracking tag ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.trackingtags.getTrackingTag({ path: { accountId: argv.accountId!, tagId: argv.tagId! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:update <accountId> <tagId>',
      'Update a tracking tag',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .positional('tagId', { type: 'string', describe: 'Tracking tag ID', demandOption: true })
          .option('name', { type: 'string', describe: 'New name' })
          .option('enableAutomaticMatching', { type: 'boolean', describe: 'Enable automatic advanced matching' })
          .option('automaticMatchingFields', { type: 'string', describe: 'Comma-separated matching fields' })
          .option('firstPartyCookieStatus', { type: 'string', describe: 'First-party cookie status' })
          .option('dataUseSetting', { type: 'string', describe: 'Data use setting' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {};
          if (argv.name !== undefined) body.name = argv.name;
          if (argv.enableAutomaticMatching !== undefined) body.enableAutomaticMatching = argv.enableAutomaticMatching;
          if (argv.automaticMatchingFields !== undefined) body.automaticMatchingFields = argv.automaticMatchingFields.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (argv.firstPartyCookieStatus !== undefined) body.firstPartyCookieStatus = argv.firstPartyCookieStatus;
          if (argv.dataUseSetting !== undefined) body.dataUseSetting = argv.dataUseSetting;
          const { data } = await late.trackingtags.updateTrackingTag({ path: { accountId: argv.accountId!, tagId: argv.tagId! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:shared-accounts <accountId> <tagId>',
      'List ad accounts a tracking tag is shared with',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .positional('tagId', { type: 'string', describe: 'Tracking tag ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.trackingtags.listTrackingTagSharedAccounts({ path: { accountId: argv.accountId!, tagId: argv.tagId! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:add-shared <accountId> <tagId>',
      'Share a tracking tag with another ad account',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .positional('tagId', { type: 'string', describe: 'Tracking tag ID', demandOption: true })
          .option('adAccountId', { type: 'string', describe: 'Ad account ID to share with', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.trackingtags.addTrackingTagSharedAccount({ path: { accountId: argv.accountId!, tagId: argv.tagId! }, body: { adAccountId: argv.adAccountId } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:remove-shared <accountId> <tagId>',
      'Unshare a tracking tag from an ad account',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .positional('tagId', { type: 'string', describe: 'Tracking tag ID', demandOption: true })
          .option('adAccountId', { type: 'string', describe: 'Ad account ID to unshare' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.adAccountId) query.adAccountId = argv.adAccountId;
          const { data } = await late.trackingtags.removeTrackingTagSharedAccount({ path: { accountId: argv.accountId!, tagId: argv.tagId! }, query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'trackingtags:stats <accountId> <tagId>',
      'Get tracking tag event stats',
      (y) =>
        y
          .positional('accountId', { type: 'string', describe: 'Connected account ID', demandOption: true })
          .positional('tagId', { type: 'string', describe: 'Tracking tag ID', demandOption: true })
          .option('aggregation', { type: 'string', describe: 'Aggregation window' })
          .option('startTime', { type: 'string', describe: 'Start time (ISO 8601)' })
          .option('endTime', { type: 'string', describe: 'End time (ISO 8601)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, unknown> = {};
          for (const k of ['aggregation', 'startTime', 'endTime'] as const) if (argv[k] !== undefined) query[k] = argv[k];
          const { data } = await late.trackingtags.getTrackingTagStats({ path: { accountId: argv.accountId!, tagId: argv.tagId! }, query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
