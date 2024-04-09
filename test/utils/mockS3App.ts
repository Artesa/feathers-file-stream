import type { ServiceAddons } from "@feathersjs/feathers";
import feathers from "@feathersjs/feathers";
import express from "@feathersjs/express";
import { mockClient } from "aws-sdk-client-mock";
import getPort from "get-port";
import multer from "multer";
import compress from "compression";
import cors from "cors";
import helmet from "helmet";
import {
  expressSendStreamForGet,
  expressHandleIncomingStreams,
  ServiceFileStreamS3
} from "../../src";
import type { S3Client } from "@aws-sdk/client-s3";
import path from "node:path";

type Services = {
  uploads: ServiceFileStreamS3 & ServiceAddons<any>;
};

type MockFSServerOptions = {
  s3: S3Client;
  transformItems?: (file: Express.Multer.File, req: any, res: any) => any;
};

export const mockS3Server = async (options: MockFSServerOptions) => {
  const app = express<Services>(feathers());

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

  const multerInstance = multer({
    dest: path.join(__dirname, "../", "temp-uploads/s3")
  });

  app.use(
    "/uploads",
    multerInstance.array("files"),
    expressHandleIncomingStreams({
      field: "files",
      isArray: true,
      transform: options.transformItems
    }),
    new ServiceFileStreamS3({
      s3: options.s3,
      bucket: "test"
    }),
    expressSendStreamForGet()
  );

  app.use(express.notFound());
  app.use(express.errorHandler());

  await app.listen(port);

  return app;
};
