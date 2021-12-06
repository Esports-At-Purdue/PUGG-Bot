import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";

export const collections: { users?: mongoDB.Collection, tickets?: mongoDB.Collection } = {}

export async function connectToDatabase () {
    dotenv.config();

    const client: mongoDB.MongoClient = new mongoDB.MongoClient("mongodb://localhost:27017");

    await client.connect();

    const db: mongoDB.Db = client.db("PUGG");

    const usersCollection: mongoDB.Collection = db.collection("users");
    const ticketCollection: mongoDB.Collection = db.collection("tickets");

    collections.users = usersCollection;
    collections.tickets = ticketCollection;

    console.log(`Successfully connected to database: ${db.databaseName} and collections: ${usersCollection.collectionName}, ${ticketCollection.collectionName}`);
}