import {collections} from "../services/database.service";

export default class Student {
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
        if (object == null) return null;
        return new Student(object._id, object._username, object._email, object._code, object._status);
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

    async save() {
        await Student.put(this);
    }

    static async get(id: string) {
        try {
            const query = { _id: id };
            const student = Student.fromObject(await collections.students.findOne(query));

            if (student) {
                return student;
            }
        } catch (error) {
            return undefined;
        }
    }

    static async post(student: Student) {
        try {
            const Student = (student);
            // @ts-ignore
            return await collections.students.insertOne(Student);

        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    static async put(student: Student) {
        await collections.students.updateOne({ _id: (student.id) }, { $set: student });
    }

    static async delete(student: Student) {
        await collections.students.deleteOne({ _id: (student.id) });
    }
}