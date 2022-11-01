import fsp from "fs/promises";
import path from "path";

export default async function () {
  const unlink = async () => {
    const dir = path.join(__dirname, "uploads");
    await fsp.rm(dir, { recursive: true, force: true });
    fsp.mkdir(dir, { recursive: true });
  };

  return () => new Promise<void>((resolve) => unlink().then(resolve));
}
