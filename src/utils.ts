import type { Readable } from "node:stream";
import type { ServiceFileStreamGetResult } from "./types";
import type { MaybeArray } from "./utility-types";

export const asArray = <T>(
  items: MaybeArray<T>
): { isArray: boolean; items: T[] } => {
  const isArray = Array.isArray(items);
  if (isArray) {
    return {
      isArray,
      items
    };
  }
  return {
    isArray,
    items: [items]
  };
};

export const isGetResult = (data: any): data is ServiceFileStreamGetResult => {
  return data?.stream !== undefined;
};

type StreamToGetResult = {
  stream: Readable;
  contentType: string | undefined;
  contentLength: number | undefined;
  contentRange?: string | undefined;
  header?: Record<string, string | undefined>;
}

export const streamToGetResult = (options: StreamToGetResult): ServiceFileStreamGetResult => {
  const header = {};

  for (const key in options.header) {
    if (options.header[key] !== undefined) {
      header[key] = options.header[key];
    }
  }

  return {
    header: {
      ...header,
      "Accept-Ranges": "bytes",
      ...(options.contentType !== undefined ? { "Content-Type": options.contentType } : {}),
      "Content-disposition": "inline",
      ...(options.contentLength !== undefined ? { "Content-Length": options.contentLength } : {}),
      "Content-Length": options.contentLength,
      ...(options.contentRange !== undefined && options.contentLength !== undefined
        ? {
          "Content-Range": options.contentRange,
        }
        : {}),
    },
    status: options.contentRange ? 206 : 200,
    stream: options.stream,
  };
};