import type { HookContext } from "@feathersjs/feathers";
import { checkContext } from "feathers-hooks-common";
import { Readable } from "node:stream";
import { asArray } from "../utils";

export const unpipe =
  () =>
  <H extends HookContext>(context: H) => {
    checkContext(context, ["before", "error"], "create", "unpipe");

    const { data } = context;

    const { isArray, items } = asArray(data);

    items.forEach((item) => {
      const { stream } = item;
      if (!(stream instanceof Readable)) {
        return;
      }

      stream.unpipe();
      stream.destroy();
    });

    return context;
  };
