module.exports = {
    init: () => {
        // Add timestamps in front of log messages
        require("console-stamp")(console, {
            pattern: "dd/mm/yyyy HH:MM:ss",
            colors: {
                stamp: "yellow",
                label: "white",
                metadata: "green",
            },
        });

        // Log all unhandled promise rejection
        process.on("unhandledRejection", console.error);
    },
};
