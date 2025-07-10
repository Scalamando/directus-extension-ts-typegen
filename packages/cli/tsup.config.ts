import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/run.ts"],
  sourcemap: true,
  clean: true,
  format: "esm",
});
