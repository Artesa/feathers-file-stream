import supertest from "supertest";
import { mockFSServer } from "./mockApp";
import { transformItems } from "./utils";
import { expect } from "vitest";
import fsp from "fs/promises";
import path from "path";
import { FeathersError } from "@feathersjs/errors";
import { unpipe } from "../src";
import { Readable } from "stream";

describe("unpipe.test.ts", function () {
  it("unpipe", async function () {
    const app = await mockFSServer();

    const uploadsService = app.service("uploads");

    let throwHookRun = false;
    let checkErrorRun = false;

    uploadsService.hooks({
      before: {
        create: [
          transformItems(),
          (context) => {
            throw new FeathersError("test", "test", 900, "test", {});
          }
        ]
      },
      error: {
        create: [
          (context) => {
            expect(context.error).to.be.an.instanceOf(FeathersError);
            expect(context.error.code).to.equal(900);
            expect(context.data).to.be.an("array");
            expect(context.data.length).to.equal(1);
            expect(context.data[0]).to.be.an("object");
            expect(context.data[0].stream).to.be.an.instanceOf(Readable);

            throwHookRun = true;
          },
          unpipe(),
          (context) => {
            checkErrorRun = true;
            const isDestroyed = context.data[0].stream.destroyed;
            expect(isDestroyed).to.equal(true);
          }
        ]
      }
    });
    const buffer = Buffer.from("some data");

    const { body: uploadResult } = await supertest(app)
      .post("/uploads")
      .attach("files", buffer, "test.txt")
      .expect(900);

    expect(throwHookRun).to.equal(true);
    expect(checkErrorRun).to.equal(true);
  });
});
