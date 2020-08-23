const { DiscordAPIError } = require("discord.js");

const Discord = require("discord.js")

const ffmpeg = require("ffmpeg")

const client = new Discord.Client({ disableEveryone: true })

const ytdl = require("ytdl-core")

const servers = {}

const config = require("./config.json")

const ping = require("minecraft-server-util");
const { filterFormats } = require("ytdl-core");

client.login(config.token)

client.on("ready", ()=>{
    console.log("Bot logged in as " + client.user.username + " and watching " + client.guilds.cache.size + " servers!")

    client.user.setActivity("Unity - " + client.guilds.cache.size + " servers | *help")

})

client.on("guildCreate", guild=>{
    console.log("Somebody invited me to " + guild.name + " with " + guild.memberCount + "!")
    const everyone = guild.roles.everyone.id
    guild.channels
        .create("welcome", {
            type: 'text',
            permissionOverwrites: [
                {
                    id: everyone,
                    deny: ['SEND_MESSAGES']
                },
            ],
        })
    guild.channels
        .create("leaves", {
            type: 'text',
            permissionOverwrites: [
                {
                    id: everyone,
                    deny: ['SEND_MESSAGES']
                },
            ],
        })

    client.user.setActivity("Unity - " + client.guilds.cache.size + " servers | *help")
})

client.on("guildDelete", guild=>{
    console.log("Removed from guild " + guild.name)

    client.user.setActivity("Unity - " + client.guilds.cache.size + " servers | *help")
})


client.on("message", async message =>{
    if(message.author.bot) return;


    if(!message.content.startsWith(config.prefix)) return;

    if (!message.guild) return;



    const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase();
    if (command === "stop") {
        if(!message.member.voice.channel) return message.channel.send("You need to be in a voice channel to stop the music!")
        message.member.voice.channel.leave()
        message.channel.send(":x: stopped music")
        return undefined;
    }
    if (command === "play") {
        const voiceChannel = message.member.voice.channel
        if(!voiceChannel) return message.channel.send("You need to be in a voice channel to play music")
        const permissions = voiceChannel.permissionsFor(message.client.user)
        if(!permissions.has('CONNECT')) return message.channel.send(":x: No permission to connect!")
        if(!permissions.has('SPEAK')) return message.channel.send(":x: No permission to speak in this channel!")


        try {
            let connection = await voiceChannel.join()

            const dispatcher = connection.play(ytdl(args[0], {
                quality: "highestaudio",
                highWaterMark: 1 << 25
            })
            )
            .on('finish', ()=>{
            voiceChannel.leave()
            message.channel.send(":x: Song Ended!")
            })
            .on('error', error => {
                console.log(`There was an issue playing a song: ${error}`)
                message.channel.send(`There was an issue playing the requested song: ${error}`)
                voiceChannel.leave()
            })
            if (!args[1]) {
                dispatcher.setVolumeLogarithmic(5 / 5)
            } else {
                dispatcher.setVolumeLogarithmic(args[1] / args[1])
            }


            const musicEmbed = new Discord.MessageEmbed()
            .setTitle(":musical_note: Playing Music :musical_note:")
            .addField("Song URL", args[0])
            .addField("Requested Date", message.createdAt)
            .setFooter("2020 Copyright | " + client.user.username)
            .setThumbnail("https://sites.duke.edu/arabiccommunities/files/2015/04/music-note-1.png")
            .setDescription("Come on, music coming!")

            message.channel.send(musicEmbed)


        } catch (error) {
            // Catch errors
            console.log("There was an error connecting to the voice channel: " + error);
            message.channel.send("There was an issue connecting to the voice channel: " + error);
        }

        return;
    }

    if (command === "ping" || command === "ms") {

        if(!args[0]) return message.channel.send('You must type a minecraft server ip')
        if(!args[1]) return message.channel.send('You must type a minecraft server port, defualt server port is `25565`')

        ping(args[0], parseInt(args[1]), (error, reponse) =>{
            if(error) throw error
            const Embed = new Discord.MessageEmbed()
            .setTitle('Server Status')
            .addField('Server IP', reponse.host)
            .addField('Server Version', reponse.version)
            .addField('Online Players', reponse.onlinePlayers)
            .addField('Max Players', reponse.maxPlayers)
            .setColor('GREEN')
            
            message.channel.send(Embed)
        })

        return
    }
    if (command === "invite") {
        message.channel.send('https://discord.com/api/oauth2/authorize?client_id=746768364516409459&permissions=8&scope=bot')
        return
    }
    if(command === "help" || command === "?") {
        const helpEmbed = new Discord.MessageEmbed()
        .setColor('GREEN')
        .setTitle("Help")
        .addField("Prefix", config.prefix)
        .addField(":hammer: Usefull Commands", "------------------------------")
        .addFields(
            { name: "Bulk Delete", value: "delete [2-100]", inline: true },
            { name: "Member Kick", value: "kick [member] [reason]", inline: true },
            { name: "Member Ban", value: "ban [member] [reason]", inline: true }
        )
        .addField(":scroll: Informative + Fun :laughing:", "------------------------------")
        .addFields(
            { name: "Member Information", value: "stats [user]", inline: true },
            { name: "Bot Staus + Guild Info", value: "info", inline: true },
            { name: "Minecraft Server Getter", value: "ms [IP] [PORT] (Defualt port 25565)", inline: true }
        )
        .addField(":musical_note: Music", "------------------------------")
        .addFields(
            { name: "Music Play", value: "play [Song URL] [Vulume (Optional)]", inline: true },
            { name: "Music Stop", value: "stop (Stops the current song)", inline: true }
        )
        .addField("Invite me!", "*invite")
        .setFooter("2020 Copyright | Nations")
        .addField("Support Server", "https://discord.gg/6fyjbbz")
        .setDescription("Help, Unity help.")

        message.channel.send(helpEmbed)
        return;
    }

    if (command === "info") {
        const botEmbed = new Discord.MessageEmbed()
        .setTitle("Bot Info")
        .setColor('GREEN')
        .addField("Guilds", client.guilds.cache.size)
        .addField("Ping", client.ws.ping)
        .addField("Current Guild Info", `Members: **${message.guild.memberCount}** Name: **${message.guild.name}**`)
        let botInfo = await message.channel.send("Getting bot info...")
        botInfo.edit(botEmbed)
        return;
    }

    if(command === "delete") {
        // This command removes all messages from all users in the channel, up to 100.
        
        // get the delete count, as an actual number.
        const deleteCount = parseInt(args[0], 10);
        
        // Ooooh nice, combined conditions. <3
        if(!deleteCount || deleteCount < 2 || deleteCount > 100)
          return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
        
        // So we get our messages, and delete them. Simple enough, right?
        const fetched = await message.channel.messages.fetch({limit: deleteCount});
        message.channel.bulkDelete(fetched)
          .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));

          message.channel.send("Deleted some messages!").then(m=>{
            m.delete( { timeout: 5000, reason: "Becuase"} )
        });
        return;
      }


      if(command === "stats") {
        // Info on a user

        if (!args[0]) return message.channel.send("Mention a user, Like this: `*stats @Random_Guy`");

        const infoUser = message.mentions.users.first();

        const infoEmbed = new Discord.MessageEmbed()
        .setTitle("Info on " + infoUser.username)
        .setThumbnail(infoUser.avatarURL())
        .addField("Name", infoUser.username)
        .addField("User Id", infoUser.id)
        .addField("Avatar URL", infoUser.avatarURL())
        .addField("Full Name", `${infoUser.username}\#${infoUser.discriminator}`)
        .setFooter("2020 Copyright | " + client.user.username)
        .setColor("#bfff00")

        message.channel.send(infoEmbed)
        return;
      }

      if (command === "kick") {
        // Code Here
        if (!message.member.hasPermission("KICK_MEMBERS")) return message.channel.send("No permission to do this!");
        let toKick = message.mentions.members.first()
        let kickReason = args.slice(1).join(' ')
        if (!args[0]) return message.channel.send("Please mention a user to kick!")
        if (!kickReason) return message.channel.send("Please apply a reason!")
        if(toKick.kickable) {
            const kickEmbed = new Discord.MessageEmbed()
            .setTitle("Kick")
            .setColor('RANDOM')
            .addField("Member Kicked", toKick)
            .addField("Kicked by", message.author)
            .addField("Reason", kickReason)
            .addField("Date", message.createdAt)
            .setFooter("2020 Copyright | " + client.user.username);

            message.channel.send(kickEmbed)


            const kickedEmbed = new Discord.MessageEmbed()
            .setTitle("You have been kicked from " + message.guild.name + "!")
            .addField("Reason", kickReason)
            .addField("Executer", message.author)
            .addField("Date", message.createdAt)
            .setColor('RED')
            .setFooter("2020 Copyright | " + client.user.username)
            .setThumbnail("https://d30y9cdsu7xlg0.cloudfront.net/png/380644-200.png");
            
            toKick.send(kickedEmbed)
                .catch(error => message.reply(`Unable to send message, ${error}`))

            toKick.kick()
        }
        // Return after code
        return;
      }

      if (command === "ban") {
        // Code Here
        if (!message.member.hasPermission("BAN_MEMBERS")) return message.channel.send("No permission to do this!");
        let toBan = message.mentions.members.first()
        let banReason = args.slice(1).join(' ')
        if (!args[0]) return message.channel.send("Please mention a user to ban!")
        if (!banReason) return message.channel.send("Please apply a reason!")
        if(toBan.bannable) {
            const banEmbed = new Discord.MessageEmbed()
            .setTitle("Ban")
            .setColor('RANDOM')
            .addField("Member Banned", toBan)
            .addField("Banned by", message.author)
            .addField("Reason", banReason)
            .addField("Date", message.createdAt)
            .setFooter("2020 Copyright | " + client.user.username);

            message.channel.send(banEmbed)


            const bannedEmbed = new Discord.MessageEmbed()
            .setTitle("You have been banned from " + message.guild.name + "!")
            .addField("Reason", banReason)
            .addField("Executer", message.author)
            .addField("Date", message.createdAt)
            .setColor('RED')
            .setFooter("2020 Copyright | " + client.user.username)
            .setThumbnail("https://emoji.gg/assets/emoji/2819_Banhammer_communist.png");
            
            toBan.send(bannedEmbed)
                .catch(error=> message.reply(`Unable to send a message, ${error}`))

            toBan.ban()
        }
        // Return after code
        return;
      }
      





      const badCmd = new Discord.MessageEmbed()
      .setTitle("**" + message.content + "**" + " is not a command!")
      .setColor("RED")
      .addField("Now don't make another mistake!", "do **\*help**")
      .setFooter("2020 Copyright | Nations")
});

client.on("guildMemberAdd", member=>{
    const welcomeChannel = member.guild.channels.cache.find(channel => channel.name === "welcome")

    if (!welcomeChannel) return;

    welcomeChannel.send(`Welcome ${member.user} to ${member.guild.name}!`)
})

client.on("guildMemberRemove", member=>{
    const leaveChannel = member.guild.channels.cache.find(channel => channel.name === "leaves")

    if (!leaveChannel) return;

    leaveChannel.send(`Goodbye ${member.user.username}\#${member.user.discriminator} :wave:`)
})