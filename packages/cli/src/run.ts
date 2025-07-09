import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import process from "node:process";
import fsp from "node:fs/promises";
import fs from "node:fs";
import { password as passwordInput, input, select, confirm } from "@inquirer/prompts";
import path from "node:path";
import {
  generateTypes,
  type DirectusCollection,
  type DirectusField,
  type DirectusRelation,
} from "@directus-ts-typegen/shared";
import "dotenv/config";

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
  .command(
    ["$0", "generate"],
    "generate the types",
    () => {},
    async (argv) => {
      if (argv.verbose) console.info(`starting generation`);

      let host = argv.directusHost ?? process.env.DIRECTUS_TS_TYPEGEN_HOST ?? "";
      let email = argv.directusEmail ?? process.env.DIRECTUS_TS_TYPEGEN_EMAIL ?? "";
      let password = argv.directusPassword ?? process.env.DIRECTUS_TS_TYPEGEN_PASSWORD ?? "";
      let token = argv.directusToken ?? process.env.DIRECTUS_TS_TYPEGEN_TOKEN ?? "";
      let output = argv.output ?? process.env.DIRECTUS_TS_TYPEGEN_OUTPUT ?? "";

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

      let bearerToken: string;
      if (tokenOrPasswordAuth == "password") {
        const responseBody = await fetch(path.join(host, "/auth/login"), {
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
      } else {
        bearerToken = token;
      }

      const headers = {
        Authorization: "Bearer " + bearerToken,
      };

      const collections = await fetch(path.join(host, "/collections"), { headers })
        .then((res) => res.json() as Promise<{ data: DirectusCollection[] } | { errors: string[] }>)
        .then((res) => {
          if ("errors" in res) {
            throw new Error(
              `One or more errors occured when fetching the collections: \n${res.errors.join("\n")}`
            );
          }
          return res.data;
        });

      const fields = await fetch(path.join(host, "/fields"), { headers })
        .then((res) => res.json() as Promise<{ data: DirectusField[] } | { errors: string[] }>)
        .then((res) => {
          if ("errors" in res) {
            throw new Error(
              `One or more errors occured when fetching the fields: \n${res.errors.join("\n")}`
            );
          }
          return res.data;
        });

      const relations = await fetch(path.join(host, "/relations"), { headers })
        .then((res) => res.json() as Promise<{ data: DirectusRelation[] } | { errors: string[] }>)
        .then((res) => {
          if ("errors" in res) {
            throw new Error(
              `One or more errors occured when fetching the relations: \n${res.errors.join("\n")}`
            );
          }
          return res.data;
        });

      const types = generateTypes(
        { collections, fields, relations },
        {
          typePrefix: "",
          requiredNotNullable: false,
        }
      );

      if (output == "") {
        process.stdout.write(types + "\n");
        return;
      }

      const resolvedPath = path.isAbsolute(output) ? output : path.resolve(process.cwd(), output);

      if (fs.existsSync(resolvedPath)) {
        process.stdout.write("This file already exists and will be overwritten.\n");
        const confirmed = await confirm({
          message: "Are you sure?",
          default: false,
        });
        if (!confirmed) return;
      }

      await fsp.writeFile(resolvedPath, types);
    }
  )
  .help()
  .parse();
