import * as express from "express";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { collections } from "./database.service";
import Ticket from "../modules/Ticket";

export const ticketsRouter = express.Router();

ticketsRouter.use(express.json());

ticketsRouter.get("/", async (_req: Request, res: Response) => {
    try {
        const tickets = (await collections.tickets.find({}).toArray()) as Object[];

        res.status(200).send(tickets);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

ticketsRouter.get("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {

        const query = { _id: new ObjectId(id) };
        const ticket = Ticket.fromObject(await collections.tickets.findOne(query)) as Ticket;

        if (ticket) {
            res.status(200).send(ticket);
        }
    } catch (error) {
        res.status(404).send(`Unable to find matching document with id: ${req.params.id}`);
    }
});

ticketsRouter.post("/", async (req: Request, res: Response) => {
    try {
        const Ticket = req.body as Ticket;
        // @ts-ignore
        const result = await collections.tickets.insertOne(Ticket);

        result
            ? res.status(201).send(`Successfully created a new ticket with id ${result.insertedId}`)
            : res.status(500).send("Failed to create a new ticket.");
    } catch (error) {
        console.error(error);
        res.status(400).send(error.message);
    }
});

ticketsRouter.put("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const updatedTicket: Ticket = req.body as Ticket;
        const query = { _id: new ObjectId(id) };

        const result = await collections.tickets.updateOne(query, { $set: updatedTicket });

        result
            ? res.status(200).send(`Successfully updated ticket with id ${id}`)
            : res.status(304).send(`ticket with id: ${id} not updated`);
    } catch (error) {
        console.error(error.message);
        res.status(400).send(error.message);
    }
});

ticketsRouter.delete("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const query = { _id: new ObjectId(id) };
        const result = await collections.tickets.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).send(`Successfully removed ticket with id ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove ticket with id ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`ticket with id ${id} does not exist`);
        }
    } catch (error) {
        console.error(error.message);
        res.status(400).send(error.message);
    }
});