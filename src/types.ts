import type { Readable } from "stream";

export type ServiceFileStreamCreateData = {
  id: string;
  stream: Readable;
};

export type ServiceFileStreamCreateResult = {
  id: string;
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
