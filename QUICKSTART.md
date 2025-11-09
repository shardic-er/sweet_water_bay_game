# Quick Start Guide

Get your Sweetwater Bay RPG bot running in 5 minutes!

## Step 1: Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/) (v16 or higher)

## Step 2: Install Dependencies

Open a terminal in this folder and run:
```bash
npm install
```

## Step 3: Set Up Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application", name it "Sweetwater Bay RPG"
3. Go to "Bot" tab > Click "Add Bot"
4. Enable these intents:
   - Server Members Intent
   - Message Content Intent
5. Click "Reset Token" and copy the token
6. Go to "OAuth2" > "URL Generator"
7. Check: `bot`
8. Check permissions:
   - Read Messages/View Channels
   - Send Messages
   - Create Public Threads
   - Create Private Threads
   - Send Messages in Threads
   - Manage Threads
   - Read Message History
9. Copy the URL at the bottom and open it to invite the bot to your server

## Step 4: Get Claude API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create Key" and copy it

## Step 5: Configure Environment

1. Copy `.env.example` to `.env`
2. Open `.env` in a text editor
3. Paste your Discord token after `DISCORD_TOKEN=`
4. Paste your Claude API key after `CLAUDE_API_KEY=`
5. Save the file

## Step 6: Bootstrap Your Server

Run the bootstrap script to set up channels:
```bash
npm run bootstrap
```

This creates:
- Category: "Sweetwater Bay RPG"
- Read-only channels: #about, #faq, #how-to-play
- Command channel: #bot-commands

All content is automatically populated!

## Step 7: Start the Bot

```bash
npm start
```

You should see:
```
DM guide loaded successfully
Game sessions loaded successfully
Logged in as Sweetwater Bay RPG#1234
Sweetwater Bay RPG Bot is ready!
```

## Step 8: Play!

1. Go to your Discord server
2. In any channel, type: `!start`
3. A private thread will be created
4. Your adventure begins!

## Need Help?

- See README.md for detailed documentation
- Check that all intents are enabled in Discord Developer Portal
- Verify your API keys are correct in .env
- Make sure Node.js v16+ is installed