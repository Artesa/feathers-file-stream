import type { Request, Response, NextFunction } from "express";
import type { MulterFile, ServiceFileStreamGetResult } from "../types";

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

export const expressMiddlewareStream =
  () => (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || !("data" in res)) {
      return next();
    }

    const { stream, header } =
      res.data as unknown as ServiceFileStreamGetResult;

    res.set(header);

    stream.on("data", (chunk) => res.write(chunk));
    stream.once("end", () => res.end());
    stream.once("error", (err) => {
      res.end();
    });
  };
