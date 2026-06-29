import { readFileSync } from 'node:fs';
import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output, outputError } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Parse a thread file for posts:create --thread-file. Accepts either a JSON array
 * (same shape as --threadItems) or plain text where tweets are separated by a line
 * containing only "---". Returns the threadItems array (threadItems[0] is the root).
 * Adapted from @mrgoonie's contribution in zernio-cli#6.
 */
function parseThreadFile(path: string): Array<Record<string, unknown>> {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return outputError(`Could not read --thread-file: ${path}`, 400);
  }
  const trimmed = raw.trim();
  if (!trimmed) return outputError('--thread-file is empty.', 400);

  if (trimmed.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return outputError('--thread-file contains invalid JSON.', 400);
    }
    if (!Array.isArray(parsed)) return outputError('--thread-file JSON must be an array.', 400);
    return parsed as Array<Record<string, unknown>>;
  }

  // Plain text: split on lines that contain only "---".
  const items: Array<Record<string, unknown>> = [];
  let current: string[] = [];
  const flush = () => {
    const content = current.join('\n').trim();
    if (content) items.push({ content });
    current = [];
  };
  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === '---') flush();
    else current.push(line);
  }
  flush();
  if (!items.length) {
    return outputError('--thread-file produced no tweets (separate tweets with a line containing only "---").', 400);
  }
  return items;
}

/** Parse a JSON-string CLI flag, exiting with a structured 400 error on invalid JSON. */
function parseJsonFlag(raw: string, flag: string, hint: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    outputError(`--${flag} must be valid JSON (${hint})`, 400);
  }
}

/** Register post commands: posts:create, posts:list, posts:get, posts:delete, posts:retry */
export function registerPostCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'posts:create',
      'Create or schedule a post',
      (y) =>
        y
          .option('text', { type: 'string', describe: 'Post content text', demandOption: true })
          .option('accounts', { type: 'string', describe: 'Comma-separated account IDs', demandOption: true })
          .option('scheduledAt', { type: 'string', describe: 'ISO 8601 date to schedule (omit to publish now)' })
          .option('draft', { type: 'boolean', describe: 'Save as draft', default: false })
          .option('media', { type: 'string', describe: 'Comma-separated media URLs' })
          .option('title', { type: 'string', describe: 'Post title (YouTube, Reddit, etc.)' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags' })
          .option('hashtags', { type: 'string', describe: 'Comma-separated hashtags' })
          .option('timezone', { type: 'string', describe: 'Timezone (e.g. America/New_York)' })
          // X/Twitter native options, passed through as platformSpecificData on the X target.
          .option('quoteTweetId', { type: 'string', describe: 'X/Twitter: ID or status URL of a tweet to quote-repost' })
          .option('replyToTweetId', { type: 'string', describe: 'X/Twitter: ID of a tweet to reply to (the first tweet replies to it)' })
          .option('replySettings', { type: 'string', describe: 'X/Twitter: who can reply (following | mentionedUsers | everyone)' })
          .option('threadItems', {
            type: 'string',
            describe:
              'X/Twitter: JSON array of tweets to publish as a native thread; threadItems[0] is the root, the rest are chained replies. e.g. \'[{"content":"first"},{"content":"second"}]\'',
          })
          .option('thread-file', {
            type: 'string',
            describe:
              'X/Twitter: path to a thread file. Either a JSON array (same shape as --threadItems) or plain text with tweets separated by a line containing only "---". Mutually exclusive with --threadItems.',
          })
          // Content-disclosure flags, mapped to platformSpecificData on the relevant target.
          .option('paidPartnership', { type: 'boolean', describe: 'X/Twitter: mark the post as a paid partnership' })
          .option('sensitiveMedia', { type: 'boolean', describe: 'X/Twitter: flag attached media as sensitive (adds a sensitive-media warning)' })
          .option('aiGenerated', { type: 'boolean', describe: 'Instagram: mark the content as AI-generated (sets is_ai_generated)' })
          // Generic per-platform passthrough: a JSON object keyed by platform, merged into
          // each platform target's platformSpecificData (covers Reddit/TikTok/YouTube/Pinterest/etc.).
          .option('platform-data', {
            type: 'string',
            describe:
              'JSON object keyed by platform, merged into each platform target\'s platformSpecificData. e.g. \'{"reddit":{"flairId":"x","title":"t"},"tiktok":{"privacyLevel":"PUBLIC_TO_EVERYONE"},"youtube":{"visibility":"public"}}\'',
          })
          .option('media-json', {
            type: 'string',
            describe:
              'JSON array of media items (richer alternative to --media; supports type incl gif/document, altText, title, thumbnail, instagramThumbnail). Wins over --media when both are given.',
          })
          .option('queuedFromProfile', { type: 'string', describe: 'Profile ID to schedule via queue (next available slot when --scheduledAt is omitted)' })
          .option('queueId', { type: 'string', describe: 'Specific queue ID to use (only with --queuedFromProfile)' })
          .option('recycling', { type: 'string', describe: 'JSON RecyclingConfig for recurring re-publishing' })
          .option('crosspostingEnabled', { type: 'boolean', describe: 'Enable crossposting for this post' })
          .option('mentions', { type: 'string', describe: 'JSON array of mentions (stored for reference only)' })
          .option('metadata', { type: 'string', describe: 'JSON metadata object' }),
      async (argv) => {
        try {
          const late = createClient();

          // Look up accounts to resolve platform types
          const { data: accountsData } = await late.accounts.listAccounts();
          const allAccounts = (accountsData as any)?.accounts || [];
          const accountIds = argv.accounts.split(',').map((s: string) => s.trim()).filter(Boolean);

          // X/Twitter native options (quote, reply, thread) are passed through as
          // platformSpecificData on the X platform target. threadItems[0] becomes the
          // root tweet; later items are chained as replies.
          const twitterData: Record<string, any> = {};
          if (argv.quoteTweetId) twitterData.quoteTweetId = argv.quoteTweetId;
          if (argv.replyToTweetId) twitterData.replyToTweetId = argv.replyToTweetId;
          if (argv.replySettings) twitterData.replySettings = argv.replySettings;
          if (argv.threadItems && argv['thread-file']) {
            outputError('Use either --threadItems or --thread-file, not both.', 400);
          }
          if (argv.threadItems) {
            try {
              twitterData.threadItems = JSON.parse(argv.threadItems as string);
            } catch {
              outputError(
                '--threadItems must be a valid JSON array, e.g. \'[{"content":"first tweet"},{"content":"second tweet"}]\'',
                400,
              );
            }
          } else if (argv['thread-file']) {
            twitterData.threadItems = parseThreadFile(argv['thread-file'] as string);
          }
          if (argv.paidPartnership) twitterData.paidPartnership = true;
          if (argv.sensitiveMedia) twitterData.sensitiveMedia = { other: true };
          const hasTwitterData = Object.keys(twitterData).length > 0;

          // Instagram content disclosure.
          const instagramData: Record<string, any> = {};
          if (argv.aiGenerated) instagramData.isAiGenerated = true;
          const hasInstagramData = Object.keys(instagramData).length > 0;

          // Generic per-platform passthrough, keyed by platform name. Merged into each
          // target's platformSpecificData alongside the X/Instagram data built above.
          const platformDataMap = argv.platformData
            ? parseJsonFlag(argv.platformData as string, 'platform-data', 'object keyed by platform')
            : undefined;

          const platforms = accountIds.map((id: string) => {
            const account = allAccounts.find((a: any) => (a._id || a.id) === id);
            if (!account) {
              outputError(`Account ${id} not found. Run "late accounts:list" to see available accounts.`, 404);
            }
            const entry: Record<string, any> = { platform: account.platform, accountId: id };
            if (hasTwitterData && (account.platform === 'twitter' || account.platform === 'x')) {
              entry.platformSpecificData = twitterData;
            }
            if (hasInstagramData && account.platform === 'instagram') {
              entry.platformSpecificData = { ...(entry.platformSpecificData || {}), ...instagramData };
            }
            const pd = platformDataMap?.[account.platform];
            if (pd && typeof pd === 'object') {
              entry.platformSpecificData = { ...(entry.platformSpecificData || {}), ...pd };
            }
            return entry;
          });

          // Build media items. --media-json (richer shape) wins over --media when both are set.
          const mediaItems = argv.media
            ? argv.media.split(',').map((url: string) => {
                const trimmed = url.trim();
                const isVideo = /\.(mp4|mov|avi|webm|m4v)$/i.test(trimmed);
                return { type: (isVideo ? 'video' : 'image') as 'image' | 'video', url: trimmed };
              })
            : undefined;

          let mediaItemsJson: any[] | undefined;
          if (argv.mediaJson) {
            const parsed = parseJsonFlag(argv.mediaJson as string, 'media-json', 'array of media items');
            if (!Array.isArray(parsed)) {
              outputError('--media-json must be a JSON array of media items', 400);
            }
            mediaItemsJson = parsed;
          }
          const finalMediaItems = mediaItemsJson ?? mediaItems;

          const body: Record<string, any> = {
            content: argv.text,
            platforms,
          };

          if (finalMediaItems?.length) body.mediaItems = finalMediaItems;
          if (argv.title) body.title = argv.title;
          if (argv.timezone) body.timezone = argv.timezone;
          if (argv.tags) body.tags = argv.tags.split(',').map((s: string) => s.trim());
          if (argv.hashtags) body.hashtags = argv.hashtags.split(',').map((s: string) => s.trim());
          if (argv.mentions) body.mentions = parseJsonFlag(argv.mentions as string, 'mentions', 'array');
          if (argv.metadata) body.metadata = parseJsonFlag(argv.metadata as string, 'metadata', 'object');
          if (argv.recycling) body.recycling = parseJsonFlag(argv.recycling as string, 'recycling', 'object');
          if (argv.crosspostingEnabled !== undefined) body.crosspostingEnabled = argv.crosspostingEnabled;
          if (argv.queuedFromProfile) body.queuedFromProfile = argv.queuedFromProfile;
          if (argv.queueId) body.queueId = argv.queueId;

          if (argv.draft) {
            body.isDraft = true;
          } else if (argv.scheduledAt) {
            body.scheduledFor = argv.scheduledAt;
          } else if (!argv.queuedFromProfile) {
            // Queue scheduling assigns a slot server-side; don't force publishNow in that case.
            body.publishNow = true;
          }

          const { data } = await late.posts.createPost({ body });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:list',
      'List posts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('status', { type: 'string', describe: 'Filter by status (scheduled, published, failed, draft)' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('from', { type: 'string', describe: 'Start date (ISO 8601)' })
          .option('to', { type: 'string', describe: 'End date (ISO 8601)' })
          .option('page', { type: 'number', describe: 'Page number', default: 1 })
          .option('limit', { type: 'number', describe: 'Results per page', default: 10 }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {
            page: argv.page,
            limit: argv.limit,
          };
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.status) query.status = argv.status;
          if (argv.platform) query.platform = argv.platform;
          if (argv.from) query.dateFrom = argv.from;
          if (argv.to) query.dateTo = argv.to;

          const { data } = await late.posts.listPosts({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:get <id>',
      'Get post details',
      (y) => y.positional('id', { type: 'string', describe: 'Post ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.getPost({ path: { postId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:delete <id>',
      'Delete a post',
      (y) => y.positional('id', { type: 'string', describe: 'Post ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.deletePost({ path: { postId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:retry <id>',
      'Retry a failed post',
      (y) => y.positional('id', { type: 'string', describe: 'Post ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.retryPost({ path: { postId: argv.id! } });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:update <id>',
      'Update a post (scheduled/draft posts)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('content', { type: 'string', describe: 'New content text' })
          .option('title', { type: 'string', describe: 'New title' })
          .option('scheduledAt', { type: 'string', describe: 'ISO 8601 date to (re)schedule' })
          .option('publishNow', { type: 'boolean', describe: 'Publish immediately' })
          .option('draft', { type: 'boolean', describe: 'Mark as draft' })
          .option('timezone', { type: 'string', describe: 'Timezone' })
          .option('visibility', { type: 'string', describe: 'Visibility' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags (replaces existing)' })
          .option('hashtags', { type: 'string', describe: 'Comma-separated hashtags (replaces existing)' })
          .option('recycling', { type: 'string', describe: 'JSON RecyclingConfig' })
          .option('tiktokSettings', { type: 'string', describe: 'JSON root-level TikTok settings (merged into TikTok targets)' })
          .option('facebookSettings', { type: 'string', describe: 'JSON root-level Facebook settings (merged into Facebook targets)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = {};
          if (argv.content !== undefined) body.content = argv.content;
          if (argv.title !== undefined) body.title = argv.title;
          if (argv.scheduledAt !== undefined) body.scheduledFor = argv.scheduledAt;
          if (argv.publishNow !== undefined) body.publishNow = argv.publishNow;
          if (argv.draft !== undefined) body.isDraft = argv.draft;
          if (argv.timezone !== undefined) body.timezone = argv.timezone;
          if (argv.visibility !== undefined) body.visibility = argv.visibility;
          if (argv.tags !== undefined) body.tags = argv.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (argv.hashtags !== undefined) body.hashtags = argv.hashtags.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (argv.recycling) body.recycling = parseJsonFlag(argv.recycling as string, 'recycling', 'object');
          if (argv.tiktokSettings) body.tiktokSettings = parseJsonFlag(argv.tiktokSettings as string, 'tiktokSettings', 'object');
          if (argv.facebookSettings) body.facebookSettings = parseJsonFlag(argv.facebookSettings as string, 'facebookSettings', 'object');
          const { data } = await late.posts.updatePost({ path: { postId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:edit <id>',
      'Edit an already-published post on a platform (where supported)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform to edit on', demandOption: true })
          .option('content', { type: 'string', describe: 'New content', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.editPost({ path: { postId: argv.id! }, body: { platform: argv.platform, content: argv.content } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:unpublish <id>',
      'Unpublish (remove) a published post from a platform',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform to unpublish from', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.posts.unpublishPost({ path: { postId: argv.id! }, body: { platform: argv.platform } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:update-metadata <id>',
      'Update platform metadata for a published post (e.g. YouTube title/tags)',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('platform', { type: 'string', describe: 'Platform', demandOption: true })
          .option('title', { type: 'string', describe: 'New title' })
          .option('description', { type: 'string', describe: 'New description' })
          .option('tags', { type: 'string', describe: 'Comma-separated tags' })
          .option('categoryId', { type: 'string', describe: 'Category ID' })
          .option('privacyStatus', { type: 'string', describe: 'Privacy status' })
          .option('thumbnailUrl', { type: 'string', describe: 'Thumbnail URL' })
          .option('playlistId', { type: 'string', describe: 'Playlist ID' })
          .option('videoId', { type: 'string', describe: 'Platform video ID' })
          .option('accountId', { type: 'string', describe: 'Account ID' })
          .option('madeForKids', { type: 'boolean', describe: 'Made for kids' })
          .option('containsSyntheticMedia', { type: 'boolean', describe: 'YouTube AI-content disclosure (synthetic media that could be mistaken for real)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { platform: argv.platform };
          for (const k of ['title', 'description', 'categoryId', 'privacyStatus', 'thumbnailUrl', 'playlistId', 'videoId', 'accountId'] as const) {
            if (argv[k] !== undefined) body[k] = argv[k];
          }
          if (argv.madeForKids !== undefined) body.madeForKids = argv.madeForKids;
          if (argv.containsSyntheticMedia !== undefined) body.containsSyntheticMedia = argv.containsSyntheticMedia;
          if (argv.tags !== undefined) body.tags = argv.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
          const { data } = await late.posts.updatePostMetadata({ path: { postId: argv.id! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'posts:bulk-upload',
      'Bulk create posts from a file (uploaded as multipart)',
      (y) =>
        y
          .option('file', { type: 'string', describe: 'Path to the bulk-upload file', demandOption: true })
          .option('dryRun', { type: 'boolean', describe: 'Validate without creating' }),
      async (argv) => {
        try {
          const { readFileSync, statSync } = await import('fs');
          const { basename } = await import('path');
          let stat;
          try {
            stat = statSync(argv.file!);
          } catch {
            outputError(`File not found: ${argv.file}`, 404);
          }
          if (!stat!.isFile()) {
            outputError(`Not a file: ${argv.file}`, 400);
          }
          // The API expects a multipart file upload, not a JSON body.
          const buffer = readFileSync(argv.file!);
          const filename = basename(argv.file!);
          // `File` is Node 20+; fall back to `Blob` (Node 18+) so bulk-upload still
          // works on Node 18 runtimes. The SDK accepts either (Blob | File).
          const file =
            typeof File !== 'undefined'
              ? new File([buffer], filename, { type: 'text/csv' })
              : new Blob([buffer], { type: 'text/csv' });
          const late = createClient();
          const query: Record<string, unknown> = {};
          if (argv.dryRun !== undefined) query.dryRun = argv.dryRun;
          const { data } = await late.posts.bulkUploadPosts({ body: { file }, query: query as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
