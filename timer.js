class Timer {
    constructor(id) {
        this.id = id;
        this.timers = {};
        this.messages = {};
    }

    start(message) {
        this.timers[message] = new Date();
    }

    stop(message) {
        let now = new Date();
        let started = this.timers[message];
        let ms = now - started;
        this.messages[message] = ms;
    }
}

module.exports.Timer = Timer;