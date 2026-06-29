import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output, outputError } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register comment-to-DM automation commands: CRUD and logs.
 */
export function registerAutomationCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'automations:list',
      'List comment-to-DM automations',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;

          const { data } = await late.commentautomations.listCommentAutomations({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'automations:create',
      'Create a comment-to-DM automation',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Profile ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('platformPostId', { type: 'string', describe: 'Platform-specific post ID (omit for an account-wide / any-post automation)' })
          .option('name', { type: 'string', describe: 'Automation name', demandOption: true })
          .option('dmMessage', { type: 'string', describe: 'DM message to send', demandOption: true })
          .option('postId', { type: 'string', describe: 'Zernio post ID (optional)' })
          .option('postTitle', { type: 'string', describe: 'Post title for display' })
          .option('keywords', { type: 'string', describe: 'Comma-separated trigger keywords (empty = all comments)' })
          .option('matchMode', { type: 'string', describe: 'Keyword match mode (exact, contains)', default: 'contains' })
          .option('buttons', { type: 'string', describe: 'JSON array of inline DM buttons (1-3), e.g. \'[{"type":"url","title":"Shop","url":"..."}]\'' })
          .option('commentReply', { type: 'string', describe: 'Optional public comment reply text' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            profileId: argv.profileId,
            accountId: argv.accountId,
            name: argv.name,
            dmMessage: argv.dmMessage,
            matchMode: argv.matchMode,
          };
          if (argv.platformPostId) body.platformPostId = argv.platformPostId;
          if (argv.postId) body.postId = argv.postId;
          if (argv.postTitle) body.postTitle = argv.postTitle;
          if (argv.keywords) body.keywords = argv.keywords.split(',').map((s: string) => s.trim());
          if (argv.buttons) {
            try {
              body.buttons = JSON.parse(argv.buttons as string);
            } catch {
              outputError(
                '--buttons must be a valid JSON array, e.g. \'[{"type":"url","title":"Shop","url":"https://..."}]\'',
                400,
              );
            }
          }
          if (argv.commentReply) body.commentReply = argv.commentReply;

          const { data } = await late.commentautomations.createCommentAutomation({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'automations:get <id>',
      'Get automation details with recent logs',
      (y) => y.positional('id', { type: 'string', describe: 'Automation ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.commentautomations.getCommentAutomation({
            path: { automationId: argv.id! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'automations:update <id>',
      'Update an automation',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Automation ID', demandOption: true })
          .option('name', { type: 'string', describe: 'Automation name' })
          .option('keywords', { type: 'string', describe: 'Comma-separated trigger keywords' })
          .option('matchMode', { type: 'string', describe: 'Keyword match mode (exact, contains)' })
          .option('dmMessage', { type: 'string', describe: 'DM message to send' })
          .option('buttons', { type: 'string', describe: 'JSON array of inline DM buttons (1-3); pass [] to clear all buttons' })
          .option('commentReply', { type: 'string', describe: 'Public comment reply text' })
          .option('isActive', { type: 'boolean', describe: 'Enable or disable the automation' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {};
          if (argv.name) body.name = argv.name;
          if (argv.keywords) body.keywords = argv.keywords.split(',').map((s: string) => s.trim());
          if (argv.matchMode) body.matchMode = argv.matchMode;
          if (argv.dmMessage) body.dmMessage = argv.dmMessage;
          if (argv.buttons) {
            try {
              body.buttons = JSON.parse(argv.buttons as string);
            } catch {
              outputError(
                '--buttons must be a valid JSON array, e.g. \'[{"type":"url","title":"Shop","url":"https://..."}]\'',
                400,
              );
            }
          }
          if (argv.commentReply) body.commentReply = argv.commentReply;
          if (argv.isActive !== undefined) body.isActive = argv.isActive;

          const { data } = await late.commentautomations.updateCommentAutomation({
            path: { automationId: argv.id! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'automations:delete <id>',
      'Delete an automation and all its logs',
      (y) => y.positional('id', { type: 'string', describe: 'Automation ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.commentautomations.deleteCommentAutomation({
            path: { automationId: argv.id! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'automations:logs <id>',
      'List trigger logs for an automation',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Automation ID', demandOption: true })
          .option('status', { type: 'string', describe: 'Filter by status (sent, failed, skipped)' })
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

          const { data } = await late.commentautomations.listCommentAutomationLogs({
            path: { automationId: argv.id! },
            query,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
