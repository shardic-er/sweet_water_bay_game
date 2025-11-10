const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const SESSIONS_FILE = path.join(__dirname, 'game_sessions.json');
const EXPORT_DIR = path.join(__dirname, '..', 'exported_stories');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function loadSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sessions:', error.message);
    process.exit(1);
  }
}

function formatStory(session, sessionId) {
  const startDate = new Date(session.startedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const startTime = new Date(session.startedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Create the story document
  let story = `# Sweetwater Bay: The Tale of ${session.playerName}

*A chronicle of discovery, horror, and investigation*

---

**Player:** ${session.playerName}
**Session Started:** ${startDate} at ${startTime}
**Session ID:** ${sessionId}
**Total Exchanges:** ${Math.floor(session.messages.length / 2)}

---

## The Story

`;

  // Add each message in order, alternating between player and DM
  session.messages.forEach((msg, index) => {
    if (msg.role === 'user') {
      story += `### ${session.playerName}\n\n`;
      story += `> ${msg.content}\n\n`;
    } else if (msg.role === 'assistant') {
      story += `### Sweetwater Bay (DM)\n\n`;
      story += msg.content + '\n\n';
      story += '---\n\n';
    }
  });

  // Add footer
  story += `\n\n*End of Chronicle*\n\n`;
  story += `*This story was automatically generated from game session ${sessionId}*\n`;
  story += `*Sweetwater Bay RPG - Powered by Claude AI*\n`;

  return story;
}

async function exportStory() {
  console.log('\n=== Sweetwater Bay Story Exporter ===\n');

  // Load all sessions
  const sessions = await loadSessions();
  const sessionIds = Object.keys(sessions);

  if (sessionIds.length === 0) {
    console.log('No game sessions found in game_sessions.json');
    rl.close();
    return;
  }

  // Check if session ID was provided as command line argument
  let sessionId = process.argv[2];

  if (!sessionId) {
    // Display available sessions
    console.log('Available game sessions:\n');
    sessionIds.forEach(id => {
      const session = sessions[id];
      const date = new Date(session.startedAt).toLocaleDateString();
      const messageCount = session.messages.filter(m => m.role === 'assistant').length;
      console.log(`  ${id}`);
      console.log(`    Player: ${session.playerName}`);
      console.log(`    Started: ${date}`);
      console.log(`    DM Responses: ${messageCount}`);
      console.log('');
    });

    // Get session ID from user
    sessionId = await question('Enter the session ID to export: ');
  } else {
    console.log(`Using session ID from command line: ${sessionId}\n`);
  }

  if (!sessions[sessionId]) {
    console.log(`\nError: Session ID "${sessionId}" not found.`);
    rl.close();
    return;
  }

  const session = sessions[sessionId];

  // Check if session has messages
  const assistantCount = session.messages.filter(m => m.role === 'assistant').length;
  if (assistantCount === 0) {
    console.log('\nError: This session has no DM responses to export.');
    rl.close();
    return;
  }

  // Create export directory if it doesn't exist
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating export directory:', error.message);
    rl.close();
    return;
  }

  // Generate the story
  const story = formatStory(session, sessionId);

  // Create filename
  const safePlayerName = session.playerName.replace(/[^a-z0-9]/gi, '_');
  const timestamp = new Date(session.startedAt).toISOString().split('T')[0];
  const filename = `${safePlayerName}_${timestamp}_${sessionId}.md`;
  const filepath = path.join(EXPORT_DIR, filename);

  // Write the file
  try {
    await fs.writeFile(filepath, story, 'utf-8');
    console.log(`\n✓ Story exported successfully!`);
    console.log(`  File: ${filename}`);
    console.log(`  Location: ${EXPORT_DIR}`);
    console.log(`  Total DM responses: ${assistantCount}`);
  } catch (error) {
    console.error('\nError writing story file:', error.message);
  }

  rl.close();
}

// Run the exporter
exportStory().catch(error => {
  console.error('Unexpected error:', error);
  rl.close();
  process.exit(1);
});