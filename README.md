# Sweetwater Bay RPG Discord Bot

A Discord bot that runs the Sweetwater Bay tabletop RPG scenario using Claude AI as the Dungeon Master.

## Features

- Interactive tabletop RPG experience powered by Claude AI
- Private thread-based gameplay (one player per thread)
- Persistent conversation history for each game session
- DM follows the comprehensive Sweetwater Bay guide
- Server owner and player have access to threads for moderation

## Prerequisites

- Node.js (v16 or higher)
- A Discord Bot Token
- An Anthropic Claude API Key

## Setup Instructions

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent
5. Click "Reset Token" and copy your bot token (save it securely)

### 1.1 Invite the Bot to Your Server

**Quick Invite (Recommended):**

Use this pre-configured invite URL (replace `YOUR_CLIENT_ID` with your Application ID from the Developer Portal):

```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=395606846512&integration_type=0&scope=bot
```

The permissions integer `395606846512` includes all necessary permissions:
- View Channels
- Send Messages
- Manage Channels
- Manage Messages
- Manage Roles
- Create Public/Private Threads
- Send Messages in Threads
- Manage Threads
- Read Message History
- Embed Links
- Change Nickname

**Manual Method:**

If you prefer to select permissions manually:
1. Go to "OAuth2" > "URL Generator"
2. Select scopes: `bot`
3. Select bot permissions:
   - Read Messages/View Channels
   - Send Messages
   - Manage Channels
   - Manage Messages
   - Manage Roles
   - Create Public Threads
   - Create Private Threads
   - Send Messages in Threads
   - Manage Threads
   - Read Message History
   - Embed Links
   - Change Nickname
4. Copy the generated URL and use it to invite the bot to your server

**Note:** If you already invited the bot without these permissions:
- Kick the bot and re-invite with the correct URL, OR
- Manually add permissions in Server Settings → Roles

### 2. Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key and copy it (save it securely)

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Edit `.env` and add your credentials:
```
DISCORD_TOKEN=your_discord_bot_token_here
CLAUDE_API_KEY=your_claude_api_key_here
```

### 5. Run the Bot

```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

### 6. Bootstrap Your Discord Server

Once the bot is running and invited to your server:

1. In Discord, type `!bootstrap` in any channel
2. The bot will check that you're the server owner
3. It will automatically create all channels and populate content

This will:
- Create a "Sweetwater Bay RPG" category
- Create `#welcome` (read-only) channel
- Create `#sweetwater-bay` channel where players type `!start`
- Populate channels with content from `src/discord_channel_templates/`
- Set proper permissions (read-only for info channels)

**Important:** Only the server owner can use `!bootstrap`. Other users will be denied.

## Managing Channel Content

All channel content is stored in markdown files in the `src/discord_channel_templates/` folder:
- `welcome.md` - Game overview and how to start
- `sweetwater-bay.md` - Instructions for the main game channel

To update channel content:

1. Edit the `.md` files in `src/discord_channel_templates/`
2. Type `!bootstrap` again in Discord (as server owner)
3. The bot will clear and re-post updated content

This makes it easy to update game information, modify instructions, or customize content for your server.

### Available Commands

In the `#sweetwater-bay` channel:
- `!start` - Begin your adventure (creates a private game thread)

### Starting a Game

1. Go to the `#sweetwater-bay` channel
2. Type: `!start`
3. The bot will create a private thread visible only to you and the server owner
4. You'll receive a welcome message explaining your character and mission
5. Simply type anything to begin your journey

### Playing the Game

- Type your actions, questions, or dialogue naturally in your game thread
- The AI Dungeon Master will respond with narration and game progression
- The bot maintains conversation history throughout your entire adventure
- Your game session persists even if the bot restarts
- Each player has their own private thread and unique story

### Game Features

- No dice or stats - outcomes based on narrative logic and your choices
- Player competence - you're a capable researcher, not fumbling in the dark
- Meaningful consequences - your actions have lasting effects
- Rich atmosphere - investigative horror with moral complexity
- Open exploration - go where you want, investigate what interests you

### Channel Moderation

- The bot automatically deletes non-command messages in `#sweetwater-bay`
- This keeps the channel clean for game commands
- Players can chat freely in any other channel

## File Structure

```
sweet_water_bay_game/
├── src/
│   ├── bot.js                          # Main bot code
│   ├── sweetwater_bay_dm_guide.md      # Complete DM guide (loaded as AI context)
│   ├── discord_channel_templates/      # Channel content markdown files
│   └── game_sessions.json              # Persistent storage for game sessions
├── package.json                         # Node.js dependencies
├── .env                                 # Your credentials (not committed to git)
├── .env.example                         # Template for environment variables
├── CLAUDE.md                            # AI assistant guidance
└── README.md                            # This file
```

## Technical Details

### Session Storage

- Game sessions are stored in `src/game_sessions.json`
- Each thread has its own conversation history
- Sessions persist across bot restarts
- File is automatically created on first run

### API Usage

- Uses Claude Sonnet 4.5 model
- Max 2048 tokens per response (balanced for Discord messages)
- Full DM guide is included in system prompt for each request
- Conversation history is maintained per thread

### Thread Management

- Each `!start` command creates a new private thread
- Player and server owner are automatically added to the thread
- Threads auto-archive after 24 hours of inactivity (can be changed)
- Multiple players can have concurrent games in different threads

## Troubleshooting

### Bot doesn't respond to !start

- Check that Message Content Intent is enabled in Discord Developer Portal
- Verify the bot has permission to create threads in the channel
- Check console for error messages

### API Errors

- Verify your Claude API key is valid and has credits
- Check your API usage limits at console.anthropic.com
- Ensure you have a stable internet connection

### Bot crashes or restarts

- Check the console output for error messages
- Verify all environment variables are set correctly
- Ensure Node.js version is 16 or higher

## Cost Considerations

- Each message to Claude costs based on token usage
- The DM guide is approximately 40,000 tokens (sent with each request as system context)
- Average game session: 20-50 messages
- Estimated cost: $2-5 per complete playthrough (varies based on length)
- Monitor usage at console.anthropic.com

## Customization

### Changing the AI Model

Edit `src/bot.js`, around line 264:
```javascript
model: 'claude-sonnet-4-5',  // Change to other Claude models
```

### Adjusting Response Length

Edit `src/bot.js`, around line 265:
```javascript
max_tokens: 2048,  // Increase for longer responses
```

### Thread Auto-Archive Time

Edit `src/bot.js`, around line 340:
```javascript
autoArchiveDuration: 1440,  // Minutes (60, 1440, 4320, 10080)
```

## Support

For issues with:
- Discord bot setup: Check Discord.js documentation
- Claude API: Check Anthropic documentation
- Game content: Refer to src/sweetwater_bay_dm_guide.md

## License

MIT