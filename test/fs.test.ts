import supertest from "supertest";
import { mockFSServer } from "./utils/mockApp";
import { transformItems } from "./utils";
import { expect } from "vitest";
import fsp from "node:fs/promises";
import path from "node:path";
import { unpipe } from "../src";

describe("fs.test.ts", function () {
  let app: Awaited<ReturnType<typeof mockFSServer>>;

  beforeAll(async () => {
    app = await mockFSServer();

    const uploadsService = app.service("uploads");

    uploadsService.hooks({
      before: {
        create: [transformItems()]
      },
      after: {
        create: [unpipe({ unlink: "path" })]
      },
      error: {
        create: [unpipe({ unlink: "path" })]
      }
    });
  });

  it("get throws NotFound for non-existing file", async () => {
    const res = await supertest(app).get("/uploads/does-not-exist").expect(404);
  });

  it("remove throws NotFound for non-existing file", async () => {
    const res = await supertest(app)
      .delete("/uploads/does-not-exist")
      .expect(404);
  });

  describe("upload", () => {
    it("throws appropriate error for big file", async function () {
      const buffer = Buffer.from("a".repeat(1e6 * 5)); // 5MB

      const result = await supertest(app)
        .post("/uploads")
        .attach("files", buffer, "test.txt")
        .expect(400);

      expect(result.body.name).toBe("BadRequest");
      expect(result.body.message).toBe("File too large");
    });

    it("uploads file", async function () {
      const buffer = Buffer.from("some data");

      const { body: uploadResult } = await supertest(app)
        .post("/uploads")
        .attach("files", buffer, "test.txt")
        .expect(201);

      expect(uploadResult).to.be.an("array");
      expect(uploadResult.length).to.equal(1);
      expect(uploadResult[0]).to.be.an("object");
      expect(uploadResult[0].id).to.be.a("string");
    });
  });

  it("downloads file", async function () {
    const buffer = Buffer.from("some data download file");
    const id = "test-download-file.txt";
    const filepath = path.join(__dirname, "uploads", id);
    await fsp.writeFile(filepath, buffer);

    const result = await supertest(app)
      .get(`/uploads/${id}`)
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

    expect(result.body).to.be.an.instanceOf(Buffer);
    expect(result.body).to.deep.equal(buffer);
    expect(result.header["content-type"]).to.equal("text/plain; charset=utf-8");
    expect(result.header["content-disposition"]).to.equal(
      `attachment;filename= "${id}"`
    );
    expect(result.header["content-length"]).to.equal(`${buffer.length}`);
  });

  it("removes file", async function () {
    const buffer = Buffer.from("some data download file");
    const id = "test-remove-file.txt";
    const filepath = path.join(__dirname, "uploads", id);
    await fsp.writeFile(filepath, buffer);

    const result = await supertest(app).delete(`/uploads/${id}`).expect(200);

    expect(result.body).to.be.an("object");
    expect(result.body.id).to.equal(id);
  });

  it("moves file", async function () {
    const buffer = Buffer.from("some data download file");
    const oldId = "test-move-file.txt";
    const newId = "test-move-file-2.txt";
    const idFolder = (id: string) => path.join(__dirname, "uploads", id);
    await fsp.writeFile(idFolder(oldId), buffer);

    const exists = async (file) =>
      fsp
        .access(file)
        .then(() => true)
        .catch(() => false);

    expect(await exists(idFolder(oldId))).to.be.true;

    await app.service("uploads").move(oldId, newId);

    expect(await exists(idFolder(newId))).to.be.true;
    expect(await fsp.readFile(idFolder(newId))).to.deep.equal(buffer);

    expect(await exists(idFolder(oldId))).to.be.false;
  });
});
