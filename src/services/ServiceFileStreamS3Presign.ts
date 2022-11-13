import type {
  DeleteObjectCommandInput,
  HeadObjectCommandOutput,
  S3Client
} from "@aws-sdk/client-s3";
import {
  CopyObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  BadRequest,
  FeathersError,
  GeneralError,
  NotFound
} from "@feathersjs/errors";
import type { ServiceFileStreamCreateResult } from "../types";
import type { MaybeArray } from "../utility-types";
import { asArray } from "../utils";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import _pick from "lodash/pick";

export type ServiceFileStreamS3PresignOptions = {
  s3: S3Client;
  bucket: string;
};

export type ServiceFileStreamS3PresignGetParams = {
  bucket?: string;
  [key: string]: any;
};

export type ServiceFileStreamS3PresignGetResult = {
  id: string;
  url: string;
};

export type ServiceFileStreamS3PresignCreateData = {
  id: string;
};

export type ServiceFileStreamS3PresignCreateParams = {
  bucket?: string;
  [key: string]: any;
};

export type ServiceFileStreamS3PresignCreateResult = {
  id: string;
  url: string;
};

export type ServiceFileStreamS3PresignRemoveParams = {
  s3?: {
    bucket?: string;
    options: DeleteObjectCommandInput;
  };
  [key: string]: any;
};

const signingOptions = [
  "expiresIn",
  "signableHeaders",
  "signingDate",
  "signingRegion",
  "signingService",
  "unhoistableHeaders",
  "unsignableHeaders"
];

export class ServiceFileStreamS3Presign {
  s3: S3Client;
  bucket: string;
  options: ServiceFileStreamS3PresignOptions;
  constructor(options: ServiceFileStreamS3PresignOptions) {
    this.s3 = options.s3;
    this.bucket = options.bucket;
    this.options = options;
  }

  async createSignedUrl(command: any, options: any) {
    try {
      const url = await getSignedUrl(
        this.s3,
        command,
        _pick(options, signingOptions)
      );
      return { url };
    } catch (err) {
      this.errorHandler(err);
    }
  }

  async _create(
    data: ServiceFileStreamS3PresignCreateData,
    params?: ServiceFileStreamS3PresignCreateParams
  ): Promise<ServiceFileStreamS3PresignCreateResult>;
  async _create(
    data: ServiceFileStreamS3PresignCreateData[],
    params?: ServiceFileStreamS3PresignCreateParams
  ): Promise<ServiceFileStreamS3PresignCreateResult[]>;
  async _create(
    data: MaybeArray<ServiceFileStreamS3PresignCreateData>,
    params?: ServiceFileStreamS3PresignCreateParams
  ): Promise<MaybeArray<ServiceFileStreamS3PresignCreateResult>> {
    const { items, isArray } = asArray(data);
    const bucket = params?.bucket ?? this.bucket;

    items.forEach((item) => {
      if (!item.id) {
        throw new BadRequest("create: expected missing 'id' parameter");
      }
    });

    try {
      const promises = items.map(async (item) => {
        // Create the putCommand
        const putCommand = new PutObjectCommand({
          Key: item.id,
          Bucket: bucket
        });
        // Run the command
        const result = await this.createSignedUrl(putCommand, data);

        return {
          id: item.id,
          url: result.url
        };
      });

      const result = await Promise.all(promises);

      return isArray ? result : result[0];
    } catch (err) {
      this.errorHandler(err);
    }
  }

  async _get(
    id: string,
    params?: ServiceFileStreamS3PresignGetParams
  ): Promise<ServiceFileStreamS3PresignGetResult> {
    const bucket = params?.bucket || this.bucket;
    try {
      // Check id
      if (!id) throw new BadRequest("get: expected missing 'id' parameter");
      // Create the getCommand
      const getCommand = new GetObjectCommand({
        Key: id,
        Bucket: bucket
      });
      // Run the command
      const result = await this.createSignedUrl(getCommand, params);

      return {
        id,
        ...result
      };
    } catch (err) {
      this.errorHandler(err);
    }
  }

  async _remove(
    id: string,
    params?: ServiceFileStreamS3PresignRemoveParams
  ): Promise<ServiceFileStreamCreateResult> {
    // Check id
    if (!id) throw new BadRequest("remove: expected missing 'id' parameter");

    const bucket = params?.s3?.bucket ?? this.bucket;
    // Create the deleteCommand
    const deleteCommand = new DeleteObjectCommand({
      Key: id,
      Bucket: bucket
    });
    try {
      await this.s3.send(deleteCommand);
      return { id };
    } catch (err) {
      this.errorHandler(err);
    }
  }

  get(id: string, params?: any): Promise<ServiceFileStreamS3PresignGetResult> {
    return this._get(id, params);
  }

  create(
    data: ServiceFileStreamS3PresignCreateData,
    params?: ServiceFileStreamS3PresignCreateParams
  ): Promise<ServiceFileStreamS3PresignCreateResult>;
  create(
    data: ServiceFileStreamS3PresignCreateData[],
    params?: ServiceFileStreamS3PresignCreateParams
  ): Promise<ServiceFileStreamS3PresignCreateResult[]>;
  create(
    data: MaybeArray<ServiceFileStreamS3PresignCreateData>,
    params?: ServiceFileStreamS3PresignCreateParams
  ): Promise<MaybeArray<ServiceFileStreamS3PresignCreateResult>> {
    return this._create(data, params);
  }

  remove(
    id: string,
    params?: ServiceFileStreamS3PresignRemoveParams
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
    params?: ServiceFileStreamS3PresignGetParams
  ): Promise<void> {
    await this.getHeadForObject(id, params);
  }

  async move(oldId: string, newId: string) {
    try {
      await this.s3.send(
        new CopyObjectCommand({
          CopySource: `${this.bucket}/${oldId}`,
          Bucket: this.bucket,
          Key: newId
        })
      );

      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: oldId
        })
      );

      return { id: newId };
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
