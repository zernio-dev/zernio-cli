import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output, outputError } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register broadcast commands: CRUD, send, schedule, cancel, recipients.
 */
export function registerBroadcastCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'broadcasts:list',
      'List broadcasts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('status', { type: 'string', describe: 'Filter by status (draft, scheduled, sending, completed, failed, cancelled)' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
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
          if (argv.platform) query.platform = argv.platform;

          const { data } = await late.broadcasts.listBroadcasts({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:create',
      'Create a broadcast draft',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Profile ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform', demandOption: true })
          .option('name', { type: 'string', describe: 'Broadcast name', demandOption: true })
          .option('description', { type: 'string', describe: 'Broadcast description' })
          .option('message', { type: 'string', describe: 'Message text (for non-WhatsApp platforms)' })
          .option('templateName', { type: 'string', describe: 'WhatsApp template name' })
          .option('templateLanguage', { type: 'string', describe: 'WhatsApp template language code' })
          .option('variableMapping', { type: 'string', describe: 'JSON map of WhatsApp template variable positions to contact fields, resolved per recipient (e.g. \'{"1":{"field":"name"}}\')' })
          .option('attachments', { type: 'string', describe: 'JSON array of message attachments (e.g. \'[{"type":"image","url":"..."}]\')' })
          .option('segmentFilters', { type: 'string', describe: 'JSON recipient segment filters (e.g. \'{"tags":["vip"],"isSubscribed":true}\')' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            profileId: argv.profileId,
            accountId: argv.accountId,
            platform: argv.platform,
            name: argv.name,
          };
          if (argv.description) body.description = argv.description;

          // WhatsApp uses templates, other platforms use direct messages
          if (argv.templateName) {
            body.template = {
              name: argv.templateName,
              language: argv.templateLanguage || 'en',
            };
          } else if (argv.message) {
            body.message = { text: argv.message };
          }

          // Per-recipient WhatsApp template variable mapping merges into the template object
          if (argv.variableMapping) {
            try {
              body.template = { ...(body.template || {}), variableMapping: JSON.parse(argv.variableMapping as string) };
            } catch {
              outputError(
                '--variableMapping must be a valid JSON object, e.g. \'{"1":{"field":"name"}}\'',
                400,
              );
            }
          }

          if (argv.attachments) {
            try {
              body.message = { ...(body.message || {}), attachments: JSON.parse(argv.attachments as string) };
            } catch {
              outputError(
                '--attachments must be a valid JSON array, e.g. \'[{"type":"image","url":"..."}]\'',
                400,
              );
            }
          }

          if (argv.segmentFilters) {
            try {
              body.segmentFilters = JSON.parse(argv.segmentFilters as string);
            } catch {
              outputError(
                '--segmentFilters must be a valid JSON object, e.g. \'{"tags":["vip"],"isSubscribed":true}\'',
                400,
              );
            }
          }

          const { data } = await late.broadcasts.createBroadcast({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:get <id>',
      'Get broadcast details with stats',
      (y) => y.positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.broadcasts.getBroadcast({ path: { broadcastId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:update <id>',
      'Update a broadcast (draft only)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Broadcast name' })
          .option('description', { type: 'string', describe: 'Broadcast description' })
          .option('message', { type: 'string', describe: 'Message text' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {};
          if (argv.name) body.name = argv.name;
          if (argv.description) body.description = argv.description;
          if (argv.message) body.message = { text: argv.message };

          const { data } = await late.broadcasts.updateBroadcast({
            path: { broadcastId: argv.id! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:delete <id>',
      'Delete a broadcast (draft only)',
      (y) => y.positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.broadcasts.deleteBroadcast({ path: { broadcastId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:send <id>',
      'Send a broadcast immediately',
      (y) => y.positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.broadcasts.sendBroadcast({ path: { broadcastId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:schedule <id>',
      'Schedule a broadcast for later',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true })
          .option('scheduledAt', { type: 'string', describe: 'ISO 8601 date to send at', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.broadcasts.scheduleBroadcast({
            path: { broadcastId: argv.id! },
            body: { scheduledAt: argv.scheduledAt! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:cancel <id>',
      'Cancel a scheduled or sending broadcast',
      (y) => y.positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.broadcasts.cancelBroadcast({ path: { broadcastId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:recipients <id>',
      'List broadcast recipients',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true })
          .option('status', { type: 'string', describe: 'Filter by status (pending, sent, delivered, read, failed)' })
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

          const { data } = await late.broadcasts.listBroadcastRecipients({
            path: { broadcastId: argv.id! },
            query,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'broadcasts:add-recipients <id>',
      'Add recipients to a broadcast',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Broadcast ID', demandOption: true })
          .option('contactIds', { type: 'string', describe: 'Comma-separated contact IDs' })
          .option('phones', { type: 'string', describe: 'Comma-separated phone numbers (WhatsApp/Telegram)' })
          .option('useSegment', { type: 'boolean', describe: 'Use broadcast segment filters to auto-add contacts' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {};
          if (argv.contactIds) body.contactIds = argv.contactIds.split(',').map((s: string) => s.trim());
          if (argv.phones) body.phones = argv.phones.split(',').map((s: string) => s.trim());
          if (argv.useSegment) body.useSegment = true;

          const { data } = await late.broadcasts.addBroadcastRecipients({
            path: { broadcastId: argv.id! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
