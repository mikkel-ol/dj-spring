const path = require('path');
const colors = require(path.join(__dirname, "common/colors"));

module.exports = {
    defaultPrefix: 'y!',
    volume: {
        default: 50,
        max: 100,
        fadeTime: 4
    },
    search: {
        max: 10
    },
    messages: {
        ready: colors.green + 'Ready: ' + colors.blue + 'DJ Spring' + colors.default + ' - fired up and ready to serve!',
        missing: {
            song: "I need to know what to play..",
            searchResult: "No search results on YouTube..",
            selection: "I need a number from 1-10 within 10 seconds. Cancelled song selection.",
            voicechannel: "Join a voice channel so I know where to play sweet music!"
        }
    }
}