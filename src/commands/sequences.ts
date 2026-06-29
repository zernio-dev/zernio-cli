import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register sequence commands: CRUD, activate, pause, enroll, unenroll, enrollments.
 */
export function registerSequenceCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'sequences:list',
      'List sequences',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('status', { type: 'string', describe: 'Filter by status (draft, active, paused)' })
          .option('limit', { type: 'number', describe: 'Max results', default: 20 })
          .option('skip', { type: 'number', describe: 'Skip N results', default: 0 }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {
            limit: argv.limit,
            skip: argv.skip,
          };
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.status) query.status = argv.status;

          const { data } = await late.sequences.listSequences({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:create',
      'Create a sequence',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Profile ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform', demandOption: true })
          .option('name', { type: 'string', describe: 'Sequence name', demandOption: true })
          .option('description', { type: 'string', describe: 'Sequence description' })
          .option('stepsFile', { type: 'string', describe: 'Path to JSON file with steps array' })
          .option('exitOnReply', { type: 'boolean', describe: 'Exit sequence when contact replies', default: true })
          .option('exitOnUnsubscribe', { type: 'boolean', describe: 'Exit sequence when contact unsubscribes', default: true }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            profileId: argv.profileId,
            accountId: argv.accountId,
            platform: argv.platform,
            name: argv.name,
            exitOnReply: argv.exitOnReply,
            exitOnUnsubscribe: argv.exitOnUnsubscribe,
          };
          if (argv.description) body.description = argv.description;

          // Steps can be provided via a JSON file for complex sequences
          if (argv.stepsFile) {
            const { readFileSync } = await import('fs');
            const raw = readFileSync(argv.stepsFile, 'utf-8');
            body.steps = JSON.parse(raw);
          }

          const { data } = await late.sequences.createSequence({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:get <id>',
      'Get sequence details with steps',
      (y) => y.positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.sequences.getSequence({ path: { sequenceId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:update <id>',
      'Update a sequence',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Sequence name' })
          .option('description', { type: 'string', describe: 'Sequence description' })
          .option('stepsFile', { type: 'string', describe: 'Path to JSON file with steps array' })
          .option('exitOnReply', { type: 'boolean', describe: 'Exit on reply' })
          .option('exitOnUnsubscribe', { type: 'boolean', describe: 'Exit on unsubscribe' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {};
          if (argv.name) body.name = argv.name;
          if (argv.description) body.description = argv.description;
          if (argv.exitOnReply !== undefined) body.exitOnReply = argv.exitOnReply;
          if (argv.exitOnUnsubscribe !== undefined) body.exitOnUnsubscribe = argv.exitOnUnsubscribe;

          // Steps can be replaced via a JSON file (draft or paused sequences only)
          if (argv.stepsFile) {
            const { readFileSync } = await import('fs');
            const raw = readFileSync(argv.stepsFile, 'utf-8');
            body.steps = JSON.parse(raw);
          }

          const { data } = await late.sequences.updateSequence({
            path: { sequenceId: argv.id! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:delete <id>',
      'Delete a sequence',
      (y) => y.positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.sequences.deleteSequence({ path: { sequenceId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:activate <id>',
      'Activate a sequence',
      (y) => y.positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.sequences.activateSequence({ path: { sequenceId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:pause <id>',
      'Pause a sequence',
      (y) => y.positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.sequences.pauseSequence({ path: { sequenceId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:enroll <id>',
      'Enroll contacts into a sequence',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true })
          .option('contactIds', { type: 'string', describe: 'Comma-separated contact IDs', demandOption: true })
          .option('channelIds', { type: 'string', describe: 'Comma-separated channel IDs (optional, uses default channel per contact)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            contactIds: argv.contactIds!.split(',').map((s: string) => s.trim()),
          };
          if (argv.channelIds) {
            body.channelIds = argv.channelIds.split(',').map((s: string) => s.trim());
          }

          const { data } = await late.sequences.enrollContacts({
            path: { sequenceId: argv.id! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:unenroll <id> <contactId>',
      'Unenroll a contact from a sequence',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true })
          .positional('contactId', { type: 'string', describe: 'Contact ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.sequences.unenrollContact({
            path: { sequenceId: argv.id!, contactId: argv.contactId! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'sequences:enrollments <id>',
      'List enrollments for a sequence',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Sequence ID', demandOption: true })
          .option('status', { type: 'string', describe: 'Filter by status (active, completed, exited, paused)' })
          .option('limit', { type: 'number', describe: 'Max results', default: 50 })
          .option('skip', { type: 'number', describe: 'Skip N results', default: 0 }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {
            limit: argv.limit,
            skip: argv.skip,
          };
          if (argv.status) query.status = argv.status;

          const { data } = await late.sequences.listSequenceEnrollments({
            path: { sequenceId: argv.id! },
            query,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
