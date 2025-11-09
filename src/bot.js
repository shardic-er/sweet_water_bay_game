require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

const SESSIONS_FILE = path.join(__dirname, 'game_sessions.json');
const DM_GUIDE_PATH = path.join(__dirname, 'sweetwater_bay_dm_guide.md');
const TEMPLATES_DIR = path.join(__dirname, 'discord_channel_templates');
const GAME_CHANNEL_NAME = 'sweetwater-bay';
const ALLOWED_COMMANDS = ['!start', '!bootstrap'];

let gameSessions = {};
let dmGuideContent = '';

async function loadDMGuide() {
  try {
    dmGuideContent = await fs.readFile(DM_GUIDE_PATH, 'utf-8');
    console.log('DM guide loaded successfully');
  } catch (error) {
    console.error('Error loading DM guide:', error);
    process.exit(1);
  }
}

async function loadSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    gameSessions = JSON.parse(data);
    console.log('Game sessions loaded successfully');
  } catch (error) {
    if (error.code === 'ENOENT') {
      gameSessions = {};
      await saveSessions();
    } else {
      console.error('Error loading sessions:', error);
    }
  }
}

async function saveSessions() {
  try {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(gameSessions, null, 2));
  } catch (error) {
    console.error('Error saving sessions:', error);
  }
}

function getSystemPrompt() {
  return `You are the Dungeon Master narrating the Sweetwater Bay story. You respond ONLY as the narrator and NPCs in this world.

${dmGuideContent}

CRITICAL - NEVER BREAK CHARACTER:
- NEVER acknowledge that you are an AI, assistant, or game system
- NEVER explain game mechanics, rules, or behind-the-scenes information
- NEVER reference "the DM guide", "instructions", or "the scenario"
- NEVER say things like "This is a game" or "I'm here to help you play"
- NEVER spoil information the player hasn't discovered yet
- If the player asks meta questions, respond IN-CHARACTER (e.g., if they say "who are you?", an NPC might answer, not you as the DM)
- If the player seems confused about the premise, have NPCs naturally clarify through dialogue, don't break frame

You are telling a story. Stay IN the story at all times.

Core Guidance:
- Follow the DM guide's canonical facts when players investigate
- Provide rich, atmospheric descriptions using sensory details
- Give players meaningful choices and respect their agency
- Track consequences of their actions over time
- Balance horror, humanity, and moral complexity
- Resolve situations through narrative logic, not dice
- The player character is a competent naturalist in their early 30s sponsored by the Corvale Natural History Society

Response Style:
- Keep responses concise but vivid (2-4 paragraphs typically)
- Show through narration and dialogue, don't tell
- Ask open-ended questions through NPC dialogue or situation
- Describe sights, smells, sounds, textures
- Present NPCs as three-dimensional people with their own goals
- Create meaningful tension and consequences

The game has already begun with the player's arrival at the dock. Continue the story from there.`;
}

async function loadAllChannelConfigs() {
  const configs = [];

  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
      const name = file.replace('.md', '');

      const firstLine = content.split('\n')[0];
      const topic = firstLine.startsWith('#')
        ? firstLine.replace(/^#+\s*/, '').substring(0, 100)
        : `Information about ${name}`;

      // sweetwater-bay channel should NOT be read-only (bot needs to send messages there)
      const isReadOnly = name !== GAME_CHANNEL_NAME;

      configs.push({ name, topic, content, isReadOnly });
    }
  } catch (error) {
    console.error('Error loading channel configs:', error);
  }

  // Sort configs: welcome first, then everything else alphabetically
  configs.sort((a, b) => {
    if (a.name === 'welcome') return -1;
    if (b.name === 'welcome') return 1;
    return a.name.localeCompare(b.name);
  });

  return configs;
}

async function bootstrapServer(guild, statusMessage) {
  const updateStatus = async (text) => {
    try {
      await statusMessage.edit(text);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  await updateStatus('Starting bootstrap process...');

  // Set bot nickname
  try {
    const botMember = await guild.members.fetch(client.user.id);
    await botMember.setNickname('Sweetwater Bay');
    console.log('Bot nickname set to "Sweetwater Bay"');
  } catch (error) {
    console.warn('Warning: Could not set bot nickname. Make sure the bot has "Change Nickname" permission.', error.message);
  }

  const channelConfigs = await loadAllChannelConfigs();

  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === 'Sweetwater Bay RPG'
  );

  if (!category) {
    await updateStatus('Creating category: Sweetwater Bay RPG...');
    category = await guild.channels.create({
      name: 'Sweetwater Bay RPG',
      type: ChannelType.GuildCategory
    });
  }

  // Delete all existing channels in category
  const existingChannels = guild.channels.cache.filter(
    c => c.parentId === category.id && c.type === ChannelType.GuildText
  );

  for (const [, channel] of existingChannels) {
    try {
      await updateStatus(`Deleting old channel: #${channel.name}...`);
      await channel.delete();
    } catch (error) {
      console.warn(`Could not delete channel #${channel.name}:`, error.message);
    }
  }

  // Create all channels fresh
  for (let i = 0; i < channelConfigs.length; i++) {
    const config = channelConfigs[i];
    await updateStatus(`Creating channel ${i + 1}/${channelConfigs.length}: #${config.name}...`);

    const channel = await guild.channels.create({
      name: config.name,
      type: ChannelType.GuildText,
      parent: category.id,
      position: i,
      topic: config.topic
    });

    const chunks = splitContent(config.content, 2000);
    for (const chunk of chunks) {
      await channel.send(chunk);
    }

    if (config.isReadOnly) {
      try {
        await channel.permissionOverwrites.edit(guild.id, {
          SendMessages: false,
          ViewChannel: true,
          ReadMessageHistory: true
        });
      } catch (error) {
        console.warn(`Warning: Could not set read-only permissions for #${config.name}.`, error.message);
      }
    }
  }

  await updateStatus('Bootstrap complete! All channels have been set up.');
}

function splitContent(content, maxLength) {
  if (content.length <= maxLength) return [content];

  const chunks = [];
  const lines = content.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      if (line.length > maxLength) {
        const words = line.split(' ');
        for (const word of words) {
          if ((currentChunk + word + ' ').length > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = word + ' ';
          } else {
            currentChunk += word + ' ';
          }
        }
      } else {
        currentChunk = line + '\n';
      }
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function sendToClaudeAPI(threadId, userMessage) {
  const session = gameSessions[threadId];

  session.messages.push({
    role: 'user',
    content: userMessage
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: getSystemPrompt(),
      messages: session.messages
    });

    const assistantMessage = response.content[0].text;

    session.messages.push({
      role: 'assistant',
      content: assistantMessage
    });

    await saveSessions();

    return assistantMessage;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Sweetwater Bay RPG Bot is ready!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content === '!bootstrap' && !message.channel.isThread()) {
    if (message.author.id !== message.guild.ownerId) {
      await message.reply('Sorry, only the server owner can use the `!bootstrap` command.');
      return;
    }

    const statusMessage = await message.reply('Initializing bootstrap...');

    try {
      await bootstrapServer(message.guild, statusMessage);
      console.log(`Server bootstrapped: ${message.guild.name}`);
    } catch (error) {
      console.error('Error bootstrapping server:', error);
      await statusMessage.edit(`Bootstrap failed: ${error.message}\n\nPlease check the console for details.`);
    }
    return;
  }

  if (message.channel.name === GAME_CHANNEL_NAME && !message.channel.isThread()) {
    const isCommand = ALLOWED_COMMANDS.some(cmd => message.content.startsWith(cmd));

    if (!isCommand) {
      try {
        await message.delete();
        const warning = await message.channel.send(`${message.author}, please only use \`!start\` in this channel.`);
        setTimeout(() => warning.delete().catch(() => {}), 5000);
      } catch (error) {
        console.error('Error moderating message:', error);
      }
      return;
    }

    if (message.content === '!start') {
      try {
        // Generate a unique thread name with timestamp
        const timestamp = new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        const threadName = `${message.author.username} - ${timestamp}`;

        const thread = await message.channel.threads.create({
          name: threadName,
          autoArchiveDuration: 1440,
          type: ChannelType.PrivateThread,
          reason: 'Starting a new Sweetwater Bay RPG session'
        });

        await thread.members.add(message.author.id);

        const guildOwnerId = message.guild.ownerId;
        if (guildOwnerId !== message.author.id) {
          await thread.members.add(guildOwnerId);
        }

        gameSessions[thread.id] = {
          playerId: message.author.id,
          playerName: message.author.username,
          startedAt: new Date().toISOString(),
          messages: []
        };

        await saveSessions();

        const characterIntro = `## Your Character

You are a naturalist in your early thirties, sponsored by the **Corvale Natural History Society**. Your specialty is extremophile ecosystems - life in environments that shouldn't support it.

Six months ago, Dr. Helena Marsh presented field reports from Sweetwater Bay to the Society: seawater that spontaneously transmutes to sugar, sustaining a unique and impossible food web. She secured you a research expedition, field equipment, and six months of Society funding.

**Your goal is scientific:** document the phenomenon, collect samples, understand the ecosystem, publish your findings. You're competent, educated, and well-prepared. This is the opportunity of a career.

\`\`\`
 _____                   _                 _             ______
/  ___|                 | |               | |            | ___ \\
\\ \`--.__      _____  ___| |___      ____ _| |_ ___ _ __  | |_/ / __ _ _   _
 \`--. \\ \\ /\\ / / _ \\/ _ \\ __\\ \\ /\\ / / _\` | __/ _ \\ '__| | ___ \\/ _\` | | | |
/\\__/ /\\ V  V /  __/  __/ |_ \\ V  V / (_| | ||  __/ |    | |_/ / (_| | |_| |
\\____/  \\_/\\_/ \\___|\\___|\\__| \\_/\\_/ \\__,_|\\__\\___|_|    \\____/ \\__,_|\\__, |
                                                                       __/ |
                                                                      |___/
\`\`\``;

        const sceneOpening = `The smell hits you three miles out.

Sweet-wrong, like overripe fruit in a distillery, cut with vinegar sharp enough to burn your sinuses. You pull your scarf up, but it's already coating your tongue. Behind you, another passenger has gone pale, gripping the rail.

The ship's first mate, a weathered local, sees your expression and grins. "That's the Reek," she says. "Breathe through your mouth for the first hour. After that, your nose gives up."

The water changes as you cross into the bay. Deep blue becomes murky brown—the color of old beer. Your bow wave churns up froth that doesn't dissipate, just hangs there, ropy and thick. Seabirds circle overhead in massive flocks, but their flight is sluggish, almost drunk.

Then you see Sweetwater Bay itself.

It doesn't look like water. The surface has a matte quality, textured like badly-set gelatin, with colors swirling in patches—rust-brown, cream-yellow, black. Microbial colonies visible from kilometers away. A bubble the size of a wagon wheel breaks the surface with a wet *blorp*, releasing waves of yeast-rot smell.

The ship slows as it enters the bay proper. Your bow doesn't cut through the water—it *tears* through it. The biofilm splits with sounds like ripping cloth, constant squelching. Everywhere, fizzing. The whole surface looks like it's gently boiling.

Something massive moves beneath the sludge to port. You catch a glimpse of mottled flesh, glistening and crystalline, before it dives deeper.

The docks rise ahead, built on pilings encrusted with hardened biofilm like melted wax. Everything is stained brown-orange-yellow. Workers move in thick rubber boots and permanently discolored aprons. None of them bother with face coverings anymore.

You thump against the dock—harder than normal, the hull slippery with biofilm. A portmaster calls out: "Welcome to Sweetwater Bay! Harboring fee is two silver, and breathing tax is"—he grins—"free today!"

You shoulder your research equipment and step onto the gangplank. The smell is overwhelming now—sweet and sharp and rotten all at once, thick enough to chew. Your eyes water uncontrollably.

Your boot immediately slips on the slime-coated dock. You catch yourself on the rail, hand coming away sticky. A dockhand offers you a rag without comment. The rag is also stained.

"First time?" he asks.

You nod, trying to adjust to the assault on your senses.

"You'll get used to it." He gestures at the working waterfront—boats being scraped clean, nets full of massive slug-creatures, barrels labeled CURSE VINEGAR, harvesting platforms working the bay's surface. "Harbinger Inn is two blocks up. Can't miss it—it's the building that doesn't smell like it's dying."

He glances at your research cases and adds, "They've got rooms with filtered air. Costs extra, but worth every copper if you want to sleep without choking. Innkeeper burns incense too—lavender and sage. Makes it almost bearable."

You look where he's pointing. Beyond the working docks, the settlement huddles at the bay's edge. Ramshackle processing sheds and housing built on raised foundations. Smoke rises from multiple stacks. And there—two blocks up the main street—a three-story stone building that looks sturdier than everything around it. A painted sign swings in the breeze: The Harbinger Inn.

Past the town, grasslands sway in waves of deep green and rust-red, and you can just make out the darker line where pine forest begins. But for now, the promise of cleaner air pulls you toward the inn like a lifeline.`;

        await thread.send(characterIntro);

        // Split the scene opening if it exceeds Discord's character limit
        const sceneParts = splitMessage(sceneOpening);
        for (const part of sceneParts) {
          await thread.send(part);
        }

        // Delete the !start command message
        try {
          await message.delete();
        } catch (error) {
          console.warn('Could not delete !start message:', error.message);
        }

        // Send confirmation and delete it after 60 seconds
        const confirmation = await message.channel.send(`*This message will self-destruct in 60 seconds.*\n\n${message.author}, your adventure begins! Check the thread "${thread.name}".`);
        setTimeout(async () => {
          try {
            await confirmation.delete();
          } catch (error) {
            console.warn('Could not delete confirmation message:', error.message);
          }
        }, 60000);
      } catch (error) {
        console.error('Error creating thread:', error);
        await message.reply('Sorry, there was an error starting your game. Please try again.');
      }
      return;
    }
  }

  if (!message.channel.isThread()) return;

  const threadId = message.channel.id;

  if (!gameSessions[threadId]) return;

  const session = gameSessions[threadId];

  if (message.author.id !== session.playerId) return;

  try {
    await message.channel.sendTyping();

    const response = await sendToClaudeAPI(threadId, message.content);

    const chunks = splitMessage(response);
    for (const chunk of chunks) {
      await message.channel.send(chunk);
    }
  } catch (error) {
    console.error('Error processing message:', error);
    await message.channel.send('*The DM seems distracted for a moment... (Error processing your message. Please try again.)*');
  }
});

function splitMessage(text, maxLength = 2000) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let currentChunk = '';

  const paragraphs = text.split('\n\n');

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      if (paragraph.length > maxLength) {
        const sentences = paragraph.split('. ');
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length > maxLength) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              currentChunk = '';
            }
            chunks.push(sentence.trim());
          } else {
            currentChunk += sentence + '. ';
          }
        }
      } else {
        currentChunk = paragraph + '\n\n';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function initialize() {
  await loadDMGuide();
  await loadSessions();

  client.login(process.env.DISCORD_TOKEN);
}

initialize();