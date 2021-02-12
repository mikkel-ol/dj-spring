const ytdl = require("ytdl-core"),
    YouTube = require("simple-youtube-api"),
    Util = require("discord.js").Util,
    config = require("./config"),
    youtube = new YouTube(process.env.YOUTUBE_API_KEY),
    embed = require('./embed')
    queue = new Map();

var isFading;

// Play dat funky music!
async function play(message) {
    // Split arguments into array
    const args = message.content.split(" "); // y!,play,hello,adele,trap,remix
    if (!args[2]) return message.channel.send(config.messages.missing.song);
    // Get string to search on youtube by slicing from 3. word onward
    const searchString = args.slice(2).join(" "); // hello adele trap remix

    // Save voice channel the message was sent from
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(config.messages.missing.voicechannel);

    message.delete();

    // It's a playlist
    if (
        args[2].match(
            /^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/
        )
    ) {
        let playlistNoOfSongs = args[3]; // Get no of videos to add to queue
        if (!playlistNoOfSongs) playlistNoOfSongs = 20; // Default to 20
        if (playlistNoOfSongs == "all") playlistNoOfSongs = undefined; // Play all by not sending a limit

        const playlist = await youtube.getPlaylist(args[2]);
        const videos = await playlist.getVideos(playlistNoOfSongs);

        for (const video of Object.values(videos)) {
            const videoResult = await youtube.getVideoByID(video.id);
            await handleQueue(videoResult, message, voiceChannel, true);
        }
        return message.channel.send(
            `✅ Playlist: **${playlist.title}** has been added to the queue!`
        );
    }

    // It's not a playlist
    else {
        try {
            // Play video with a clean URL
            var video = await youtube.getVideo(args[2]);
        } catch (error) {
            // If it's not a url, search for it on YT
            try {
                const videos = await youtube.searchVideos(
                    searchString,
                    config.search.max
                );
                if (videos.length == 0)
                    return message.channel.send(
                        config.messages.missing.searchResult
                    );
                let index = 1;

                // Send message with songs
                message.channel
                    .send(
                        `
__
**Song selection:**__

${videos.map(video => `**${index++}.** ${video.title}`).join("\n")}

Select a song by returning a number on the list.
				`
                    )
                    .then(message => {
                        songSelectMsg = message;
                    });

                try {
                    var response = await message.channel.awaitMessages(
                        reply =>
                            reply.author == message.author &&
                            reply.content.split(" ")[0] > 0 &&
                            reply.content.split(" ")[0] < 11,
                        {
                            max: 1,
                            time: 10000,
                            errors: ["time"],
                        }
                    );
                    songSelectMsg.delete();
                    response.first().delete();
                } catch (err) {
                    if (!(err instanceof Map)) console.error(err);
                    songSelectMsg.delete();
                    return message.channel.send(
                        config.messages.missing.selection
                    );
                }
                response = response.first().content.split(" "); // Split responses into array by white space
                const videoIndex = parseInt(response[0]);
                // Save time to start, if any
                if (response[1]) {
                    if (response[1].indexOf("t=") != -1) {
                        var videoTimeStart = response[1].substr(
                            response[1].indexOf("t=") + 2
                        );
                    }
                }
                var video = await youtube.getVideoByID(
                    videos[videoIndex - 1].id
                );
            } catch (err) {
                console.error(err);
                return;
            }
        }
        // If time to start is given, extract and attach to handleQueue function
        if (args[2].indexOf("&t=") != -1) {
            var videoTimeStart = args[2].substr(args[2].indexOf("&t=") + 3);
        }
        // Check if repeat is set
        if (args[3]) {
            if (args[3].toUpperCase() === "REPEAT") var repeat = true;
        } else var repeat = false;
        // Send song to queue handler function
        return handleQueue(
            video,
            message,
            voiceChannel,
            false,
            videoTimeStart,
            repeat
        );
    }
}

// Stop dat funky music
function stop(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!message.member.voice.channel)
        return message.channel.send(
            "You're not in a voice channel - join one so I know where to stop playing!"
        );
    if (!serverQueue)
        return message.channel.send(
            "How can I stop the moosik if there is nothing playing?!"
        );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
    message.delete();
    return message.channel.send(
        `❌ **${message.author.username}** stopped the fun :(`
    );
}

// What's playing?!
function playing(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue) return message.channel.send("Nothing is playing");
    message.delete();
    return message.channel.send(
        `Now playing: **${serverQueue.songs[0].title}**`
    );
}

// Skippidy skip
function skip(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!message.member.voice.channel)
        return message.channel.send(
            "You're not in a voice channel - why do you want to skip then, you troll?!"
        );
    if (!serverQueue)
        return message.channel.send(
            "How can I skip a song if there is nothing playing?!"
        );
    const song = serverQueue.songs[0];
    serverQueue.connection.dispatcher.end();
    message.delete();
    return message.channel.send(
        `⏩ **${message.author.username}** skipped song: **${song.title}**`
    );
}

// Play dat fun....
function pause(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!message.member.voice.channel)
        return message.channel.send(
            "You're not in a voice channel - no trolling!"
        );
    if (serverQueue && serverQueue.playing) {
        message.delete();
        serverQueue.playing = false;
        serverQueue.connection.dispatcher.pause();
        return message.channel.send("⏸ The music is paused..");
    }
    return message.channel.send("There is nothing playing.");
}

// ..ky music!
function resume(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!message.member.voice.channel)
        return message.channel.send(
            "You're not in a voice channel, so you don't even know if anything is paused!"
        );
    if (serverQueue && !serverQueue.playing) {
        message.delete();
        serverQueue.playing = true;
        serverQueue.connection.dispatcher.resume();
        return message.channel.send("🔊 Resumed music!");
    } else if (serverQueue && serverQueue.playing) {
        return message.channel.send("Already playing music, you deaf?!");
    }
    return message.channel.send("There is nothing playing.");
}

// LOUD NOISES
function volume(message) {
    const serverQueue = queue.get(message.guild.id);
    const args = message.content.split(" ");

    if (!message.member.voice.channel)
        return message.channel.send(
            "You're not in a voice channel - already 0% volume for you!"
        );
    if (!serverQueue)
        return message.channel.send(
            "Can't crank the volume when nothing is playing.."
        );
    if (!args[2]) {
        message.delete();
        return message.channel.send(
            `🔊 Current volume is: **${serverQueue.volume}%**`
        );
    }
    if (args[2] != parseInt(args[2]) || args[2] < 0 || args[2] > 100)
        return message.channel.send(
            "Volume must be a number between 0 and 100."
        );
    message.delete();
    serverQueue.volume = args[2];
    serverQueue.connection.dispatcher.setVolumeLogarithmic(
        serverQueue.volume / config.volume.max
    );
    return message.channel.send(`🔊 Volume is now: **${serverQueue.volume}%**`);
}

// FADINGLY LOUD NOISES
function fade(message) {
    const serverQueue = queue.get(message.guild.id);
    const args = message.content.split(" ");

    if (isFading)
        return message.channel.send(
            "I'm already fading! Try again afterwards.."
        );
    if (!message.member.voice.channel)
        return message.channel.send(
            "You're not in a voice channel - fading hopes!"
        );
    if (!serverQueue) return message.channel.send("How can I fade silence?!");
    if (!args[2])
        return message.channel.send(`You need to tell me what to fade to..`);
    if (args[2] != parseInt(args[2]) || args[2] < 0 || args[2] > 100)
        return message.channel.send(
            "Volume must be a number between 0 and 100."
        );
    message.delete();

    // Calcuate difference between current and desired volume
    var diff = args[2] - serverQueue.volume;
    if (diff == 0) return message.channel.send(`Already at that volume!`);
    // Calculate time out between each step
    const interval = (config.volume.fadeTime * 1000) / Math.abs(diff);

    isFading = true;
    fading(message, diff, serverQueue, interval);
    return;
}

// What's in se queue?!
function q(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue)
        return message.channel.send("Nothing is playing; no queue");
    if (serverQueue.songs.length == 1)
        return message.channel.send(
            `Nothing in queue, now playing: **${serverQueue.songs[0].title}**`
        );

    // Make queue for sending to channel (else message can be too long and org queue includes current song playing)
    let realQueue = serverQueue.songs.slice();
    realQueue.shift(1);
    if (realQueue.length > 20) {
        qLength = realQueue.length - 20;
        realQueue = realQueue.slice(0, 20);
        realQueue.push({ title: `** ... and ${qLength} more**` });
    }
    message.delete();
    return message.channel.send(`
__**Song queue:**__

${realQueue
    .map((song, i, arr) => {
        if (realQueue.length > 20 && arr.length - 1 === i)
            return `${song.title}`;
        else return `• ${song.title}`;
    })
    .join("\n")}
	`);
}

// Shuffle it up
function shuffle(message) {
    const serverQueue = queue.get(message.guild.id);
    if (!serverQueue)
        return message.channel.send(
            "Can't shuffle an empty queue - nothing is playing!"
        );
    if (serverQueue.songs.length == 1)
        return message.channel.send(
            `Nothing in queue, now playing: **${serverQueue.songs[0].title}**`
        );

    // Queue shuffling
    let j, x, i;
    for (i = serverQueue.songs.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = serverQueue.songs[i];
        serverQueue.songs[i] = serverQueue.songs[j];
        serverQueue.songs[j] = x;
    }

    // Make queue for sending to channel (else message can be too long)
    let realQueue = serverQueue.songs.slice();
    realQueue.shift(1);
    if (realQueue.length > 20) {
        qLength = realQueue.length - 20;
        realQueue = realQueue.slice(0, 20);
        realQueue.push({ title: `** ... and ${qLength} more**` });
    }

    message.delete();

    return message.channel.send(`
✅ Queue shuffled

__**New song queue:**__

${realQueue
    .map((song, i, arr) => {
        if (realQueue.length > 20 && arr.length - 1 === i)
            return `${song.title}`;
        else return `• ${song.title}`;
    })
    .join("\n")}
	`);
}

module.exports = {
    play,
    stop,
    playing,
    skip,
    pause,
    resume,
    volume,
    q,
    fade,
    shuffle,
};

/**************************************

			HELPER FUNCTIONS

***************************************/

// Get song and push to queue (and create one if not present) - calls recursive play function
async function handleQueue(
    video,
    msg,
    voiceChannel,
    playlist,
    videoTimeStart,
    repeat
) {
    const serverQueue = queue.get(msg.guild.id);
    const song = {
        id: video.id,
        title: Util.escapeMarkdown(video.title),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        start: 0,
        repeat: repeat,
        thumbnail: video.thumbnails.high.url,
        duration: video.durationSeconds
    };

    // Set time to start if any is given
    if (videoTimeStart) song.start = videoTimeStart;

    // Construct server queue
    if (!serverQueue) {
        const queueConstruct = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: config.volume.default,
            playing: true,
        };
        // Put constructed queue in map with guild ID as key
        queue.set(msg.guild.id, queueConstruct);

        // Push song to songs array
        queueConstruct.songs.push(song);

        try {
            queueConstruct.connection = await voiceChannel.join();

            embed.create(msg, song);

            // Start playing from queue; only 1 song exist first time, but it will keep calling itself until queue is empty.
            // That's why we can just push a new song to queue without interupting the bot playing
            playRecursive(msg.guild, queueConstruct.songs[0]);
        } catch (error) {
            console.error(`I could not join the voice channel: ${error}`);
            queue.delete(msg.guild.id);
            return msg.channel.send(
                `I could not join the voice channel: ${error}`
            );
        }
    } else {
        // Server queue exists
        serverQueue.songs.push(song);

        // If it's a playlist don't send a message
        if (playlist) return;
        else
            // return msg.channel.send(
            //     `✅ **${song.title}** has been added to the queue!`
            // );
            return embed.add(msg, song)
    }
    return;
}

// Recursive function that keeps playing all songs in server queue until empty
function playRecursive(guild, song, repeat) {
    const serverQueue = queue.get(guild.id);

    // If no songs are left in queue, leave voice channel and delete queue
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    // Play the moosik
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url, { begin: song.start }))
        .on("close", () => {
            let currentSong = serverQueue.songs[0];

            let repeat = false;

            if (!currentSong || !currentSong.repeat) {
                serverQueue.songs.shift();
            }
            else  {
                repeat = true;
            }

            playRecursive(guild, serverQueue.songs[0], repeat);
        })
        .on("error", error => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / config.volume.max);
}

// Function that fades volume over time
function fading(message, diff, serverQueue, interval) {
    setTimeout(function() {
        // Sanity check
        if (!serverQueue.connection.dispatcher) return (isFading = false);

        if (diff < 0) {
            diff++;
            serverQueue.volume--;
            serverQueue.connection.dispatcher.setVolumeLogarithmic(
                serverQueue.volume / config.volume.max
            );
        } else {
            diff--;
            serverQueue.volume++;
            serverQueue.connection.dispatcher.setVolumeLogarithmic(
                serverQueue.volume / config.volume.max
            );
        }

        if (diff != 0) {
            fading(message, diff, serverQueue, interval);
        } else {
            message.channel.send(
                `🔊 Volume is now: **${serverQueue.volume}%**`
            );
            return (isFading = false);
        }
    }, interval);
}
