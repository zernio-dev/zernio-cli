import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output, outputError } from '../utils/output.js';
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
          .option('content', { type: 'string', describe: 'Post content' })
          .option('media', { type: 'string', describe: 'Comma-separated media URLs' })
          .option('platform-data', {
            type: 'string',
            describe:
              'JSON object keyed by platform, merged into each platform\'s platformSpecificData. e.g. \'{"instagram":{"isAiGenerated":true}}\'',
          }),
      async (argv) => {
        try {
          const late = createClient();

          // platformSpecificData keyed by platform, merged into each platform target.
          let platformData: Record<string, Record<string, unknown>> = {};
          if (argv['platform-data']) {
            try {
              platformData = JSON.parse(argv['platform-data'] as string);
            } catch {
              outputError(
                '--platform-data must be a valid JSON object keyed by platform, e.g. \'{"instagram":{"isAiGenerated":true}}\'',
                400,
              );
            }
          }

          const platforms = argv.platforms
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
            .map((platform: string) => {
              const entry: Record<string, unknown> = { platform };
              if (platformData[platform]) entry.platformSpecificData = platformData[platform];
              return entry;
            });

          const body: Record<string, unknown> = { platforms };
          if (argv.content !== undefined) body.content = argv.content;

          // Root media items shared across platforms (same shape as posts:create builds).
          if (argv.media) {
            body.mediaItems = argv.media.split(',').map((url: string) => {
              const trimmed = url.trim();
              const isVideo = /\.(mp4|mov|avi|webm|m4v)$/i.test(trimmed);
              return { type: (isVideo ? 'video' : 'image') as 'image' | 'video', url: trimmed };
            });
          }

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
