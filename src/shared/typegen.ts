import { compileTypes } from "./compile";
import { prepareSchema } from "./prepare";
import { resolveTypes } from "./resolve";
import { DirectusCollection, DirectusField, DirectusRelation } from "./types/directus";

export interface GenerateTypesInput {
  collections: Array<DirectusCollection>;
  fields: Array<DirectusField>;
  relations: Array<DirectusRelation>;
}
export interface GenerateTypesOptions {
  typePrefix?: string;
  requiredNotNullable?: boolean;
}

export function generateTypes(directusSchema: GenerateTypesInput, opts: GenerateTypesOptions) {
  const schema = prepareSchema(directusSchema, { typePrefix: opts.typePrefix });
  const resolvedTypes = resolveTypes(schema, { requiredNotNullable: opts.requiredNotNullable });
  const typeString = compileTypes(resolvedTypes);
  return typeString;
}
