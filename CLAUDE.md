# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot that runs the Sweetwater Bay tabletop RPG scenario using Claude AI as the Dungeon Master. Players interact with the bot through private Discord threads, creating individual story-driven investigative horror experiences.

## Common Commands

### Setup
```bash
npm install                  # Install dependencies
npm run setup               # Interactive .env configuration
```

### Development & Running
```bash
npm start                   # Start the bot
npm run dev                 # Start with auto-restart (--watch mode)
```

### Discord Bot Bootstrap
In Discord, type `!bootstrap` (server owner only) to automatically create and populate all game channels.

## Architecture

### Core Flow
1. **Initialization** (`initialize()` in bot.js): Loads DM guide from `sweetwater_bay_dm_guide.md` and game sessions from `game_sessions.json`
2. **Bootstrap Command** (`!bootstrap`): Creates Discord category, channels, and populates content from `discord_channel_templates/*.md` files
3. **Game Start** (`!start`): Creates private thread, initializes session in `gameSessions` object
4. **Gameplay Loop**: User messages in thread -> Claude API call with system prompt + conversation history -> Response split and sent

### Session Management
- **Storage**: `game_sessions.json` stores all active game sessions keyed by thread ID
- **Structure**: Each session contains `playerId`, `playerName`, `startedAt`, and `messages` array
- **Persistence**: Sessions survive bot restarts by loading from file on initialization
- **Message Format**: Claude Messages API format with `role` and `content` fields

### System Prompt Construction
The `getSystemPrompt()` function combines:
1. Base DM instructions (character consistency, narrative style)
2. Full DM guide content from `sweetwater_bay_dm_guide.md` (~40,000 tokens)
3. Critical behavioral rules (no meta-commentary, stay in character)

This entire prompt is sent with EVERY API request to maintain context.

### Message Flow
```
Discord Message -> sendToClaudeAPI() -> Anthropic Messages API
                                     -> Response stored in session
                                     -> splitMessage() for Discord limits
                                     -> Send to thread
```

### Channel Templates System
- Templates stored in `discord_channel_templates/` as markdown files
- `loadAllChannelConfigs()` reads all `.md` files and extracts:
  - Channel name from filename
  - Topic from first heading
  - Full content for posting
- Templates determine read-only status (all info channels are read-only)
- `bot-commands` channel is hardcoded as read/write with auto-moderation

### Message Splitting
Two splitting functions handle Discord's 2000 character limit:
- `splitContent()`: For channel template content (splits on lines, then words)
- `splitMessage()`: For Claude responses (splits on paragraphs, then sentences)

## Important Implementation Details

### Model Configuration
Current model: `claude-sonnet-4-5` (bot.js:261)
Max tokens: 2048 per response (bot.js:262)

### Thread Settings
- Type: PrivateThread (only player and server owner have access)
- Auto-archive: 1440 minutes (24 hours)
- Participants: Player who ran `!start` + server owner (for moderation)

### Channel Moderation
The `bot-commands` channel auto-deletes non-command messages to keep it clean. Allowed commands are defined in `ALLOWED_COMMANDS` array.

### Bootstrap Behavior
The bootstrap command:
1. Sets bot nickname to "Sweetwater Bay"
2. Creates/finds "Sweetwater Bay RPG" category
3. DELETES all existing channels in category (clean slate)
4. Creates channels in order from template files
5. Posts content and sets permissions (read-only for info channels)
6. Updates status message throughout process

### Error Handling
- Missing DM guide: Fatal error, exits process
- Missing sessions file: Creates empty object and file
- API errors: Caught and reported to user in-character
- Permission errors: Logged as warnings, don't crash bot

## File Structure Context

```
bot.js                          Main Discord bot and Claude AI integration
setup.js                        Interactive .env setup wizard
sweetwater_bay_dm_guide.md      Complete DM guide (loaded as system prompt)
discord_channel_templates/      Markdown files for Discord channel content
  about.md
  faq.md
  how-to-play.md
package.json                    Dependencies and scripts
game_sessions.json              Persistent session storage (auto-created)
.env                           Bot token and API key (gitignored)
```

## Key Design Patterns

### Stateless API Calls with Stateful History
Each Claude API call is stateless, but the `messages` array in the session maintains full conversation history. This allows:
- Bot restarts without conversation loss
- Full context for Claude on every request
- Conversation persistence across days/weeks

### Permission-Based Command Gating
`!bootstrap` checks `message.author.id !== message.guild.ownerId` to prevent unauthorized server modifications.

### Progressive Status Updates
Bootstrap command edits a single status message throughout the process rather than spamming the channel, providing clean feedback.

### Dual Message Arrays
- Claude Messages API uses `{role, content}` format
- Session storage maintains this exact format
- No transformation needed between storage and API

## Configuration

### Environment Variables
```
DISCORD_TOKEN       Discord bot token from Developer Portal
CLAUDE_API_KEY      Anthropic API key from console.anthropic.com
```

### Required Discord Intents
- Guilds
- GuildMessages
- MessageContent (Privileged - must enable in Developer Portal)
- GuildMembers (Privileged - must enable in Developer Portal)

### Required Discord Permissions
The bot needs permissions for: View Channels, Send Messages, Manage Channels, Create/Manage Threads, Read Message History, Embed Links, Change Nickname

## Testing Considerations

When modifying the bot:
- Test bootstrap with existing channels (should delete and recreate)
- Test session persistence across restarts
- Test message splitting with very long Claude responses
- Verify thread permissions (should be private to player + owner)
- Check channel moderation in bot-commands
- Test API error handling (invalid key, rate limits)

## Cost Awareness

Each message costs based on tokens:
- System prompt: ~40,000 tokens (sent every request)
- Average conversation: 20-50 messages
- Estimated cost: $2-5 per complete playthrough
- Monitor usage at console.anthropic.com

## DM Guide Integration

The `sweetwater_bay_dm_guide.md` is the authoritative source for:
- Canonical facts about the world (transmutation, ecosystem, NPCs)
- How to run investigation scenes
- Character personalities and motivations
- Story pacing and themes

When modifying bot behavior, maintain alignment with the DM guide's principles: player competence, no dice mechanics, narrative resolution, moral ambiguity.