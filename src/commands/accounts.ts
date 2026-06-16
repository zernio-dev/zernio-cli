import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register account commands: accounts:list, accounts:get, accounts:health */
export function registerAccountCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'accounts:list',
      'List connected social accounts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;

          const { data } = await late.accounts.listAccounts({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:get <id>',
      'Get account details',
      (y) => y.positional('id', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          // SDK has getAccountHealth for single account details
          const { data } = await late.accounts.getAccountHealth({ path: { accountId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:health',
      'Check health of all connected accounts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('status', { type: 'string', describe: 'Filter by status (healthy, warning, error)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.status) query.status = argv.status;

          const { data } = await late.accounts.getAllAccountsHealth({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:follower-stats',
      'Get follower stats across accounts',
      (y) =>
        y
          .option('accountIds', { type: 'string', describe: 'Comma-separated account IDs' })
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('fromDate', { type: 'string', describe: 'Start date (ISO 8601)' })
          .option('toDate', { type: 'string', describe: 'End date (ISO 8601)' })
          .option('granularity', { type: 'string', describe: 'Granularity (day, week, month)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.accountIds) query.accountIds = argv.accountIds;
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.fromDate) query.fromDate = argv.fromDate;
          if (argv.toDate) query.toDate = argv.toDate;
          if (argv.granularity) query.granularity = argv.granularity;
          const { data } = await late.accounts.getFollowerStats({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:update <id>',
      'Update a connected account',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('username', { type: 'string', describe: 'New username' })
          .option('displayName', { type: 'string', describe: 'New display name' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {};
          if (argv.username !== undefined) body.username = argv.username;
          if (argv.displayName !== undefined) body.displayName = argv.displayName;
          const { data } = await late.accounts.updateAccount({ path: { accountId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:move <id>',
      'Move an account to another profile',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('profileId', { type: 'string', describe: 'Destination profile ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.accounts.moveAccountToProfile({ path: { accountId: argv.id! }, body: { profileId: argv.profileId } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:delete <id>',
      'Disconnect (delete) an account',
      (y) => y.positional('id', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.accounts.deleteAccount({ path: { accountId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accounts:tiktok-creator-info <id>',
      'Get TikTok creator info for posting (privacy options, limits)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('mediaType', { type: 'string', describe: 'Media type (video, photo)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.mediaType) query.mediaType = argv.mediaType;
          const { data } = await late.accounts.getTikTokCreatorInfo({ path: { accountId: argv.id! }, query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
