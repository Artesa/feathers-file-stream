import type { Params } from "@feathersjs/feathers";
import { GeneralError, NotFound } from "@feathersjs/errors";
import type { Stats } from "fs";
import { createReadStream, createWriteStream } from "fs";
import fsp from "fs/promises";
import path from "path";
import streamPomises from "stream/promises";
import type {
  ServiceFileStreamCreateData,
  ServiceFileStreamCreateResult,
  ServiceFileStreamGetResult
} from "../types";
import type { MaybeArray } from "../utility-types";
import { asArray } from "../utils";
import mime from "mime-types";

export type ServiceFileStreamFSOptions = {
  root: string;
};

export class ServiceFileStreamFS {
  options: ServiceFileStreamFSOptions;
  constructor(options: ServiceFileStreamFSOptions) {
    this.options = options;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async _get(id: string, _params?: any): Promise<ServiceFileStreamGetResult> {
    const info = await this.getStat(id);

    const { root } = this.options;
    const stream = createReadStream(path.join(root, id));

    const contentType = mime.lookup(id) || "application/octet-stream";

    return {
      header: {
        "Content-Type": contentType,
        "Content-disposition": "attachment;filename=" + id,
        "Content-Length": info.size
      },
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
      // create the directory if it doesn't exist
      const dir = path.dirname(key);
      await fsp.mkdir(path.join(root, dir), { recursive: true });
      const writeStream = createWriteStream(path.join(root, key), {});
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
    await this.checkAccess(id);

    const { root } = this.options;
    const file = path.join(root, id);

    try {
      await fsp.unlink(file);
      return { key: id };
    } catch (error) {
      throw new GeneralError(`Could not remove file ${id}`, {
        error
      });
    }
  }

  /**
   * Get the file stats and throw a NotFound error if the file doesn't exist
   * @param id
   * @returns The file stats
   */
  private async getStat(id: string) {
    const file = path.join(this.options.root, id);
    try {
      return await fsp.stat(file);
    } catch (err) {
      throw new NotFound("File not found");
    }
  }

  /**
   * Check if a file exists and throws a NotFound error if it doesn't
   * @param id The filename to check
   */
  private async checkAccess(id: string) {
    const file = path.join(this.options.root, id);
    try {
      await fsp.access(file);
    } catch (err) {
      throw new NotFound("File not found");
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
