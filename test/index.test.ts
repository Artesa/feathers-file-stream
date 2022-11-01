import assert from "assert";
import { expect } from "vitest";
import * as src from "../src";

describe("index.test.ts", function () {
  it("exports members", function () {
    expect(src.ServiceFileStreamFS).to.be.a("function");
    expect(src.ServiceFileStreamS3).to.be.a("function");

    expect(src.unpipe).to.be.a("function");

    expect(src.expressHandleStreams).to.be.a("function");
    expect(src.expressMiddlewareStream).to.be.a("function");
  });
});
