import type {
  DeleteObjectCommandInput,
  PutObjectCommandInput,
  S3Client
} from "@aws-sdk/client-s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { GeneralError } from "@feathersjs/errors";
import type { Readable } from "node:stream";
import { PassThrough } from "node:stream";
import { Upload } from "@aws-sdk/lib-storage";
import type {
  ServiceFileStreamCreateData,
  ServiceFileStreamCreateResult,
  ServiceFileStreamGetResult
} from "../types";
import type { MaybeArray } from "../utility-types";
import { asArray } from "../utils";

export type ServiceFileStreamS3Options = {
  s3: S3Client;
  bucket: string;
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
  s3: {
    bucket?: string;
    options: DeleteObjectCommandInput;
  };
  [key: string]: any;
};

export class ServiceFileStreamS3 {
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

    const promises = items.map(async (item) => {
      const { stream, id, ...options } = item;
      const passThroughStream = new PassThrough();

      const defaultParams = {
        Bucket: bucket,
        Key: id,
        Body: passThroughStream
      };

      try {
        const parallelUploads3 = new Upload({
          client: this.s3,
          params: {
            ...defaultParams,
            ...options
          },
          queueSize: 4,
          partSize: 1024 * 1024 * 5,
          leavePartsOnError: false
        });

        stream.pipe(passThroughStream);
        await parallelUploads3.done();
      } catch (e) {
        console.log(e);
      }
    });

    await Promise.all(promises);

    return items.map((item) => ({ id: item.id }));
  }

  async _get(
    id: string,
    params?: ServiceFileStreamS3GetParams
  ): Promise<ServiceFileStreamS3GetResult> {
    const bucket = params?.bucket || this.bucket;
    try {
      const { s3 } = this;
      const params = {
        Bucket: bucket,
        Key: id
      };

      // Head the object to get classic the bare minimum http-headers information
      const headResponse = await s3.send(new HeadObjectCommand(params));
      let header = {};
      header = {
        ...header,
        "Content-Length": headResponse.ContentLength,
        "Content-Type": headResponse.ContentType,
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
      console.log("Error", err);
      throw new GeneralError("Error getting file", {
        error: err
      });
    }
  }

  async _remove(
    id: string,
    params?: ServiceFileStreamS3RemoveParams
  ): Promise<ServiceFileStreamCreateResult> {
    const bucket = params?.s3.bucket || this.bucket;

    const options = params?.s3.options || {};

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
    } catch (error) {
      throw new GeneralError("Error deleting file", {
        error
      });
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

  async move(oldId: string, newId: string) {
    const oldItem = await this._get(oldId);
    const newItem = await this._create({
      id: newId,
      stream: oldItem.stream
    });
    await this._remove(oldId);
    return newItem;
  }
}
