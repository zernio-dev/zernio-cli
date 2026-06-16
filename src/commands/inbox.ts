import type { Argv } from 'yargs';
import { createClient } from '../client.js';
import { output } from '../utils/output.js';
import { handleError } from '../utils/errors.js';

/**
 * Register inbox commands: conversations, messages, comments, and reviews.
 * Uses the SDK's messages, comments, and reviews namespaces.
 */
export function registerInboxCommands(yargs: Argv): Argv {
  return yargs
    .command(
      'inbox:conversations',
      'List DM conversations',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('accountId', { type: 'string', describe: 'Filter by account ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform (facebook, instagram, twitter, bluesky, reddit, telegram)' })
          .option('status', { type: 'string', describe: 'Filter by status (active, archived)' })
          .option('sortOrder', { type: 'string', describe: 'Sort order (asc, desc)', default: 'desc' })
          .option('limit', { type: 'number', describe: 'Max results', default: 20 })
          .option('cursor', { type: 'string', describe: 'Pagination cursor' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.accountId) query.accountId = argv.accountId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.status) query.status = argv.status;
          if (argv.sortOrder) query.sortOrder = argv.sortOrder;
          if (argv.limit) query.limit = argv.limit;
          if (argv.cursor) query.cursor = argv.cursor;

          const { data } = await late.messages.listInboxConversations({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:conversation <id>',
      'Get conversation details',
      (y) =>
        y
          .positional('id', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.getInboxConversation({
            path: { conversationId: argv.id! },
            query: { accountId: argv.accountId! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:messages <conversationId>',
      'Get messages in a conversation',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.getInboxConversationMessages({
            path: { conversationId: argv.conversationId! },
            query: { accountId: argv.accountId! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:send <conversationId>',
      'Send a DM in a conversation',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('message', { type: 'string', describe: 'Message text', demandOption: true })
          .option('mediaUrl', { type: 'string', describe: 'Media attachment URL' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            accountId: argv.accountId!,
            message: argv.message,
          };
          if (argv.mediaUrl) body.mediaUrl = argv.mediaUrl;

          const { data } = await late.messages.sendInboxMessage({
            path: { conversationId: argv.conversationId! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:comments',
      'List post comments across accounts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('accountId', { type: 'string', describe: 'Filter by account ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform' })
          .option('since', { type: 'string', describe: 'Posts created after this date (ISO 8601)' })
          .option('sortBy', { type: 'string', describe: 'Sort field (date, comments)', default: 'date' })
          .option('limit', { type: 'number', describe: 'Max results', default: 20 })
          .option('cursor', { type: 'string', describe: 'Pagination cursor' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.accountId) query.accountId = argv.accountId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.since) query.since = argv.since;
          if (argv.sortBy) query.sortBy = argv.sortBy;
          if (argv.limit) query.limit = argv.limit;
          if (argv.cursor) query.cursor = argv.cursor;

          const { data } = await late.comments.listInboxComments({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:post-comments <postId>',
      'Get comments on a specific post',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.getInboxPostComments({
            path: { postId: argv.postId! },
            query: { accountId: argv.accountId! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:reply <postId>',
      'Reply to a comment on a post',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('message', { type: 'string', describe: 'Reply text', demandOption: true })
          .option('commentId', { type: 'string', describe: 'Reply to specific comment ID (optional)' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, any> = {
            accountId: argv.accountId!,
            message: argv.message,
          };
          if (argv.commentId) body.commentId = argv.commentId;

          const { data } = await late.comments.replyToInboxPost({
            path: { postId: argv.postId! },
            body: body as any,
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:reviews',
      'List reviews across accounts',
      (y) =>
        y
          .option('profileId', { type: 'string', describe: 'Filter by profile ID' })
          .option('accountId', { type: 'string', describe: 'Filter by account ID' })
          .option('platform', { type: 'string', describe: 'Filter by platform (facebook, googlebusiness)' })
          .option('hasReply', { type: 'boolean', describe: 'Filter by reply status' })
          .option('minRating', { type: 'number', describe: 'Minimum rating' })
          .option('maxRating', { type: 'number', describe: 'Maximum rating' })
          .option('sortBy', { type: 'string', describe: 'Sort field (date, rating)', default: 'date' })
          .option('sortOrder', { type: 'string', describe: 'Sort order (asc, desc)', default: 'desc' })
          .option('limit', { type: 'number', describe: 'Max results', default: 20 })
          .option('cursor', { type: 'string', describe: 'Pagination cursor' }),
      async (argv) => {
        try {
          const late = createClient();
          const query: Record<string, any> = {};
          if (argv.profileId) query.profileId = argv.profileId;
          if (argv.accountId) query.accountId = argv.accountId;
          if (argv.platform) query.platform = argv.platform;
          if (argv.hasReply !== undefined) query.hasReply = argv.hasReply;
          if (argv.minRating !== undefined) query.minRating = argv.minRating;
          if (argv.maxRating !== undefined) query.maxRating = argv.maxRating;
          if (argv.sortBy) query.sortBy = argv.sortBy;
          if (argv.sortOrder) query.sortOrder = argv.sortOrder;
          if (argv.limit) query.limit = argv.limit;
          if (argv.cursor) query.cursor = argv.cursor;

          const { data } = await late.reviews.listInboxReviews({ query });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:review-reply <reviewId>',
      'Reply to a review',
      (y) =>
        y
          .positional('reviewId', { type: 'string', describe: 'Review ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('message', { type: 'string', describe: 'Reply text', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.reviews.replyToInboxReview({
            path: { reviewId: argv.reviewId! },
            body: { accountId: argv.accountId!, message: argv.message! },
          });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:review-reply-delete <reviewId>',
      'Delete a reply to a review',
      (y) =>
        y
          .positional('reviewId', { type: 'string', describe: 'Review ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.reviews.deleteInboxReviewReply({ path: { reviewId: argv.reviewId! }, body: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:create-conversation',
      'Start a new DM conversation',
      (y) =>
        y
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('participantId', { type: 'string', describe: 'Recipient platform user ID' })
          .option('participantUsername', { type: 'string', describe: 'Recipient username' })
          .option('message', { type: 'string', describe: 'Opening message text' })
          .option('templateName', { type: 'string', describe: 'WhatsApp template name' })
          .option('templateLanguage', { type: 'string', describe: 'WhatsApp template language code' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { accountId: argv.accountId };
          for (const k of ['participantId', 'participantUsername', 'message', 'templateName', 'templateLanguage'] as const) {
            if (argv[k] !== undefined) body[k] = argv[k];
          }
          const { data } = await late.messages.createInboxConversation({ body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:update-conversation <conversationId>',
      'Update a conversation (e.g. archive)',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('status', { type: 'string', describe: 'New status (active, archived)', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.updateInboxConversation({ path: { conversationId: argv.conversationId! }, body: { accountId: argv.accountId!, status: argv.status! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:edit-message <conversationId> <messageId>',
      'Edit a sent message (where supported)',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .positional('messageId', { type: 'string', describe: 'Message ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('text', { type: 'string', describe: 'New message text' }),
      async (argv) => {
        try {
          const late = createClient();
          const body: Record<string, unknown> = { accountId: argv.accountId };
          if (argv.text !== undefined) body.text = argv.text;
          const { data } = await late.messages.editInboxMessage({ path: { conversationId: argv.conversationId!, messageId: argv.messageId! }, body: body as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:delete-message <conversationId> <messageId>',
      'Delete a sent message (where supported)',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .positional('messageId', { type: 'string', describe: 'Message ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.deleteInboxMessage({ path: { conversationId: argv.conversationId!, messageId: argv.messageId! }, query: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:typing <conversationId>',
      'Send a typing indicator in a conversation',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.sendTypingIndicator({ path: { conversationId: argv.conversationId! }, body: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:mark-read <conversationId>',
      'Mark a conversation as read',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.markConversationRead({ path: { conversationId: argv.conversationId! }, body: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:react <conversationId> <messageId>',
      'Add a reaction to a message',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .positional('messageId', { type: 'string', describe: 'Message ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('emoji', { type: 'string', describe: 'Reaction emoji', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.addMessageReaction({ path: { conversationId: argv.conversationId!, messageId: argv.messageId! }, body: { accountId: argv.accountId!, emoji: argv.emoji! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:unreact <conversationId> <messageId>',
      'Remove a reaction from a message',
      (y) =>
        y
          .positional('conversationId', { type: 'string', describe: 'Conversation ID', demandOption: true })
          .positional('messageId', { type: 'string', describe: 'Message ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.messages.removeMessageReaction({ path: { conversationId: argv.conversationId!, messageId: argv.messageId! }, query: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:delete-comment <postId>',
      'Delete a comment on a post',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('commentId', { type: 'string', describe: 'Comment ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.deleteInboxComment({ path: { postId: argv.postId! }, query: { accountId: argv.accountId!, commentId: argv.commentId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:hide-comment <postId> <commentId>',
      'Hide a comment',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .positional('commentId', { type: 'string', describe: 'Comment ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.hideInboxComment({ path: { postId: argv.postId!, commentId: argv.commentId! }, body: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:unhide-comment <postId> <commentId>',
      'Unhide a comment',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .positional('commentId', { type: 'string', describe: 'Comment ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.unhideInboxComment({ path: { postId: argv.postId!, commentId: argv.commentId! }, query: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:like-comment <postId> <commentId>',
      'Like a comment',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .positional('commentId', { type: 'string', describe: 'Comment ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.likeInboxComment({ path: { postId: argv.postId!, commentId: argv.commentId! }, body: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:unlike-comment <postId> <commentId>',
      'Unlike a comment',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .positional('commentId', { type: 'string', describe: 'Comment ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.unlikeInboxComment({ path: { postId: argv.postId!, commentId: argv.commentId! }, query: { accountId: argv.accountId! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    )
    .command(
      'inbox:private-reply <postId> <commentId>',
      'Send a private reply (DM) to a commenter',
      (y) =>
        y
          .positional('postId', { type: 'string', describe: 'Post ID', demandOption: true })
          .positional('commentId', { type: 'string', describe: 'Comment ID', demandOption: true })
          .option('accountId', { type: 'string', describe: 'Account ID', demandOption: true })
          .option('message', { type: 'string', describe: 'Private reply text', demandOption: true }),
      async (argv) => {
        try {
          const late = createClient();
          const { data } = await late.comments.sendPrivateReplyToComment({ path: { postId: argv.postId!, commentId: argv.commentId! }, body: { accountId: argv.accountId!, message: argv.message! } as any });
          output(data, argv.pretty as boolean);
        } catch (err) {
          handleError(err);
        }
      },
    );
}
