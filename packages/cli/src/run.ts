#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import process from "node:process";
import fsp from "node:fs/promises";
import fs from "node:fs";
import { password as passwordInput, input, select, confirm } from "@inquirer/prompts";
import path from "node:path";
import url from "node:url";
import {
  generateTypes,
  type DirectusCollection,
  type DirectusField,
  type DirectusRelation,
} from "@directus-ts-typegen/shared";
import "dotenv/config";
import { makeLogger } from "./logger";
import { fetchDirectus } from "./fetch";

yargs(hideBin(process.argv))
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
  })
  .option("directus-host", {
    type: "string",
    description: "Host address of your directus instance",
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
  .option("output", {
    type: "string",
    description:
      "Location of the file the types will be written to. If this isn't set, the types will be output to stdout",
  })
  .option("required-not-nullable", {
    type: "boolean",
    description: "If true, required fields will omit 'null' from their types",
    default: false,
  })
  .option("type-style", {
    type: "string",
    choices: ["interface", "type"],
    description: "Whether to emit `export interface` or `export type` declarations",
    default: "interface",
  })
  .option("type-prefix", {
    type: "string",
    description: "Prefix that's prepended to the generated types names",
    default: "",
  })
  .option("type-suffix", {
    type: "string",
    description: "Suffix that's appended to the generated types names",
    default: "",
  })
  .option("include-system-types", {
    type: "boolean",
    description:
      "Include referenced system collection types in the schema (SDK type resolution workaround)",
    default: true,
  })
  .command(
    ["$0", "generate"],
    "generate the types",
    () => {},
    async (argv) => {
      const logger = makeLogger(argv.verbose ? "debug" : "info");
      logger.debug("Using verbose logging.");

      try {
        let host = argv.directusHost ?? process.env.DIRECTUS_TS_TYPEGEN_HOST ?? "";
        let email = argv.directusEmail ?? process.env.DIRECTUS_TS_TYPEGEN_EMAIL ?? "";
        let password = argv.directusPassword ?? process.env.DIRECTUS_TS_TYPEGEN_PASSWORD ?? "";
        let token = argv.directusToken ?? process.env.DIRECTUS_TS_TYPEGEN_TOKEN ?? "";
        let output = argv.output ?? process.env.DIRECTUS_TS_TYPEGEN_OUTPUT ?? "";

        let requiredNotNullable = argv.requiredNotNullable;
        let typeStyle = argv.typeStyle as "interface" | "type";
        let typePrefix = argv.typePrefix;
        let typeSuffix = argv.typeSuffix;
        let includeSystemTypes = argv.includeSystemTypes;

        logger.debug("Configuration values at startup:");
        logger.debug("directus-host:", host);
        logger.debug("directus-email:", email);
        logger.debug("directus-password:", password.length > 0 ? "<hidden>" : "<empty>");
        logger.debug("directus-token:", token.length > 0 ? "<hidden>" : "<empty>");
        logger.debug("directus-output:", output);

        // Get host url and check that it's reachable

        if (host == "") {
          host = await input({
            message: "Please enter the url of your directus instance:",
            required: true,
            validate: async (value) => {
              let url: URL;
              try {
                url = new URL(value);
              } catch (_err) {
                return "Invalid URL. Please check for typos.";
              }

              try {
                const ping = await fetch(url);
                const isReachable = ping.status >= 200 && ping.status < 300;
                if (isReachable) return true;

                return "This url cannot be reached.";
              } catch (_err) {
                return "This url cannot be reached.";
              }
            },
          });
        }

        // Collect auth info

        let tokenOrPasswordAuth: null | "password" | "token" =
          password != "" ? "password" : token != "" ? "token" : null;
        if (tokenOrPasswordAuth == null) {
          tokenOrPasswordAuth = await select({
            message: "How do you want to authenticate?",
            choices: [
              { name: "Email and Password", value: "password", separator: " " },
              { name: "Static Access Token", value: "token", separator: " " },
            ],
          });
        }

        if (tokenOrPasswordAuth == "password") {
          if (email == "") {
            email = await input({
              message: "Please enter your email address:",
              required: true,
              validate: (value) => value.includes("@"),
            });
          }
          if (password == "") {
            password = await passwordInput({
              message: "Please enter your password:",
              mask: "*",
            });
          }
        } else if (token == "") {
          token = await passwordInput({
            message: "Please enter your static access token:",
          });
        }

        logger.debug("Collected configuration values:");
        logger.debug("directus-host:", host);
        logger.debug("directus-email:", email);
        logger.debug("directus-password:", password.length > 0 ? "<hidden>" : "<empty>");
        logger.debug("directus-token:", token.length > 0 ? "<hidden>" : "<empty>");
        logger.debug("directus-output:", output);
        logger.debug("Type generation options:");
        logger.debug("required-not-nullable:", requiredNotNullable);
        logger.debug("type-style", typeStyle);
        logger.debug("type-prefix", typePrefix);
        logger.debug("type-suffix", typeSuffix);
        logger.debug("include-system-types", includeSystemTypes);

        // Authenticate with the directus instance

        let bearerToken: string;
        if (tokenOrPasswordAuth == "password") {
          try {
            logger.debug("attempting to retrieve bearer token with email and password");
            const responseBody = await fetch(url.resolve(host, "/auth/login"), {
              method: "POST",
              body: JSON.stringify({
                email,
                password,
              }),
              headers: {
                "Content-Type": "application/json",
              },
            }).then((res) => res.json() as Promise<{ data: { access_token: string } }>);
            bearerToken = responseBody.data.access_token;
          } catch (err) {
            logger.error(
              `Failed to retrieve bearer token with email and password. Please check your credentials.`
            );
            logger.debug(err);
            process.exit(1);
          }
        } else {
          bearerToken = token;
        }

        // Fetch collections, fields and relations for type generation

        const collectionUrl = url.resolve(host, "/collections");
        logger.debug(`Fetching collections at '${collectionUrl}'.`);
        const collections = await fetchDirectus<DirectusCollection>(collectionUrl, bearerToken);
        logger.debug(`Retrieved ${collections.length} collections.`);

        const fieldsUrl = url.resolve(host, "/fields");
        logger.debug(`Fetching fields at '${fieldsUrl}'.`);
        const fields = await fetchDirectus<DirectusField>(fieldsUrl, bearerToken);
        logger.debug(`Retrieved ${fields.length} fields.`);

        const relationsUrl = url.resolve(host, "/relations");
        logger.debug(`Fetching relations at '${relationsUrl}'.`);
        const relations = await fetchDirectus<DirectusRelation>(relationsUrl, bearerToken);
        logger.debug(`Retrieved ${relations.length} relations.`);

        // Finally, generate the types

        logger.debug(`Generating types...`);
        const types = generateTypes(
          { collections, fields, relations },
          {
            typePrefix,
            typeSuffix,
            typeStyle,
            requiredNotNullable,
            includeSystemTypes,
          }
        );
        logger.debug(`Finished type generation.`);

        // If no output path was given, write to stdout

        if (output == "") {
          logger.debug(`directus-output is empty, sending types to stdout.`);
          process.stdout.write(types + "\n");
          return;
        }

        // Else, write to the output file, asking for confirmation if the file exists

        const resolvedPath = path.isAbsolute(output) ? output : path.resolve(process.cwd(), output);
        logger.debug(`Resolved output path: ${resolvedPath}`);

        if (fs.existsSync(resolvedPath)) {
          process.stdout.write("This file already exists and will be overwritten.\n");
          const confirmed = await confirm({
            message: "Are you sure?",
            default: false,
          });
          if (!confirmed) {
            logger.info("Aborting... 👋 Until next time!");
            process.exit(0);
          }
        }

        logger.debug(`Attempting to write types to output path.`);
        try {
          await fsp.writeFile(resolvedPath, types);
        } catch (err) {
          logger.error(`Failed to write types to output path.`);
          logger.debug(err);
        }
        logger.debug(`Finished writing types to output path.`);
      } catch (err) {
        if (err instanceof Error && err.name === "ExitPromptError") {
          logger.info("Aborting... 👋 Until next time!");
        } else {
          logger.debug("Unexpected error:", err);
          throw err;
        }
      }
    }
  )
  .help()
  .parse();
