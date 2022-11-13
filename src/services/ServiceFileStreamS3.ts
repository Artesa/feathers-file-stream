import type {
  DeleteObjectCommandInput,
  HeadObjectCommandOutput,
  PutObjectCommandInput,
  S3Client
} from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { FeathersError, GeneralError, NotFound } from "@feathersjs/errors";
import type { Readable } from "node:stream";
import { PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import type {
  ServiceFileStream,
  ServiceFileStreamCreateData,
  ServiceFileStreamCreateResult,
  ServiceFileStreamGetResult
} from "../types";
import type { MaybeArray } from "../utility-types";
import { asArray } from "../utils";
import path from "node:path";

export type ServiceFileStreamS3Options = {
  s3: S3Client;
  bucket: string;
  upload?: {
    /**
     * @default 4
     */
    queueSize?: number;
    /**
     * @default 5 * 1024 * 1024 '(5 MB)'
     */
    partSize?: number;
  };
};

export type ServiceFileStreamS3GetParams = {
  bucket?: string;
  [key: string]: any;
};

export type ServiceFileStreamS3GetResult = ServiceFileStreamGetResult;

export type ServiceFileStreamS3CreateData = Partial<
  Omit<PutObjectCommandInput, "Body">
> &
  ServiceFileStreamCreateData;

export type ServiceFileStreamS3CreateParams = {
  bucket?: string;
  [key: string]: any;
};

export type ServiceFileStreamS3RemoveParams = {
  s3?: {
    bucket?: string;
    options: DeleteObjectCommandInput;
  };
  [key: string]: any;
};

export class ServiceFileStreamS3 implements ServiceFileStream {
  s3: S3Client;
  bucket: string;
  options: ServiceFileStreamS3Options;
  constructor(options: ServiceFileStreamS3Options) {
    this.s3 = options.s3;
    this.bucket = options.bucket;
    this.options = options;
  }

  async _create(
    data: ServiceFileStreamS3CreateData,
    params?: ServiceFileStreamS3CreateParams
  ): Promise<ServiceFileStreamCreateResult>;
  async _create(
    data: ServiceFileStreamS3CreateData[],
    params?: ServiceFileStreamS3CreateParams
  ): Promise<ServiceFileStreamCreateResult[]>;
  async _create(
    data: MaybeArray<ServiceFileStreamS3CreateData>,
    params?: ServiceFileStreamS3CreateParams
  ): Promise<MaybeArray<ServiceFileStreamCreateResult>> {
    const { items } = asArray(data);

    const bucket = params?.bucket || this.bucket;

    const queueSize = this.options.upload?.queueSize || 4;
    const partSize = this.options.upload?.partSize || 5 * 1024 * 1024;

    const promises = items.map(async (item) => {
      const { stream, id, ...options } = item;
      const passThroughStream = new PassThrough();

      const fileName = path.basename(id);

      const defaultParams: PutObjectCommandInput = {
        Bucket: bucket,
        Key: id,
        Body: passThroughStream,
        ContentDisposition: `attachment; filename="${fileName}"`
      };

      try {
        const parallelUploads3 = new Upload({
          client: this.s3,
          params: {
            ...defaultParams,
            ...options
          },
          queueSize,
          partSize,
          leavePartsOnError: false
        });

        parallelUploads3.on("httpUploadProgress", (progress) => {
          console.log(progress);
        });

        stream.pipe(passThroughStream);
        await parallelUploads3.done();
      } catch (err) {
        this.errorHandler(err);
      }
    });

    await Promise.all(promises);

    return items.map((item) => ({ id: item.id }));
  }

  async _get(
    id: string,
    params?: ServiceFileStreamS3GetParams
  ): Promise<ServiceFileStreamS3GetResult> {
    const headResponse = await this.getHeadForObject(id, params);
    const bucket = params?.bucket || this.bucket;
    try {
      const { s3 } = this;
      const params = {
        Bucket: bucket,
        Key: id
      };

      const header = {
        "Content-Length": headResponse.ContentLength,
        "Content-Type": headResponse.ContentType,
        "Content-Disposition": headResponse.ContentDisposition,
        ETag: headResponse.ETag
      };

      // Get the object taggings (optional)
      // if (streamTags === true) {
      //     const taggingResponse = await s3.send(new GetObjectTaggingCommand(params));
      //     taggingResponse.TagSet.forEach((tag) => {
      //         header[`X-TAG-${tag.Key}`] = tag.Value;
      //     });
      // }
      // Prepare cache headers
      // if (typeof cacheExpiration === "number") {
      //   header = {
      //     ...header,
      //     "Cache-Control": "public, max-age=" + cacheExpiration / 1000,
      //     Expires: new Date(Date.now() + cacheExpiration).toUTCString()
      //   };
      // } else {
      //   header = {
      //     ...header,
      //     Pragma: "no-cache",
      //     "Cache-Control": "no-cache",
      //     Expires: 0
      //   };
      // }

      // Now get the object data and stream it
      const response = await s3.send(new GetObjectCommand(params));
      const stream = response.Body as Readable;

      return {
        header,
        stream
      };
    } catch (err) {
      this.errorHandler(err);
    }
  }

  async _remove(
    id: string,
    params?: ServiceFileStreamS3RemoveParams
  ): Promise<ServiceFileStreamCreateResult> {
    await this.checkExistence(id, params);
    const bucket = params?.s3?.bucket || this.bucket;

    const options = params?.s3?.options || {};

    try {
      const result = await this.s3.send(
        new DeleteObjectCommand({
          ...options,
          Bucket: bucket,
          Key: id
        })
      );

      return {
        id
      };
    } catch (err) {
      this.errorHandler(err);
    }
  }

  get(id: string, params?: any): Promise<ServiceFileStreamGetResult> {
    return this._get(id, params);
  }

  create(
    data: ServiceFileStreamS3CreateData,
    params?: ServiceFileStreamS3CreateParams
  ): Promise<ServiceFileStreamCreateResult>;
  create(
    data: ServiceFileStreamS3CreateData[],
    params?: ServiceFileStreamS3CreateParams
  ): Promise<ServiceFileStreamCreateResult[]>;
  create(
    data: MaybeArray<ServiceFileStreamS3CreateData>,
    params?: ServiceFileStreamS3CreateParams
  ): Promise<MaybeArray<ServiceFileStreamCreateResult>> {
    return this._create(data, params);
  }

  remove(
    id: string,
    params?: ServiceFileStreamS3RemoveParams
  ): Promise<ServiceFileStreamCreateResult> {
    return this._remove(id, params);
  }

  async getHeadForObject(
    id: string,
    params?: any
  ): Promise<HeadObjectCommandOutput> {
    const bucket = params?.bucket || this.bucket;
    const { s3 } = this;

    try {
      return await s3.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: id
        })
      );
    } catch (err) {
      throw new NotFound("File not found", {
        error: err
      });
    }
  }

  async checkExistence(
    id: string,
    params?: ServiceFileStreamS3GetParams
  ): Promise<void> {
    await this.getHeadForObject(id, params);
  }

  async move(oldId: string, newId: string) {
    try {
      const oldItem = await this._get(oldId);
      const newItem = await this._create({
        id: newId,
        stream: oldItem.stream
      });
      await this._remove(oldId);
      return newItem;
    } catch (err) {
      this.errorHandler(err);
    }
  }

  errorHandler(err) {
    console.log(err);
    if (!err) return;

    if (err instanceof FeathersError) {
      throw err;
    }

    throw new GeneralError("Error", {
      error: err
    });
  }
}
