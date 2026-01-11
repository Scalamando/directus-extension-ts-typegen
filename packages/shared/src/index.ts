import { compileTypes } from "./compile.ts";
import { prepareSchema } from "./prepare.ts";
import { resolveTypes } from "./resolve.ts";
import type { DirectusCollection, DirectusField, DirectusRelation } from "./types/directus.ts";

export interface GenerateTypesInput {
  collections: Array<DirectusCollection>;
  fields: Array<DirectusField>;
  relations: Array<DirectusRelation>;
}
export interface GenerateTypesOptions {
  typePrefix?: string;
  typeSuffix?: string;
  typeStyle?: "interface" | "type";
  requiredNotNullable?: boolean;
}

export function generateTypes(directusSchema: GenerateTypesInput, opts?: GenerateTypesOptions) {
  const schema = prepareSchema(directusSchema);
  const resolvedTypes = resolveTypes(schema, { requiredNotNullable: opts?.requiredNotNullable });
  const typeString = compileTypes(resolvedTypes, {
    typePrefix: opts?.typePrefix,
    typeSuffix: opts?.typeSuffix,
    typeStyle: opts?.typeStyle,
  });
  return typeString;
}

export { resolveTypes } from "./resolve.ts";
export { compileTypes } from "./compile.ts";
export { prepareSchema } from "./prepare.ts";
export type { DirectusCollection, DirectusField, DirectusRelation } from "./types/directus.ts";
