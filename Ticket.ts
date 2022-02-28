export default class Ticket {
    private _id: string;
    private _owner: string;
    private _status: boolean;
    private _content: string;

    constructor(id: string, owner: string, status: boolean, content: string = "") {
        this._id = id;
        this._owner = owner;
        this._status = status;
        this._content = content;
    }

    static fromObject(object) {
        return new Ticket(object._id, object._owner, object._status, object._content);
    }

    get id(): string {
        return this._id;
    }

    set id(value: string) {
        this._id = value;
    }

    get owner(): string {
        return this._owner;
    }

    set owner(value: string) {
        this._owner = value;
    }

    get status(): boolean {
        return this._status;
    }

    set status(value: boolean) {
        this._status = value;
    }

    get content(): string {
        return this._content;
    }

    set content(value: string) {
        this._content = value;
    }
}