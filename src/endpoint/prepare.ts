import {
  DirectusCollection,
  DirectusField,
  DirectusFieldListMeta,
  DirectusFieldMultipleCheckboxMeta,
  DirectusFieldMultipleDropdownMeta,
  DirectusFieldTagsMeta,
  DirectusFieldTreeMeta,
  DirectusRelation,
} from "./types/directus";
import pluralize from "pluralize-esm";

export type Schema = Record<string, Collection>;
export interface Collection {
  name: string;
  typeName: string;
  singleton: boolean;
  system: boolean;
  fields: Record<string | symbol, Field>;
}
export interface Field {
  name: string;
  type: string;
  dataType: string | null;
  primaryKey: boolean | null;
  nullable: boolean | null;
  required: boolean;
  interface: FieldInterface | null;
  relation: Relation | null;
}

export type FieldInterface =
  | {
      name: "presentation";
    }
  | {
      name: "group-raw";
    }
  | {
      name: DirectusFieldListMeta["interface"];
      options: DirectusFieldListMeta["options"];
    }
  | {
      name: DirectusFieldMultipleCheckboxMeta["interface"];
      options: DirectusFieldMultipleCheckboxMeta["options"];
    }
  | {
      name: DirectusFieldTreeMeta["interface"];
      options: DirectusFieldTreeMeta["options"];
    }
  | {
      name: DirectusFieldMultipleDropdownMeta["interface"];
      options: DirectusFieldMultipleDropdownMeta["options"];
    }
  | {
      name: DirectusFieldTagsMeta["interface"];
      options: DirectusFieldTagsMeta["options"];
    };

export interface Relation {
  manyCollection: string | null;
  manyField: string | null;
  oneCollection: string | null;
  oneField: string | null;
  oneKeyColumn: string | null;
  oneCollectionField: string | null;
  oneAllowedCollections: string[] | null;
}

export const PRIMARY_KEY = Symbol("pkey");

export interface PrepareSchemaInput {
  collections: Array<DirectusCollection>;
  fields: Array<DirectusField>;
  relations: Array<DirectusRelation>;
}
export interface PrepareSchemaOptions {
  typePrefix?: string;
}

export function prepareSchema(
  { collections, fields, relations }: PrepareSchemaInput,
  opts: PrepareSchemaOptions
): Schema {
  let schema: Schema = {};

  for (const collection of collections) {
    schema[collection.collection] = {
      name: collection.collection,
      typeName: toTypeName(collection.collection, opts.typePrefix),
      singleton: collection.meta.singleton,
      system: collection.meta.system,
      fields: {},
    } satisfies Collection;
  }

  for (const field of fields) {
    const newField = {
      name: field.field,
      type: field.type,
      dataType: field.schema?.data_type ?? null,
      primaryKey: field.schema?.is_primary_key ?? null,
      nullable: field.schema?.is_nullable ?? null,
      required: field.meta.required,
      interface:
        field.meta.interface != null
          ? ({
              name: field.meta.interface,
              options: field.meta.options,
            } as FieldInterface)
          : null,
      relation: null,
    } satisfies Field;

    schema[field.collection]!.fields[field.field] = newField;

    if (newField.primaryKey) {
      schema[field.collection]!.fields[PRIMARY_KEY] = newField;
    }
  }

  for (const relation of relations) {
    const newRelation = {
      manyCollection: relation.meta.many_collection,
      manyField: relation.meta.many_field,
      oneCollection: relation.meta.one_collection,
      oneField: relation.meta.one_field,
      oneKeyColumn: relation.schema?.foreign_key_column ?? null,
      oneCollectionField: relation.meta.one_collection_field,
      oneAllowedCollections: relation.meta.one_allowed_collections,
    } satisfies Relation;

    // M2O
    if (
      newRelation.manyCollection &&
      newRelation.manyField &&
      schema[newRelation.manyCollection]!.fields[newRelation.manyField] != null
    ) {
      schema[newRelation.manyCollection]!.fields[newRelation.manyField]!.relation = newRelation;
    }

    // O2M
    if (
      newRelation.oneCollection &&
      newRelation.oneField &&
      schema[newRelation.oneCollection]!.fields[newRelation.oneField] != null
    ) {
      schema[newRelation.oneCollection]!.fields[newRelation.oneField]!.relation = newRelation;
    }
  }

  return schema;
}

function toTypeName(name: string, prefix?: string) {
  return (
    (prefix ?? "") +
    name
      .replace(/-\s/g, "_") // remove invalid characters
      .split("_")
      .map((word) => pluralize.singular(word)) // use singular for types
      .map((word) => word.slice(0, 1).toLocaleUpperCase() + word.slice(1)) // pascalize
      .join("")
  );
}
