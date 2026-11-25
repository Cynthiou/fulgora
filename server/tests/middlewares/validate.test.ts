import express from "express";
import { dateSchema, idParamSchema, timeSchema } from "shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { errorHandler } from "../../src/middlewares/errorHandler.js";
import { validate } from "../../src/middlewares/validate.js";

const itemSchema = z.object({
  name: z.string().min(1),
  date: dateSchema,
  time: timeSchema.optional(),
});

type FieldInError = { field: string; message: string };

// A tiny app whose routes echo back what the action receives.
function buildApp() {
  const app = express();
  app.use(express.json());

  app.get(
    "/items/:id",
    validate({
      params: idParamSchema,
      query: z.object({ from: dateSchema.optional() }),
    }),
    (req, res) => {
      res.json({ params: req.params, query: req.query });
    },
  );

  app.post("/items", validate({ body: itemSchema }), (req, res) => {
    res.json({ body: req.body });
  });

  app.use(errorHandler);
  return app;
}

describe("validate", () => {
  it("turns the id into a number and keeps a valid query", async () => {
    const response = await request(buildApp()).get("/items/42?from=2026-11-25");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      params: { id: 42 },
      query: { from: "2026-11-25" },
    });
  });

  it("refuses an invalid id with the field in error", async () => {
    const response = await request(buildApp()).get("/items/abc");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields).toEqual([
      { field: "id", message: "Identifiant invalide." },
    ]);
  });

  it("trims strings and removes unknown fields from the body", async () => {
    const response = await request(buildApp())
      .post("/items")
      .send({ name: "  Jambes ", date: "2026-11-25", extra: "dropped" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      body: { name: "Jambes", date: "2026-11-25" },
    });
  });

  it("lists every field in error, in French", async () => {
    const response = await request(buildApp())
      .post("/items")
      .send({ name: "", date: "2026-02-30", time: "25:00" });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Certaines données sont invalides.",
    );
    const fields: FieldInError[] = response.body.error.fields;
    expect(fields.map((field) => field.field)).toEqual([
      "name",
      "date",
      "time",
    ]);
    expect(fields[1]?.message).toBe("Date invalide (format AAAA-MM-JJ).");
  });

  it("reports a missing field", async () => {
    const response = await request(buildApp()).post("/items").send({});

    expect(response.status).toBe(400);
    const fields: FieldInError[] = response.body.error.fields;
    const names = fields.map((field) => field.field);
    expect(names).toContain("name");
    expect(names).toContain("date");
  });
});
