import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register API-key commands: apikeys:list, create, delete */
export function registerApiKeyCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'apikeys:list',
      'List API keys',
      (y) => y,
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.apiKeys.listApiKeys();
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'apikeys:create',
      'Create an API key (the secret is only returned once)',
      (y) =>
        y
          .option('name', { type: 'string', describe: 'Key name/label', demandOption: true })
          .option('expiresIn', { type: 'number', describe: 'Expiry in seconds (omit for no expiry)' })
          .option('scope', { type: 'string', describe: 'Key scope' })
          .option('permission', { type: 'string', describe: 'Permission level' })
          .option('profileIds', { type: 'string', describe: 'Comma-separated profile IDs to scope the key to' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { name: argv.name };
          if (argv.expiresIn !== undefined) body.expiresIn = argv.expiresIn;
          if (argv.scope !== undefined) body.scope = argv.scope;
          if (argv.permission !== undefined) body.permission = argv.permission;
          if (argv.profileIds !== undefined) body.profileIds = argv.profileIds.split(',').map((s: string) => s.trim()).filter(Boolean);
          const { data } = await late.apiKeys.createApiKey({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'apikeys:delete <id>',
      'Delete (revoke) an API key',
      (y) => y.positional('id', { type: 'string', describe: 'API key ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.apiKeys.deleteApiKey({ path: { keyId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
