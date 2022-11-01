import supertest from "supertest";
import { mockFSServer } from "./mockApp";
import { transformItems } from "./utils";
import { expect } from "vitest";
import fsp from "fs/promises";
import path from "path";

describe("fs.test.ts", function () {
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

  it("get throws NotFound for non-existing file", async () => {
    const res = await supertest(app).get("/uploads/does-not-exist").expect(404);
  });

  it("remove throws NotFound for non-existing file", async () => {
    const res = await supertest(app)
      .delete("/uploads/does-not-exist")
      .expect(404);
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
  });

  it("download file", async function () {
    const buffer = Buffer.from("some data download file");
    const id = "test-download-file.txt";
    const filepath = path.join(__dirname, "uploads", id);
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
    const filepath = path.join(__dirname, "uploads", id);
    await fsp.writeFile(filepath, buffer);

    const result = await supertest(app).delete(`/uploads/${id}`).expect(200);

    expect(result.body).to.be.an("object");
    expect(result.body.id).to.equal(id);
  });

  it("move file", async function () {
    const buffer = Buffer.from("some data download file");
    const id = "test-move-file.txt";
    const filepath = path.join(__dirname, "uploads", id);
    await fsp.writeFile(filepath, buffer);

    const exists = async (file) =>
      fsp
        .access(file)
        .then(() => true)
        .catch(() => false);

    expect(await exists(filepath)).to.be.true;

    app.service("uploads").move(id, "test-move-file-2.txt");

    expect(
      await exists(path.join(__dirname, "uploads", "test-move-file-2.txt"))
    ).to.be.true;
    expect(
      await fsp.readFile(
        path.join(__dirname, "uploads", "test-move-file-2.txt")
      )
    ).to.deep.equal(buffer);

    expect(await exists(filepath)).to.be.false;
  });
});
