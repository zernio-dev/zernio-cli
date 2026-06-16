import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register custom-field DEFINITION commands: customfields:list, create, update, delete.
 * (Setting a field's value on a contact lives under `contacts:set-field`.)
 */
export function registerCustomFieldCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'customfields:list',
      'List custom field definitions',
      (y) => y.option('profileId', { type: 'string', describe: 'Filter by profile ID' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          const { data } = await late.customfields.listCustomFields({ query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'customfields:create',
      'Create a custom field definition',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Profile ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Field name', demandOption: true })
          .option('type', { type: 'string', describe: 'Field type (text, number, date, select, ...)', demandOption: true })
          .option('slug', { type: 'string', describe: 'Field slug (auto-generated from name if omitted)' })
          .option('options', { type: 'string', describe: 'Comma-separated options (for select-type fields)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { profileId: argv.profileId, name: argv.name, type: argv.type };
          if (argv.slug) body.slug = argv.slug;
          if (argv.options) body.options = argv.options.split(',').map((s: string) => s.trim()).filter(Boolean);
          const { data } = await late.customfields.createCustomField({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'customfields:update <id>',
      'Update a custom field definition',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Custom field ID', demandOption: true })
          .option('name', { type: 'string', describe: 'New name' })
          .option('options', { type: 'string', describe: 'Comma-separated options (replaces existing)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {};
          if (argv.name !== undefined) body.name = argv.name;
          if (argv.options !== undefined) body.options = argv.options.split(',').map((s: string) => s.trim()).filter(Boolean);
          const { data } = await late.customfields.updateCustomField({ path: { fieldId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'customfields:delete <id>',
      'Delete a custom field definition',
      (y) => y.positional('id', { type: 'string', describe: 'Custom field ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.customfields.deleteCustomField({ path: { fieldId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
