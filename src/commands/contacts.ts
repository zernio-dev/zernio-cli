import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register contact commands: contacts:list, contacts:create, contacts:get, contacts:update,
 * contacts:delete, contacts:channels, contacts:set-field, contacts:clear-field, contacts:bulk-create.
 */
export function registerContactCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'contacts:list',
      'List contacts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('search', { type: 'string', describe: 'Search by name, email, or phone' })
          .option('tag', { type: 'string', describe: 'Filter by tag' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('isSubscribed', { type: 'string', describe: 'Filter by subscription status (true, false)' })
          .option('limit', { type: 'number', describe: 'Max results', default: 50 })
          .option('skip', { type: 'number', describe: 'Skip N results', default: 0 }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {
            limit: argv.limit,
            skip: argv.skip,
          };
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.search) query.search = argv.search;
          if (argv.tag) query.tag = argv.tag;
          if (argv.platform) query.platform = argv.platform;
          if (argv.isSubscribed) query.isSubscribed = argv.isSubscribed;

          const { data } = await late.contacts.listContacts({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:create',
      'Create a contact',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Profile ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Contact name', demandOption: true })
          .option('email', { type: 'string', describe: 'Email address' })
          .option('company', { type: 'string', describe: 'Company name' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags' })
          .option('isSubscribed', { type: 'boolean', describe: 'Subscription status' })
          .option('notes', { type: 'string', describe: 'Contact notes' })
          .option('accountId', { type: 'string', describe: 'Account ID (creates a channel if provided with platform + platformIdentifier)' })
          .option('platform', { type: 'string', describe: 'Platform for initial channel' })
          .option('platformIdentifier', { type: 'string', describe: 'Platform user ID for initial channel' })
          .option('displayIdentifier', { type: 'string', describe: 'Human-readable identifier for the initial channel' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            profileId: argv.profileId,
            name: argv.name,
          };
          if (argv.email) body.email = argv.email;
          if (argv.company) body.company = argv.company;
          if (argv.tags) body.tags = argv.tags.split(',').map((s: string) => s.trim());
          if (argv.isSubscribed !== undefined) body.isSubscribed = argv.isSubscribed;
          if (argv.notes) body.notes = argv.notes;
          if (argv.accountId) body.accountId = argv.accountId;
          if (argv.platform) body.platform = argv.platform;
          if (argv.platformIdentifier) body.platformIdentifier = argv.platformIdentifier;
          if (argv.displayIdentifier) body.displayIdentifier = argv.displayIdentifier;

          const { data } = await late.contacts.createContact({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:get <id>',
      'Get contact details',
      (y) => y.positional('id', { type: 'string', describe: 'Contact ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.contacts.getContact({ path: { contactId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:update <id>',
      'Update a contact',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Contact ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Contact name' })
          .option('email', { type: 'string', describe: 'Email address' })
          .option('company', { type: 'string', describe: 'Company name' })
          .option('avatarUrl', { type: 'string', describe: 'Avatar image URL' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags (replaces existing)' })
          .option('isSubscribed', { type: 'boolean', describe: 'Subscription status' })
          .option('isBlocked', { type: 'boolean', describe: 'Block status' })
          .option('notes', { type: 'string', describe: 'Contact notes' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {};
          if (argv.name) body.name = argv.name;
          if (argv.email) body.email = argv.email;
          if (argv.company) body.company = argv.company;
          if (argv.avatarUrl) body.avatarUrl = argv.avatarUrl;
          if (argv.tags) body.tags = argv.tags.split(',').map((s: string) => s.trim());
          if (argv.isSubscribed !== undefined) body.isSubscribed = argv.isSubscribed;
          if (argv.isBlocked !== undefined) body.isBlocked = argv.isBlocked;
          if (argv.notes) body.notes = argv.notes;

          const { data } = await late.contacts.updateContact({
            path: { contactId: argv.id! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:delete <id>',
      'Delete a contact',
      (y) => y.positional('id', { type: 'string', describe: 'Contact ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.contacts.deleteContact({ path: { contactId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:channels <id>',
      'List channels for a contact',
      (y) => y.positional('id', { type: 'string', describe: 'Contact ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.contacts.getContactChannels({ path: { contactId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:set-field <id> <slug>',
      'Set a custom field value on a contact',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Contact ID', demandOption: true })
          .positional('slug', { type: 'string', describe: 'Field slug', demandOption: true })
          .option('value', { type: 'string', describe: 'Field value', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.customfields.setContactFieldValue({
            path: { contactId: argv.id!, slug: argv.slug! },
            body: { value: argv.value } as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:clear-field <id> <slug>',
      'Clear a custom field value on a contact',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Contact ID', demandOption: true })
          .positional('slug', { type: 'string', describe: 'Field slug', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.customfields.clearContactFieldValue({
            path: { contactId: argv.id!, slug: argv.slug! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'contacts:bulk-create',
      'Bulk create up to 1000 contacts from a JSON file',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Profile ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform', demandOption: true })
          .option('file', { type: 'string', describe: 'Path to JSON file with contacts array', demandOption: true }),
      async (argv) => {
        try {
          const { readFileSync } = await import('fs');
          const raw = readFileSync(argv.file!, 'utf-8');
          const contacts = JSON.parse(raw);

          if (!Array.isArray(contacts)) {
            throw new Error('JSON file must contain an array of contact objects');
          }

          const late = createClient();
          const { data } = await late.contacts.bulkCreateContacts({
            body: {
              profileId: argv.profileId!,
              accountId: argv.accountId!,
              platform: argv.platform!,
              contacts,
            } as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
