import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import * as config from "../config.json";
import {bot} from "../index";

export const collections: { users?: mongoDB.Collection, tickets?: mongoDB.Collection, students?: mongoDB.Collection } = {}

export async function connectToDatabase () {
    dotenv.config();

    const client: mongoDB.MongoClient = new mongoDB.MongoClient(`mongodb://${config.mongo.username}:${config.mongo.password}@technowizzy.dev:27017/?authMechanism=DEFAULT`);

    await client.connect();

    const db: mongoDB.Db = client.db("PUGG");

    const ticketCollection: mongoDB.Collection = db.collection("tickets");
    const studentCollection: mongoDB.Collection = db.collection("students");

    collections.tickets = ticketCollection;
    collections.students = studentCollection;

    await bot.logger.info(`Connected to ${db.databaseName} Database`);
}