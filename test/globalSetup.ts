import fsp from "fs/promises";
import path from "path";

export default async function () {
  const unlink = async () => {
    const dir = path.join(__dirname, "uploads");
    const result = (await fsp.readdir(dir)).map((file) =>
      fsp.unlink(path.join(dir, file))
    );
  };

  return () => new Promise<void>((resolve) => unlink().then(resolve));
}
