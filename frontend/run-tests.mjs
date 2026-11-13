import { startVitest } from "vitest/node";
import config from "./vitest.config.js";

// Load the JS configuration natively so esbuild does not scan inaccessible
// parent directories on managed Windows checkouts. Test discovery is unchanged.
const context = await startVitest("test", process.argv.slice(2), {
  ...config.test,
  run: true,
  config: false,
}, {
  root: config.root,
  esbuild: config.esbuild,
  configFile: false,
});
if (!context) process.exitCode = 1;
await context?.close();
