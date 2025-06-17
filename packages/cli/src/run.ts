import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import process from "node:process";

yargs(hideBin(process.argv))
  .command(
    ["$0", "generate"],
    "generate the types",
    (yargs) => yargs,
    (argv) => {
      if (argv.verbose) console.info(`starting generation`);
    }
  )
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
  })
  .option("directus-email", {
    type: "string",
    description: "Email address of your directus admin user",
  })
  .option("directus-password", {
    type: "string",
    description: "Password of your directus admin user",
  })
  .option("directus-token", {
    type: "string",
    description: "Static token of your directus admin user",
  })
  .help()
  .parse();
