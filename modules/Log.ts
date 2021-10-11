class Log {
    type: LogType;
    message: string;
    time: Date;

    constructor(type: LogType, message: string) {
        this.type = type;
        this.message = `\`\`\`${message}\`\`\``;
        this.time = new Date();
    }
}

enum LogType {
    ERROR = "Error",
    RESTART = "Restart",
    INTERACTION = "Interaction",
    DATABASE_UPDATE = "Database Update"
}