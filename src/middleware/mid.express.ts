import type { Request, Response, NextFunction } from "express";
import type { MulterFile, ServiceFileStreamGetResult } from "../types";
import { isGetResult } from "../utils";

export type ExpressHandleStreamsOptions = {
  isArray: boolean;
  field: string;
};

type FileOrFiles<T> = T extends true ? MulterFile[] : MulterFile;

export const expressHandleStreams = (options: ExpressHandleStreamsOptions) => {
  const { field, isArray } = options;
  return (
    req: Request & { files?: MulterFile[]; feathers: any },
    res: Response,
    next: NextFunction
  ) => {
    if (
      req.method !== "POST" ||
      !(field in req) ||
      (isArray && !Array.isArray(req[field]))
    ) {
      next();
      return;
    }

    const files = req[field] as FileOrFiles<typeof isArray>;

    req.body = files;

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
