import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register account-group commands: accountgroups:list, create, update, delete */
export function registerAccountGroupCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'accountgroups:list',
      'List account groups',
      (y) => y,
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.accountGroups.listAccountGroups();
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accountgroups:create',
      'Create an account group',
      (y) =>
        y
          .option('name', { type: 'string', describe: 'Group name', demandOption: true })
          .option('accountIds', { type: 'string', describe: 'Comma-separated account IDs', demandOption: true })
          .option('profileId', { type: 'string', describe: 'Profile ID' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {
            name: argv.name,
            accountIds: argv.accountIds.split(',').map((s: string) => s.trim()).filter(Boolean),
          };
          if (argv.profileId) body.profileId = argv.profileId;
          const { data } = await late.accountGroups.createAccountGroup({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accountgroups:update <id>',
      'Update an account group',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Group ID', demandOption: true })
          .option('name', { type: 'string', describe: 'New name' })
          .option('accountIds', { type: 'string', describe: 'Comma-separated account IDs (replaces existing)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {};
          if (argv.name !== undefined) body.name = argv.name;
          if (argv.accountIds !== undefined) body.accountIds = argv.accountIds.split(',').map((s: string) => s.trim()).filter(Boolean);
          const { data } = await late.accountGroups.updateAccountGroup({ path: { groupId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'accountgroups:delete <id>',
      'Delete an account group',
      (y) => y.positional('id', { type: 'string', describe: 'Group ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.accountGroups.deleteAccountGroup({ path: { groupId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
