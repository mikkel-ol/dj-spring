const config = require("./config");

const helpMsg = `
Hide and seeky!

I support the following commands. 

Default prefix: \`${config.defaultPrefix}\`

\`y! play\`             -    plays link or searches on YouTube - adds to queue if already playing
\`y! stop\`             -    stops the current song
\`y! pause\`           -    pauses playing
\`y! resume\`         -    resumes playing
\`y! playing\`       -    shows the current song playing
\`y! q\`                     -    shows what's in the queue
\`y! shuffle\`       -    shuffles the queue
\`y! volume\`         -    sets volume between \`0%\` and \`100%\`
\`y! fade\`              -   fades volume between \`0%\` and \`100%\`
`;

module.exports = {
    send: (message, prefix) => {
        message.channel.send(helpMsg);
    }
}