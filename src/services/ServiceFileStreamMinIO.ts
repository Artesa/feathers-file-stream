import { FeathersError, GeneralError, NotFound } from "@feathersjs/errors";
import type { Client } from "minio";
import path from "node:path";
import { PassThrough } from "node:stream";
import type {
  ServiceFileStream,
  ServiceFileStreamCreateData,
  ServiceFileStreamCreateResult,
  ServiceFileStreamGetResult
} from "../types";
import type { MaybeArray } from "../utility-types";
import { asArray } from "../utils";

export type ServiceFileStreamMinIOOptions = {
  client: Client;
  bucket?: string;
};

export type ServiceFileStreamMinIOGetParams = {
  bucket?: string;
  [key: string]: any;
};

export type ServiceFileStreamMinIOGetResult = ServiceFileStreamGetResult;

export type ServiceFileStreamMinIOCreateData = ServiceFileStreamCreateData;

export type ServiceFileStreamMinIOCreateParams = {
  bucket?: string;
  [key: string]: any;
};

export type ServiceFileStreamMinIORemoveParams = {
  minio?: {
    bucket?: string;
  };
  [key: string]: any;
};

export class ServiceFileStreamMinIO implements ServiceFileStream {
  client: Client;
  bucket: string;
  options: ServiceFileStreamMinIOOptions;
  constructor(options: ServiceFileStreamMinIOOptions) {
    this.client = options.client;
    this.bucket = options.bucket;
    this.options = options;
  }

  async _create(
    data: ServiceFileStreamMinIOCreateData,
    params?: ServiceFileStreamMinIOCreateParams
  ): Promise<ServiceFileStreamCreateResult>;
  async _create(
    data: ServiceFileStreamMinIOCreateData[],
    params?: ServiceFileStreamMinIOCreateParams
  ): Promise<ServiceFileStreamCreateResult[]>;
  async _create(
    data: MaybeArray<ServiceFileStreamMinIOCreateData>,
    params?: ServiceFileStreamMinIOCreateParams
  ): Promise<MaybeArray<ServiceFileStreamCreateResult>> {
    const { items } = asArray(data);

    const bucket = params?.bucket || this.bucket;

    const promises = items.map(async (item) => {
      const { stream, id } = item;
      const passThroughStream = new PassThrough();

      const fileName = path.basename(id);

      try {
        const promise = this.client.putObject(
          bucket,
          fileName,
          passThroughStream
        );

        stream.pipe(passThroughStream);

        await promise;
      } catch (e) {
        this.errorHandler(e);
      }
    });

    await Promise.all(promises);

    return items.map((item) => ({ id: item.id }));
  }

  async _get(
    id: string,
    params?: ServiceFileStreamMinIOGetParams
  ): Promise<ServiceFileStreamMinIOGetResult> {
    const bucket = params?.bucket || this.bucket;

    try {
      const header = {};

      const stream = await this.client.getObject(bucket, id);

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
    params?: ServiceFileStreamMinIORemoveParams
  ): Promise<ServiceFileStreamCreateResult> {
    const bucket = params?.s3?.bucket || this.bucket;

    try {
      await this.client.removeObject(bucket, id);

      return {
        id
      };
    } catch (err) {
      console.log(err);
      this.errorHandler(err);
    }
  }

  get(id: string, params?: any): Promise<ServiceFileStreamGetResult> {
    return this._get(id, params);
  }

  create(
    data: ServiceFileStreamMinIOCreateData,
    params?: ServiceFileStreamMinIOCreateParams
  ): Promise<ServiceFileStreamCreateResult>;
  create(
    data: ServiceFileStreamMinIOCreateData[],
    params?: ServiceFileStreamMinIOCreateParams
  ): Promise<ServiceFileStreamCreateResult[]>;
  create(
    data: MaybeArray<ServiceFileStreamMinIOCreateData>,
    params?: ServiceFileStreamMinIOCreateParams
  ): Promise<MaybeArray<ServiceFileStreamCreateResult>> {
    return this._create(data, params);
  }

  remove(
    id: string,
    params?: ServiceFileStreamMinIORemoveParams
  ): Promise<ServiceFileStreamCreateResult> {
    return this._remove(id, params);
  }

  async checkExistence(
    id: string,
    params?: ServiceFileStreamMinIOGetParams
  ): Promise<void> {}

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

  errorHandler(err: any) {
    // console.log(err);
    if (!err) {
      return;
    }

    if (err instanceof FeathersError) {
      throw err;
    }

    if (err.code === "NoSuchKey") {
      throw new NotFound("File not found");
    }

    throw new GeneralError("Error getting file", {
      error: err
    });
  }
}
