const Discord = require("discord.js");
const Nuggies = require('nuggies')
Nuggies.connect(process.env.mongopath)
const client = new Discord.Client({
    ws: {
        intents: 32767
    }
})
require('discord-buttons')(client);
const http = require('http')
http.createServer((_, res) => res.end("Hi")).listen(8080)
const fs = require('fs')
const prefix = 'fh '
require('dotenv').config()
const mongoose = require('mongoose')
let dbURL = process.env.mongopath
mongoose.connect(dbURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
})
client.commands = new Discord.Collection()
client.cooldowns = new Discord.Collection()
const {
    cooldowns
} = client;

const commandFolders = fs.readdirSync('./commands');
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'))
for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.name, command);
    }
}
for (const file of eventFiles){
  const event = require(`./events/${file}`);
  if(event.once) {
    client.once(event.name, (...args) => event.execute(...args, client))
  } else {
    client.on(event.name, (...args) => event.execute(...args, client))
  }
}

client.on('ready', () => {
    console.log("Logged in.")
})

client.on('message', async message => {
    if (!message.content.toLowerCase().startsWith(prefix)) return;
    if (message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName))

    if (!command) return;

    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name)
    const cooldownAmount = (command.cooldown || 2) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply({
                content: `You have to wait for ${timeLeft.toFixed(1)} more second(s) before executing the ${command.name} command.`
            })
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    if (command.args && !args.length) {
        let reply = 'You did not provide any arguments!'

        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``
        }
        return message.reply({
            content: reply
        })
    }
    try {
        command.execute(message, args, client)
    } catch (error) {
        console.log(error)
        return message.reply({
            content: "An error occured while executing the command!"
        })
    }
})

const blacklists = require('./database/models/blacklist')

const checkBL = async () => {
    const now = new Date()
    const conditional = {
        expires: {
            $lt: now
        },
    }
    const results = await blacklists.find(conditional)
    if (results && results.length) {
        await blacklists.deleteMany(conditional)
    }
    setTimeout(checkBL, 1000 * 60)
}

checkBL()
client.on('clickMenu', (menu) => {
	Nuggies.dropclick(client, menu);
});

client.login(process.env.token)