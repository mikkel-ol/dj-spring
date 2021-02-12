const Client = require("discord.js").Client,
    Logger = require("./logger"),
    config = require("./config"),
    help = require("./help"),
    handler = require('./handler'),
    token = process.env.DISCORD_TOKEN;

const bot = new Client();

// Initialize logger with timestamps
Logger.init();

// React to messages being sent
bot.on("message", async message => {
    if (message.author.bot) return;

    // Show help message if sends a DM
    if (message.channel.type === "dm") return help.send(message);

    let prefix = config.defaultPrefix;

    if (!message.content.toLowerCase().startsWith(prefix)) return;

    const command = message.content.toLowerCase().split(" ")[1];

    switch (command) {
        case "play":
            handler.play(message);
            break;

        case "stop":
            handler.stop(message);
            break;

        case "playing":
            handler.playing(message);
            break;

        case "skip":
            handler.skip(message);
            break;

        case "pause":
            handler.pause(message);
            break;

        case "resume":
            handler.resume(message);
            break;

        case "volume":
            handler.volume(message);
            break;

        case "q":
            handler.q(message);
            break;

        case "fade":
            handler.fade(message);
            break;

        case "shuffle":
            handler.shuffle(message);
            break;

        default:
            return;
    }
});

bot.on("error", error => console.error(error));
bot.on("ready", () => console.log(config.messages.ready));

bot.login(token);
