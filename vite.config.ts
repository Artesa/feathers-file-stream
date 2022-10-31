/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "feathers-file-stream",
      fileName: "feathers-file-stream"
    },
    outDir: path.resolve(__dirname, "dist"),
    sourcemap: true,
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [],
      output: {}
    }
  },
  test: {
    globals: true,
    testTimeout: 60000
  }
});
