import supertest from "supertest";
import { mockServer } from "./mockApp";
import { transformItems } from "./transformItems";
import { expect } from "vitest";

describe("general.test.ts", function () {
  it("get started", async function () {
    const app = await mockServer();

    const uploadsService = app.service("uploads");

    uploadsService.hooks({
      before: {
        create: [transformItems()]
      }
    });

    const buffer = Buffer.from("some data");

    const { body: uploadResult } = await supertest(app)
      .post("/uploads")
      .attach("files", buffer, "test.txt");

    expect(uploadResult).to.be.an("array");
    expect(uploadResult.length).to.equal(1);
    expect(uploadResult[0]).to.be.an("object");
    expect(uploadResult[0].key).to.be.a("string");
  });
});
