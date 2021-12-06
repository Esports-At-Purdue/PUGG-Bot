import {collections} from "./services/database.service";

export default class newUser {
    private _id: string;
    private _username: string;
    private _email: string;
    private _code: number;
    private _status: boolean;

    constructor(id: string, username: string, email: string, code: number, status: boolean) {
        this._id = id;
        this._username = username;
        this._email = email;
        this._code = code;
        this._status = status;
    }

    static fromObject(object) {
        return new newUser(object._id, object._username, object._email, object._code, object._status);
    }

    get id(): string {
        return this._id;
    }

    set id(value: string) {
        this._id = value;
    }

    get username(): string {
        return this._username;
    }

    set username(value: string) {
        this._username = value;
    }

    get email(): string {
        return this._email;
    }

    set email(value: string) {
        this._email = value;
    }

    get code(): number {
        return this._code;
    }

    set code(value: number) {
        this._code = value;
    }

    get status(): boolean {
        return this._status;
    }

    set status(value: boolean) {
        this._status = value;
    }

    static async get(id: string) {
        try {
            const query = { _id: id };
            const user = newUser.fromObject(await collections.users.findOne(query));

            if (user) {
                return user;
            }
        } catch (error) {
            return undefined;
        }
    }

    static async post(user: newUser) {
        try {
            const newUser = (user);
            // @ts-ignore
            return await collections.users.insertOne(newUser);

        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    static async put(user: newUser) {
        await collections.users.updateOne({ _id: (user.id) }, { $set: user });
    }

    static async delete(user: newUser) {
        await collections.users.deleteOne({ _id: (user.id) });
    }
}