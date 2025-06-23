// bot.js
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { connect, getDb } = require('./db');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName('generatekey')
    .setDescription('Generate a new 24-hour access key'),

  new SlashCommandBuilder()
    .setName('removekey')
    .setDescription('Remove an existing key')
    .addStringOption(option =>
      option.setName('key')
        .setDescription('The key to remove')
        .setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function registerCommands() {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error(error);
  }
}

registerCommands();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  await connect();  // Connect to MongoDB before bot starts
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const db = getDb();
  const keysCollection = db.collection('keys');

  if (interaction.commandName === 'generatekey') {
    const key = uuidv4();
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    await keysCollection.insertOne({
      key,
      user: interaction.user.id,
      expires,
    });

    await interaction.reply(`🔑 Your new key: \`${key}\`\n🕒 Expires in 24 hours.`);
  }

  else if (interaction.commandName === 'removekey') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You need admin permissions to use this command.', ephemeral: true });
    }

    const keyToRemove = interaction.options.getString('key');
    const keyDoc = await keysCollection.findOne({ key: keyToRemove });

    if (!keyDoc) {
      return interaction.reply({ content: '❌ That key does not exist.', ephemeral: true });
    }

    await keysCollection.deleteOne({ key: keyToRemove });

    await interaction.reply(`✅ Key \`${keyToRemove}\` has been removed.`);
  }
});

client.login(TOKEN);
