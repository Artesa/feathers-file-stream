import type { Request, Response, NextFunction } from "express";
import type { ServiceFileStreamGetResult } from "../types";
import { asArray, isGetResult } from "../utils";
import fs from "node:fs";
import "multer";

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
  return (req: REQ, res: RES, next: NextFunction) => {
    if (
      req.method !== "POST" ||
      !(field in req) ||
      (options.isArray && !Array.isArray(req[field]))
    ) {
      next();
      return;
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

    next();
    return;
  };
};

export const expressSendStreamForGet =
  () =>
    (
      req: Request,
      res: Response & { data: ServiceFileStreamGetResult },
      next: NextFunction
    ) => {
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
