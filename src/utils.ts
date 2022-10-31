import type { MaybeArray } from "./utility-types";

export const asArray = <T>(
  items: MaybeArray<T>
): { isArray: boolean; items: T[] } => {
  const isArray = Array.isArray(items);
  if (isArray) {
    return {
      isArray,
      items
    };
  }
  return {
    isArray,
    items: [items]
  };
};
