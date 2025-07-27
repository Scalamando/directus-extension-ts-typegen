import type {
  DirectusCollection,
  DirectusField,
  DirectusFieldDropdownMeta,
  DirectusFieldListMeta,
  DirectusFieldMultipleCheckboxMeta,
  DirectusFieldMultipleDropdownMeta,
  DirectusFieldRadioMeta,
  DirectusFieldTagsMeta,
  DirectusFieldTreeMeta,
  DirectusRelation,
} from "./types/directus.ts";

export type Schema = Record<string, Collection>;
export interface Collection {
  name: string;
  singleton: boolean;
  system: boolean;
  fields: Record<string | symbol, Field>;
}
export interface Field {
  name: string;
  collection: string;
  type: string;
  dataType: string | null;
  primaryKey: boolean | null;
  nullable: boolean | null;
  required: boolean;
  interface: FieldInterface | null;
  relation: Relation | null;
  system: boolean;
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
      name: DirectusFieldDropdownMeta["interface"];
      options: DirectusFieldDropdownMeta["options"];
    }
  | {
      name: DirectusFieldMultipleDropdownMeta["interface"];
      options: DirectusFieldMultipleDropdownMeta["options"];
    }
  | {
      name: DirectusFieldRadioMeta["interface"];
      options: DirectusFieldRadioMeta["options"];
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

export function prepareSchema(
  { collections, fields, relations }: PrepareSchemaInput
): Schema {
  let schema: Schema = {};

  for (const collection of collections) {
    if(collection.schema == null) continue; // Skip folders

    schema[collection.collection] = {
      name: collection.collection,
      singleton: collection.meta?.singleton || false,
      system: collection.meta?.system || false,
      fields: {},
    } satisfies Collection;
  }

  for (const field of fields) {
    const newField = {
      name: field.field,
      collection: field.collection,
      type: field.type,
      dataType: field.schema?.data_type ?? null,
      primaryKey: field.schema?.is_primary_key ?? null,
      nullable: field.schema?.is_nullable ?? null,
      required: field.meta?.required || false,
      interface:
        field.meta?.interface != null
          ? ({
              name: field.meta.interface,
              options: field.meta.options,
            } as FieldInterface)
          : null,
      relation: null,
      system: field.meta?.system || false,
    } satisfies Field;

    schema[field.collection]!.fields[field.field] = newField;

    if (newField.primaryKey) {
      schema[field.collection]!.fields[PRIMARY_KEY] = newField;
    }
  }

  for (const relation of relations) {
    const newRelation = {
      manyCollection: relation.meta?.many_collection ?? null,
      manyField: relation.meta?.many_field ?? null,
      oneCollection: relation.meta?.one_collection ?? null,
      oneField: relation.meta?.one_field ?? null,
      oneKeyColumn: relation.schema?.foreign_key_column ?? null,
      oneCollectionField: relation.meta?.one_collection_field ?? null,
      oneAllowedCollections: relation.meta?.one_allowed_collections ?? null,
    } satisfies Relation;

    // M2O
    if (
      newRelation.manyCollection &&
      newRelation.manyField &&
      schema[newRelation.manyCollection]!.fields[newRelation.manyField] != null
    ) {
      schema[newRelation.manyCollection]!.fields[newRelation.manyField]!.relation = newRelation;

      // M2A
      if (newRelation.oneCollectionField) {
        schema[newRelation.manyCollection]!.fields[newRelation.oneCollectionField]!.relation =
          newRelation;
      }
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
