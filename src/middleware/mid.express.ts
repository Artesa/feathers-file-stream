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

const handleFiles = async (req, res, next) => {
  const { method } = req;
  if (method === "POST" || method === "PATCH") {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      next();
    }

    const { associatedServicePath } = req.body;

    let { categoryId, associatedId } = req.body;

    categoryId = tryParseInt(categoryId, null);
    associatedId = tryParseInt(associatedId, null);
    // TODO: Check if associatedServicePath exists

    // eslint-disable-next-line prefer-destructuring, no-undef
    const files: Express.Multer.File[] = req.files;

    const filesObjects: FileObject[] = files.map((file) => {
      return {
        originalName: path.basename(file.originalname),
        fileName: path.basename(file.originalname),
        buffer: file.buffer,
        fileSize: file.size,
        mimeType: file.mimetype,
        associatedServicePath,
        associatedId,
        categoryId
      };
    });

    if (!req.feathers.files) req.feathers.files = filesObjects;
    req.body = filesObjects;

    next();
  } else if (method === "GET") {
    next();
  } else if (method === "DELETE") {
    next();
  } else {
    next();
  }
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
