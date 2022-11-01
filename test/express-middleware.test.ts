import supertest from "supertest";
import { mockFSServer } from "./mockApp";
import { expect } from "vitest";

describe("express-middleware.test.ts", function () {
  it("upload file", async function () {
    let transformCalled = false;
    const app = await mockFSServer({
      transformItems: (file) => {
        transformCalled = true;
        return {
          ...file,
          test: true
        };
      }
    });

    const uploadsService = app.service("uploads");

    let hookCalled = false;

    uploadsService.hooks({
      before: {
        create: [
          (context) => {
            const { data } = context;

            expect(data).to.be.an("array");
            expect(data.length).to.equal(1);

            const [obj] = data;

            expect(obj).to.be.an("object");
            expect(obj).to.have.property("stream");
            expect(obj.test).to.be.true;

            hookCalled = true;

            throw new Error("");
          }
        ]
      }
    });

    const buffer = Buffer.from("some data");

    await supertest(app).post("/uploads").attach("files", buffer, "test.txt");

    expect(transformCalled).to.be.true;
    expect(hookCalled).to.be.true;
  });
});
