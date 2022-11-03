import supertest from "supertest";
import { mockFSServer } from "./utils/mockApp";
import { transformItems, transformItemsNested } from "./utils";
import { expect } from "vitest";
import fsp from "node:fs/promises";
import path from "node:path";
import type { HookContext } from "@feathersjs/feathers";

describe("fs-nested.test.ts", function () {
  let app: Awaited<ReturnType<typeof mockFSServer>>;

  beforeAll(async () => {
    app = await mockFSServer();

    const uploadsService = app.service("uploads");

    uploadsService.hooks({
      before: {
        get: [
          (context: HookContext) => {
            // @ts-ignore
            context.id = `test/test/${context.id}`;
            return context;
          }
        ],
        create: [transformItemsNested()],
        remove: [
          (context: HookContext) => {
            // @ts-ignore
            context.id = `test/test/${context.id}`;
            return context;
          }
        ]
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
    expect(uploadResult[0].id).to.be.a("string");
    expect(uploadResult[0].id.startsWith("test/test/")).to.be.true;
  });

  it("download file", async function () {
    const buffer = Buffer.from("some data download file");
    const id = "test-download-file.txt";
    const filepath = path.join(__dirname, "uploads/test/test/", id);
    await fsp.writeFile(filepath, buffer);

    const { body: downloadResult } = await supertest(app)
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

    expect(downloadResult).to.be.an.instanceOf(Buffer);
    expect(downloadResult).to.deep.equal(buffer);
  });

  it("remove file", async function () {
    const buffer = Buffer.from("some data download file");
    const id = "test-remove-file.txt";
    const filepath = path.join(__dirname, "uploads/test/test/", id);
    await fsp.writeFile(filepath, buffer);

    const result = await supertest(app).delete(`/uploads/${id}`).expect(200);

    expect(result.body).to.be.an("object");
    expect(result.body.id).to.equal(`test/test/${id}`);
  });

  it("move file", async function () {
    const buffer = Buffer.from("some data download file");
    const oldId = "test1/test/test-move-file.txt";
    const newId = "test2/test/test-move-file-2.txt";
    const idFolder = (id: string) => path.join(__dirname, "uploads", id);
    await fsp.mkdir(path.dirname(idFolder(oldId)), { recursive: true });
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
