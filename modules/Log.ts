import {ColorResolvable} from "discord.js";

class Log {
    type: LogType;
    message: string;
    color: ColorResolvable;
    time: Date;

    constructor(type: LogType, message: string) {
        this.type = type;
        this.message = message;
        this.time = new Date();

        if (type == LogType.ERROR) this.color = "RED";
        else if (type == LogType.RESTART) this.color = "GREEN";
        else if (type == LogType.INTERACTION) this.color = "YELLOW";
        else this.color = "BLUE"
    }
}

enum LogType {
    ERROR = "Error",
    RESTART = "Restart",
    INTERACTION = "Interaction",
    DATABASE_UPDATE = "Database Update"
}

export {
    Log,
    LogType
}