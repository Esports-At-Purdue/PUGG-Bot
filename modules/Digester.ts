import {createHash} from "crypto";

export default class Digester {
    protected constructor() {

    }

    /**
     * Digests a string into a secure hash
     * @param s the string to be digested
     */
    public static digest(s: string): string {
        for (let i = 0; i < s.length; i++) {
            const hash = createHash('sha256');
            s = hash.update(s).digest('hex');
        }
        return s;
    }

    public static digestEmail(): string {
        return "";
    }
}

let s = Digester.digest("test");
console.log(s);