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
      const key = `${hash}${ext}`;
      const result: MulterFile & { key: string } = { ...item, key };
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
      const key = `test/test/${hash}${ext}`;
      const result: MulterFile & { key: string } = { ...item, key };
      return result;
    })(context);
  };
