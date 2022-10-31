/// <reference types="vitest" />
import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true
    })
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "index",
      fileName: "index",
      formats: ["es", "cjs"]
    },
    // outDir: path.resolve(__dirname, "dist"),
    sourcemap: true,
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: [
        "path",
        "fs",
        "fs/promises",
        "stream",
        "stream/promises",
        "crypto",
        "aws-sdk"
      ],
      output: {}
    }
  },
  test: {
    globals: true,
    testTimeout: 60000,
    globalSetup: path.resolve(__dirname, "test/globalSetup.ts")
  }
});
