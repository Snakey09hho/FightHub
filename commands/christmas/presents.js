const db = require('../../database/models/presentSchema')
const { Client, Message, MessageEmbed } = require('discord.js');

module.exports = {
    name: 'presents',
    fhOnly: false,
    disabledChannels: [],
    /** 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(message, args, client) {
        const userId = message.mentions.users.first() || message.member
        const user = await db.findOne({ userId })
        const lb = await db.find({}).sort({
            presents: -1
        }).limit(1)
        const presents = user ? user.presents : 0

        console.log(lb)
        message.channel.send(
            new MessageEmbed()
                .setTitle("Presents")
                .setDescription(`**Your presents:** ${presents.toLocaleString()}`)
                .setColor("WHITE")
        )
    }
}