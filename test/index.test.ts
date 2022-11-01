import { expect } from "vitest";
import * as src from "../src";

describe("index.test.ts", function () {
  it("exports members", function () {
    // services
    expect(src.ServiceFileStreamFS).to.be.a("function");
    expect(src.ServiceFileStreamS3).to.be.a("function");

    // hooks
    expect(src.unpipe).to.be.a("function");

    // middleware
    expect(src.expressHandleIncomingStreams).to.be.a("function");
    expect(src.expressSendStreamForGet).to.be.a("function");
  });
});
