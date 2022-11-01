import supertest from "supertest";
import { mockFSServer } from "./mockApp";
import { transformItems } from "./utils";
import { expect } from "vitest";
import fsp from "fs/promises";
import path from "path";

describe("general.test.ts", function () {
  let app: Awaited<ReturnType<typeof mockFSServer>>;

  beforeAll(async () => {
    app = await mockFSServer();

    const uploadsService = app.service("uploads");

    uploadsService.hooks({
      before: {
        create: [transformItems()]
      }
    });
  });

  it("upload file", async function () {
    const buffer = Buffer.from("some data");

    const { body: uploadResult } = await supertest(app)
      .post("/uploads")
      .attach("files", buffer, "test.txt")
      .expect(201);

    expect(uploadResult).to.be.an("array");
    expect(uploadResult.length).to.equal(1);
    expect(uploadResult[0]).to.be.an("object");
    expect(uploadResult[0].key).to.be.a("string");
  });

  it("download file", async function () {
    const buffer = Buffer.from("some data download file");
    const key = "test-download-file.txt";
    const filepath = path.join(__dirname, "uploads", key);
    await fsp.writeFile(filepath, buffer);

    const { body: downloadResult } = await supertest(app)
      .get(`/uploads/${key}`)
      .buffer()
      .parse((res, cb) => {
        res.setEncoding("binary");
        res.data = "";
        res.on("data", (chunk) => {
          res.data += chunk;
        });
        res.on("end", () => cb(null, Buffer.from(res.data, "binary")));
      })
      .expect(200);

    expect(downloadResult).to.be.an.instanceOf(Buffer);
    expect(downloadResult).to.deep.equal(buffer);
  });

  it("remove file", async function () {
    const buffer = Buffer.from("some data download file");
    const key = "test-remove-file.txt";
    const filepath = path.join(__dirname, "uploads", key);
    await fsp.writeFile(filepath, buffer);

    const result = await supertest(app).delete(`/uploads/${key}`).expect(200);

    expect(result.body).to.be.an("object");
    expect(result.body.key).to.equal(key);
  });
});
