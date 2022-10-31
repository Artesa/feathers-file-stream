import type { Params } from "@feathersjs/feathers";
import { FeathersError, GeneralError } from "@feathersjs/errors";
import { createReadStream, createWriteStream } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import streamPomises from "stream/promises";
import type {
  ServiceFileStreamCreateData,
  ServiceFileStreamCreateResult,
  ServiceFileStreamGetResult
} from "./types";
import type { MaybeArray } from "./utility-types";
import { asArray } from "./utils";

export type ServiceFileStreamFSOptions = {
  root: string;
};

export class ServiceFileStreamFS {
  options: ServiceFileStreamFSOptions;
  constructor(options: ServiceFileStreamFSOptions) {
    this.options = options;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async _get(key: string, _params?: any): Promise<ServiceFileStreamGetResult> {
    const { root } = this.options;
    const stream = createReadStream(path.join(root, key));
    return {
      header: {},
      stream
    };
  }

  async _create(
    data: ServiceFileStreamCreateData,
    _params?: any
  ): Promise<ServiceFileStreamCreateResult>;
  async _create(
    data: ServiceFileStreamCreateData[],
    _params?: any
  ): Promise<ServiceFileStreamCreateResult[]>;
  async _create(
    data: MaybeArray<ServiceFileStreamCreateData>,
    _params?: any
  ): Promise<MaybeArray<ServiceFileStreamCreateResult>> {
    const { root } = this.options;
    const { isArray, items } = asArray(data);
    const promises = items.map(async (item) => {
      const { key, stream } = item;
      const writeStream = createWriteStream(path.join(root, key));
      await streamPomises.pipeline(stream, writeStream);
    });
    await Promise.all(promises);

    const results = items.map((item) => {
      const { key } = item;
      return {
        key
      };
    });

    return isArray ? results : results[0];
  }

  async _remove(
    id: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params?: Params
  ): Promise<ServiceFileStreamCreateResult> {
    const file = path.join(this.options.root, id);
    try {
      await unlink(file);
      return { key: id };
    } catch (error) {
      throw new GeneralError(`Could not remove file ${id}`, {
        error
      });
    }
  }

  get(key: string, params?: any): Promise<ServiceFileStreamGetResult> {
    return this._get(key, params);
  }

  create(
    data: ServiceFileStreamCreateData,
    params?: any
  ): Promise<ServiceFileStreamCreateResult>;
  create(
    data: ServiceFileStreamCreateData[],
    params?: any
  ): Promise<ServiceFileStreamCreateResult[]>;
  create(
    data: MaybeArray<ServiceFileStreamCreateData>,
    params?: any
  ): Promise<MaybeArray<ServiceFileStreamCreateResult>> {
    return this._create(data, params);
  }

  remove(id: string, params?: Params) {
    return this._remove(id, params);
  }
}
