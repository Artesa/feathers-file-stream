import type { Application } from "@feathersjs/express";
import express from "@feathersjs/express";
import type { ServiceAddons } from "@feathersjs/feathers";
import feathers from "@feathersjs/feathers";
import getPort from "get-port";
import multer from "multer";
import compress from "compression";
import cors from "cors";
import helmet from "helmet";
import type { MulterFile } from "../src";
import {
  expressHandleIncomingStreams,
  expressSendStreamForGet,
  ServiceFileStreamFS
} from "../src";
import path from "node:path";

import makeFeathersClient from "@feathersjs/feathers";
import makeRestClient from "@feathersjs/rest-client";
import fetch from "node-fetch";

type ServicesFS = {
  uploads: ServiceFileStreamFS & ServiceAddons<any>;
};

type MockFSServerOptions = {
  transformItems: (file: MulterFile, req: any, res: any) => any;
};

export const mockFSServer = async (options?: MockFSServerOptions) => {
  const app = express<ServicesFS>(feathers());

  app.use(helmet());
  app.use(cors());
  app.use(compress());
  app.use(express.json());
  app.use(
    express.urlencoded({
      extended: true
    })
  );

  app.configure(express.rest());

  const port = await getPort();

  app.set("port", port);

  const multerInstance = multer();

  app.use(
    "/uploads",
    multerInstance.array("files"),
    expressHandleIncomingStreams({
      field: "files",
      isArray: true,
      transform: options?.transformItems
    }),
    new ServiceFileStreamFS({
      root: path.join(__dirname, "uploads")
    }),
    expressSendStreamForGet()
  );

  app.use(express.notFound());
  app.use(express.errorHandler());

  const server = app.listen(port);

  const promise = new Promise<typeof app>((resolve) => {
    server.on("listening", () => resolve(app));
  });

  return await promise;
};

export const mockClient = (app: Application) => {
  const port = app.get("port");

  const client = makeFeathersClient();

  // Connect to a different URL
  const restClient = makeRestClient(`http://localhost:${port}`);

  client.configure(restClient.fetch(fetch));

  return client;
};
