import type { Request, Response, NextFunction } from "express";
import type { ServiceFileStreamGetResult } from "../types";
import { asArray, isGetResult } from "../utils";
import fs from "node:fs";
import "multer";
import { BadRequest } from "@feathersjs/errors";

export type expressHandleIncomingStreamsOptions<
  REQ,
  RES,
  TR extends Record<string, any> = any
> = {
  isArray: boolean;
  field: string;
  transform?: (file: Express.Multer.File, req: REQ, res: RES) => TR | void;
};

export const expressHandleIncomingStreams = <
  REQ extends Request = Request & {
    files?: Express.Multer.File[];
    feathers: any;
  },
  RES extends Response = Response,
  RT extends Record<string, any> = Record<string, any>
>(
    options: expressHandleIncomingStreamsOptions<REQ, RES, RT>
  ) => {
  const { field } = options;
  return (err: Error | undefined, req: REQ, res: RES, next: NextFunction) => {
    if (err) {
      return next(err);
    }

    if (
      req.method !== "POST" ||
      !(field in req) ||
      (options.isArray && !Array.isArray(req[field]))
    ) {
      return next();
    }

    const { isArray, items } = asArray<Express.Multer.File>(req[field]);

    items.forEach((file) => {
      file.stream = fs.createReadStream(file.path);
    });

    const files = options.transform
      ? items.map((file) => {
        return options.transform(file, req, res) || file;
      })
      : items;

    req.body = isArray ? files : files[0];

    return next();
  };
};

const errorMessages = {
  LIMIT_PART_COUNT: "Too many parts",
  LIMIT_FILE_SIZE: "File too large",
  LIMIT_FILE_COUNT: "Too many files",
  LIMIT_FIELD_KEY: "Field name too long",
  LIMIT_FIELD_VALUE: "Field value too long",
  LIMIT_FIELD_COUNT: "Too many fields",
  LIMIT_UNEXPECTED_FILE: "Unexpected field",
  MISSING_FIELD_NAME: "Field name missing"
};

export const expressHandleMulterError =
  () =>
    (err: Error | undefined, req: Request, res: Response, next: NextFunction) => {
      if (!err) {
        return next();
      }

      let feathersError = err;
      switch (err.code) {
        case "LIMIT_PART_COUNT":
          feathersError = new BadRequest(errorMessages.LIMIT_PART_COUNT);
          break;
        case "LIMIT_FILE_SIZE":
          feathersError = new BadRequest(errorMessages.LIMIT_FILE_SIZE);
          break;
        case "LIMIT_FILE_COUNT":
          feathersError = new BadRequest(errorMessages.LIMIT_FILE_COUNT);
          break;
        case "LIMIT_FIELD_KEY":
          feathersError = new BadRequest(errorMessages.LIMIT_FIELD_KEY);
          break;
        case "LIMIT_FIELD_VALUE":
          feathersError = new BadRequest(errorMessages.LIMIT_FIELD_VALUE);
          break;
        case "LIMIT_FIELD_COUNT":
          feathersError = new BadRequest(errorMessages.LIMIT_FIELD_COUNT);
          break;
        case "LIMIT_UNEXPECTED_FILE":
          feathersError = new BadRequest(errorMessages.LIMIT_UNEXPECTED_FILE);
          break;
        case "MISSING_FIELD_NAME":
          feathersError = new BadRequest(errorMessages.MISSING_FIELD_NAME);
          break;
        default:
          break;
      }

      next(feathersError);
    };

export const expressSendStreamForGet =
  () =>
    (
      err: Error,
      req: Request,
      res: Response & { data: ServiceFileStreamGetResult },
      next: NextFunction
    ) => {
      if (err) {
        return next(err);
      }

      if (req.method !== "GET" || !isGetResult(res.data)) {
        return next();
      }

      const { stream, header = {} } = res.data;

      res.set(header);

      stream.on("data", (chunk) => res.write(chunk));
      stream.once("end", () => res.end());
      stream.once("error", (err) => {
        res.end();
      });
    };
