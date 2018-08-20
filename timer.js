class Timer {
    constructor() {
        this.timers = {};
        this.messages = {};
    }

    start(message) {
        this.timers[message] = new Date();
    }

    stop(message) {
        let now = new Date();
        let started = this.timers[message];
        delete this.timers[message];
        let ms = now - started;
        this.messages[message] = ms;
    }

    cleanup() {
        Object.keys(this.timers).forEach(key => {
            this.stop(key);
        });
    }
}

module.exports.Timer = Timer;