const { MessageEmbed } = require("discord.js");

// global map of embed message for all guilds
let embeds = new Map();

function fancyTimeFormat(duration) {
  // Hours, minutes and seconds
  var hrs = ~~(duration / 3600);
  var mins = ~~((duration % 3600) / 60);
  var secs = ~~duration % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = "";

  if (hrs > 0) {
    ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
  }

  ret += "" + mins + ":" + (secs < 10 ? "0" : "");
  ret += "" + secs;
  return ret;
}

async function create(message, song) {
  const guild = await message.client.guilds.fetch(
    "588030636502155266",
    true,
    true
  );

  const patreonEmoji = guild.emojis.cache.get("778675650873524276");
  const beepbotEmoji = guild.emojis.cache.get("778678326587949056");

  let embed = new MessageEmbed();

  embed
    .setColor("#c4302b")
    .setTitle("🎶  Playing from YouTube")
    .setAuthor("\u200b")
    .setDescription("\u200b")
    .setThumbnail(song.thumbnail)
    .addFields(
      { name: song.title, value: song.author },
      { name: "\u200b", value: "\u200b" },
      {
        name: "Ⓞ--------------------------------------------------------------",
        value: "0:00 / " + fancyTimeFormat(song.duration),
      }
    )
    .addField("\u200b", "\u200b")
    .addField("\u200b", "\u200b")
    .addField(
      "\u200b",
      `${beepbotEmoji} \u200b [Website](https://beepbot.net) \u200b | \u200b ${patreonEmoji} \u200b [Support](https://imgur.com/LjbefKs 'Need coffee ☕️')`,
      false
    );

  embeds.set(message.guild.id, {
    message: null,
    content: embed,
    queue: [song],
    queueString: "",
  });

  message.channel
    .send(embed)
    .then((msg) => (embeds.get(msg.guild.id).message = msg));
}

function deleteEmbed() {}

function add(message, song) {
  let embed = embeds.get(message.guild.id);

  embed.queue.push(song);

  let noOfSongsInQueue = embed.queue.length;
    
  embed.queueString += `${noOfSongsInQueue - 1}. \u200b ${song.title}\n`;

  if (noOfSongsInQueue == 2) {
    embed.content.fields[3] = { name: "🚦  Queue:", value: "\u200b" };
  }

  embed.content.fields[4] = {
    name: "1-10",
    value: embed.queueString,
    inline: true,
  };

  embeds.set(message.guild.id, embed);

  update(message.guild.id);
}

function remove() {}

function pause() {}

function resume() {}

function update(id) {
  let embed = embeds.get(id);
  embed.message.edit(embed.content);
}

module.exports = {
  create,
  add,
  remove,
  deleteEmbed,
  pause,
  resume,
};
