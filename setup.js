const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== Sweetwater Bay RPG Bot Setup ===\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('This script will help you create your .env configuration file.\n');

  const discordToken = await question('Enter your Discord Bot Token: ');
  const claudeApiKey = await question('Enter your Claude API Key: ');

  const envContent = `DISCORD_TOKEN=${discordToken.trim()}
CLAUDE_API_KEY=${claudeApiKey.trim()}
`;

  const envPath = path.join(__dirname, '.env');

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✓ .env file created successfully!');
    console.log('\nYou can now run the bot with: npm start');
  } catch (error) {
    console.error('\nError creating .env file:', error.message);
  }

  rl.close();
}

setup();