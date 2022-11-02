import fsp from "node:fs/promises";
import path from "node:path";

export default async function () {
  const unlink = async () => {
    const dir = path.join(__dirname, "uploads");
    await fsp.rm(dir, { recursive: true, force: true });
    fsp.mkdir(dir, { recursive: true });
  };

  return () => new Promise<void>((resolve) => unlink().then(resolve));
}
