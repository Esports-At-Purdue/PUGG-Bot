import * as config from "../config.json";
import * as request from "postman-request";
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { collections } from "./database.service";
import Student from "../modules/Student";
import {bot} from "../index";

/*
studentsRouter.get("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {

        const query = { _id: new ObjectId(id) };
        const student = Student.fromObject(await collections.students.findOne(query)) as Student;

        if (student) {
            res.status(200).send(student);
        }
    } catch (error) {
        res.status(404).send(`Unable to find matching document with id: ${req.params.id}`);
    }
});
*/

/*
studentsRouter.post("/", async (req: Request, res: Response) => {
    try {
        const Student = req.body as Student;
        // @ts-ignore
        const result = await collections.students.insertOne(Student);

        result
            ? res.status(201).send(`Successfully created a new student with id ${result.insertedId}`)
            : res.status(500).send("Failed to create a new student.");
    } catch (error) {
        console.error(error);
        res.status(400).send(error.message);
    }
});
*/
/*
studentsRouter.put("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const updatedStudent: Student = req.body as Student;
        const query = { _id: new ObjectId(id) };

        const result = await collections.students.updateOne(query, { $set: updatedStudent });

        result
            ? res.status(200).send(`Successfully updated student with id ${id}`)
            : res.status(304).send(`student with id: ${id} not updated`);
    } catch (error) {
        console.error(error.message);
        res.status(400).send(error.message);
    }
});
*/
/*
studentsRouter.delete("/:id", async (req: Request, res: Response) => {
    const id = req?.params?.id;

    try {
        const query = { _id: new ObjectId(id) };
        const result = await collections.students.deleteOne(query);

        if (result && result.deletedCount) {
            res.status(202).send(`Successfully removed student with id ${id}`);
        } else if (!result) {
            res.status(400).send(`Failed to remove student with id ${id}`);
        } else if (!result.deletedCount) {
            res.status(404).send(`student with id ${id} does not exist`);
        }
    } catch (error) {
        console.error(error.message);
        res.status(400).send(error.message);
    }
})
 */