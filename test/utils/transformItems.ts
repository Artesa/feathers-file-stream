import crypto from "crypto";
import type { HookContext } from "@feathersjs/feathers";
import { alterItems } from "feathers-hooks-common";
import type { MulterFile } from "../../src";

export const transformItems =
  () =>
  <H extends HookContext>(context: H) => {
    return alterItems((item: MulterFile) => {
      const hash = crypto.randomBytes(16).toString("hex");
      let ext =
        item.detectedFileExtension ||
        item.clientReportedFileExtension ||
        item.originalName.split(".").pop();
      if (!ext?.startsWith(".")) {
        ext = `.${ext}`;
      }
      const id = `${hash}${ext}`;
      const result: MulterFile & { id: string } = { ...item, id };
      return result;
    })(context);
  };

export const transformItemsNested =
  () =>
  <H extends HookContext>(context: H) => {
    return alterItems((item: MulterFile) => {
      const hash = crypto.randomBytes(16).toString("hex");
      let ext =
        item.detectedFileExtension ||
        item.clientReportedFileExtension ||
        item.originalName.split(".").pop();
      if (!ext?.startsWith(".")) {
        ext = `.${ext}`;
      }
      const id = `test/test/${hash}${ext}`;
      const result: MulterFile & { id: string } = { ...item, id };
      return result;
    })(context);
  };
