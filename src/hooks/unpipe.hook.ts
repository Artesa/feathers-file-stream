import type { HookContext } from "@feathersjs/feathers";
import { checkContext } from "feathers-hooks-common";
import { Readable } from "node:stream";
import { asArray } from "../utils";
import fsp from "node:fs/promises";

export type HookUnpipeOptions = {
  unlink?: string;
};

export const unpipe =
  (options?: HookUnpipeOptions) =>
    async <H extends HookContext>(context: H) => {
      checkContext(context, ["before", "after", "error"], "create", "unpipe");

      const { data } = context;

      const { isArray, items } = asArray(data);

      const promises = items.map(async (item) => {
        const { stream } = item;
        if (!(stream instanceof Readable)) {
          return;
        }

        stream.unpipe();
        stream.destroy();

        if (options?.unlink && typeof item[options.unlink] === "string") {
          const path = item[options.unlink];

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          await fsp.unlink(path).catch(() => {});
        }
      });

      await Promise.all(promises);

      return context;
    };
