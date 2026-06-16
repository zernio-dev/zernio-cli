import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/** Register validate commands: validate:post-length, validate:post, validate:media, validate:subreddit */
export function registerValidateCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'validate:post-length',
      'Check whether post text fits each platform\'s character limit',
      (y) => y.option('text', { type: 'string', describe: 'Post text to check', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.validate.validatePostLength({ body: { text: argv.text } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'validate:post',
      'Validate a post against platform rules before publishing',
      (y) =>
        y
          .option('platforms', { type: 'string', describe: 'Comma-separated platforms (e.g. instagram,twitter)', demandOption: true })
          .option('content', { type: 'string', describe: 'Post content' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {
            platforms: argv.platforms.split(',').map((s: string) => s.trim()).filter(Boolean),
          };
          if (argv.content !== undefined) body.content = argv.content;
          const { data } = await late.validate.validatePost({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'validate:media',
      'Validate a media URL (format, size, accessibility)',
      (y) => y.option('url', { type: 'string', describe: 'Media URL to validate', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.validate.validateMedia({ body: { url: argv.url } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'validate:subreddit',
      'Check whether a subreddit accepts posts and its requirements',
      (y) =>
        y
          .option('name', { type: 'string', describe: 'Subreddit name (without r/)', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Reddit account ID (for auth-scoped checks)' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, unknown> = { name: argv.name };
          if (argv.accountId) query.accountId = argv.accountId;
          const { data } = await late.validate.validateSubreddit({ query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
