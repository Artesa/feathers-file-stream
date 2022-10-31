import type { Readable } from "stream";

export type ServiceFileStreamCreateData = {
  key: string;
  stream: Readable;
};

export type ServiceFileStreamCreateResult = {
  key: string;
};

export type ServiceFileStreamGetResult = {
  header: Record<string, any>;
  stream: Readable;
};

export type MulterFile = {
  fieldName: string;
  originalName: string;
  size: number;
  stream: ReadableStream;
  detectedMimeType: string | null;
  detectedFileExtension: string;
  clientReportedMimeType: string;
  clientReportedFileExtension: string;
};
