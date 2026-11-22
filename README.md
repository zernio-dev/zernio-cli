# Zernio CLI

Schedule posts, manage inbox, broadcasts, sequences, and automations across 18 platforms from the terminal.

Built for developers and AI agents. Outputs JSON by default.

## Install

```bash
npm install -g @zernio/cli
```

## Quick Start

```bash
# 1. Log in via browser (recommended)
zernio auth:login

# Or set your API key manually (get one at https://zernio.com/dashboard/api-keys)
zernio auth:set --key "sk_your-api-key"

# 2. List your accounts
zernio accounts:list --pretty

# 3. Schedule a post
zernio posts:create --text "Hello from the CLI!" --accounts <accountId> --scheduledAt "2025-06-01T10:00:00Z"
```

## Authentication

### Browser login (recommended)

```bash
zernio auth:login
```

Opens your browser to authorize the CLI. An API key is created automatically and saved to `~/.zernio/config.json`. Running it again from the same device replaces the existing key.

Options:
- `--device-name <name>` - Custom device name for the API key label (defaults to your hostname)

### Manual API key

```bash
zernio auth:set --key "sk_your-api-key"
```

### Verify

```bash
zernio auth:check
```

## Commands

| Command | Description |
|---------|-------------|
| `zernio auth:login` | Log in via browser |
| `zernio auth:set --key <key>` | Save API key manually |
| `zernio auth:check` | Verify API key |
| `zernio profiles:list` | List profiles |
| `zernio profiles:create --name <name>` | Create profile |
| `zernio profiles:get <id>` | Get profile |
| `zernio profiles:update <id>` | Update profile |
| `zernio profiles:delete <id>` | Delete profile |
| `zernio accounts:list` | List social accounts |
| `zernio accounts:get <id>` | Get account details |
| `zernio accounts:health` | Check account health |
| `zernio posts:create` | Create/schedule a post |
| `zernio posts:list` | List posts |
| `zernio posts:get <id>` | Get post details |
| `zernio posts:delete <id>` | Delete a post |
| `zernio posts:retry <id>` | Retry failed post |
| `zernio analytics:posts` | Post analytics |
| `zernio analytics:daily` | Daily metrics |
| `zernio analytics:best-time` | Best posting times |
| `zernio media:upload <file>` | Upload media file |
| **Inbox** | |
| `zernio inbox:conversations` | List DM conversations |
| `zernio inbox:conversation <id>` | Get conversation details |
| `zernio inbox:messages <id>` | Get messages in conversation |
| `zernio inbox:send <id>` | Send a DM |
| `zernio inbox:comments` | List post comments |
| `zernio inbox:post-comments <id>` | Get comments on a post |
| `zernio inbox:reply <postId>` | Reply to a comment |
| `zernio inbox:reviews` | List reviews |
| `zernio inbox:review-reply <id>` | Reply to a review |
| **Contacts** | |
| `zernio contacts:list` | List contacts |
| `zernio contacts:create` | Create a contact |
| `zernio contacts:get <id>` | Get contact details |
| `zernio contacts:update <id>` | Update a contact |
| `zernio contacts:delete <id>` | Delete a contact |
| `zernio contacts:channels <id>` | List contact channels |
| `zernio contacts:set-field <id> <slug>` | Set custom field |
| `zernio contacts:clear-field <id> <slug>` | Clear custom field |
| `zernio contacts:bulk-create` | Bulk create from JSON |
| **Broadcasts** | |
| `zernio broadcasts:list` | List broadcasts |
| `zernio broadcasts:create` | Create broadcast draft |
| `zernio broadcasts:get <id>` | Get broadcast with stats |
| `zernio broadcasts:update <id>` | Update broadcast |
| `zernio broadcasts:delete <id>` | Delete broadcast |
| `zernio broadcasts:send <id>` | Send immediately |
| `zernio broadcasts:schedule <id>` | Schedule for later |
| `zernio broadcasts:cancel <id>` | Cancel broadcast |
| `zernio broadcasts:recipients <id>` | List recipients |
| `zernio broadcasts:add-recipients <id>` | Add recipients |
| **Sequences** | |
| `zernio sequences:list` | List sequences |
| `zernio sequences:create` | Create sequence |
| `zernio sequences:get <id>` | Get sequence with steps |
| `zernio sequences:update <id>` | Update sequence |
| `zernio sequences:delete <id>` | Delete sequence |
| `zernio sequences:activate <id>` | Activate sequence |
| `zernio sequences:pause <id>` | Pause sequence |
| `zernio sequences:enroll <id>` | Enroll contacts |
| `zernio sequences:unenroll <id> <contactId>` | Unenroll contact |
| `zernio sequences:enrollments <id>` | List enrollments |
| **Comment-to-DM automations** | |
| `zernio comment-automations:list` | List comment-to-DM automations |
| `zernio comment-automations:create` | Create a comment-to-DM automation |
| `zernio comment-automations:get <id>` | Get automation with logs |
| `zernio comment-automations:update <id>` | Update automation |
| `zernio comment-automations:delete <id>` | Delete automation |
| `zernio comment-automations:logs <id>` | List trigger logs |

## Configuration

Config is stored at `~/.zernio/config.json`. Environment variables take precedence:

| Env Var | Description |
|---------|-------------|
| `ZERNIO_API_KEY` | API key (required) |
| `ZERNIO_API_URL` | Custom API base URL |

Legacy env vars `LATE_API_KEY` / `LATE_API_URL` and config at `~/.late/config.json` are still supported as fallbacks.

## AI Agent Integration

This CLI ships with a `SKILL.md` file for AI agent discovery (Claude Code, OpenClaw, etc.). AI agents can use the CLI to schedule posts, manage inbox conversations, send broadcasts, run drip sequences, and set up comment-to-DM automations programmatically.

## Supported Platforms

Instagram, TikTok, X (Twitter), LinkedIn, Facebook, YouTube, Threads, Pinterest, Bluesky, Google Business Profile, Snapchat, WhatsApp, Telegram, Discord, Slack, iMessage, LINE, WeChat.

## License

MIT
