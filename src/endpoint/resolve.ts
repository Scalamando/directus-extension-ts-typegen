import { Field, PRIMARY_KEY, Schema } from "./prepare";
import { DirectusFieldTreeChoice } from "./types/directus";

export type ResolvedSchema = Record<string, CollectionType>;
export type CollectionType = {
  typeName: string;
  singleton: boolean;
  fields: Record<string, FieldType>;
};
export type FieldType = PrimitiveField | StructuredField | M2OField | O2MField | M2AField;

export type PrimitiveField = {
  kind: "primitive";
  nullable: boolean;
  type: string;
};
export type StructuredField = {
  kind: "structured";
  nullable: boolean;
} & (
  | {
      type: "unknown";
    }
  | {
      type: "list";
      fields: Array<{ name: string; type: string }>;
    }
  | {
      type: "select-multiple-checkbox";
      choices: Array<{ value: string }>;
    }
  | {
      type: "select-multiple-checkbox-tree";
      choices: Array<{ value: string }>;
    }
  | {
      type: "select-multiple-dropdown";
      choices: Array<{ value: string }>;
    }
  | {
      type: "tags";
      presets: Array<string>;
      allowCustom: boolean;
    }
);
export type M2OField = {
  kind: "m2o";
  nullable: boolean;
  primitive: PrimitiveField;
  relatedCollection: string;
  relatedField: string;
};
export type O2MField = {
  kind: "o2m";
  nullable: boolean;
  primitive: PrimitiveField;
  relatedCollection: string;
  relatedField: string;
};
export type M2AField = {
  kind: "m2a";
  nullable: boolean;
  primitive: PrimitiveField;
  relatedCollections: Array<{ collection: string; field: string }>;
};

export function resolveTypes(schema: Schema) {
  let types: ResolvedSchema = {};

  for (const collectionName in schema) {
    types[collectionName] = {
      typeName: schema[collectionName]!.typeName,
      singleton: schema[collectionName]!.singleton,
      fields: {},
    };

    for (const fieldName in schema[collectionName]!.fields) {
      const field = schema[collectionName]!.fields[fieldName]!;
      if (isPresentational(field)) continue;

      if (field.relation == null) {
        if (field.type === "json" || field.type === "csv") {
          types[collectionName].fields[fieldName] = resolveStructuredType(field);
        } else {
          types[collectionName].fields[fieldName] = resolvePrimitiveType(field);
        }
      } else {
        // Relational
        const relation = resolveRelation(field, collectionName, schema);
        if (relation == null) continue;

        types[collectionName].fields[fieldName] = relation;
      }
    }
  }

  return types;
}

function resolvePrimitiveType(field: Field): PrimitiveField {
  return {
    kind: "primitive",
    nullable: !field.required || !!field.nullable,
    type: field.type,
  };
}

function resolveRelation(
  field: Field,
  collection: string,
  schema: Schema
): M2OField | O2MField | M2AField | null {
  const relation = field.relation!;

  // M2O Relation
  if (
    collection === relation.manyCollection &&
    field.name === relation.manyField &&
    relation.oneCollection != null &&
    relation.oneKeyColumn != null
  ) {
    const isInvalid =
      schema[relation.oneCollection] == null ||
      schema[relation.oneCollection]!.fields[relation.oneKeyColumn] == null;
    if (isInvalid) {
      return null;
    }

    return {
      kind: "m2o",
      nullable: !field.required || !!field.nullable,
      primitive: resolvePrimitiveType(field),
      relatedField: relation.oneKeyColumn,
      relatedCollection: relation.oneCollection,
    };
  }

  // O2M Relation
  if (
    collection === relation.oneCollection &&
    field.name === relation.oneField &&
    relation.manyCollection != null &&
    relation.manyField != null
  ) {
    const isInvalid =
      schema[relation.manyCollection] == null ||
      schema[relation.manyCollection]!.fields[relation.manyField] == null;
    if (isInvalid) {
      return null;
    }

    return {
      kind: "o2m",
      nullable: !field.required || !!field.nullable,
      primitive: resolvePrimitiveType(field),
      relatedField: relation.manyField,
      relatedCollection: relation.manyCollection,
    };
  }

  // M2A Relation
  if (
    collection === relation.manyCollection &&
    field.name === relation.manyField &&
    relation.oneAllowedCollections != null
  ) {
    return {
      kind: "m2a",
      nullable: !field.required || !!field.nullable,
      primitive: resolvePrimitiveType(field),
      relatedCollections: relation.oneAllowedCollections
        .map((c) => ({
          collection: c,
          field: schema[c]?.fields[PRIMARY_KEY]?.name,
        }))
        .filter(
          ({ collection, field }) =>
            field != null &&
            // isInvalid
            schema[collection] != null &&
            schema[collection]!.fields[field] != null
        ) as Array<{
        collection: string;
        field: string;
      }>,
    };
  }

  // We shouldn't normally land here, but some directus internal relations seem to be setup differently?
  // TODO: Check if this is a problem
  return null;
}

function resolveStructuredType(field: Field): StructuredField {
  switch (field.interface?.name) {
    case "list":
      return {
        kind: "structured",
        nullable: !field.required || !!field.nullable,
        type: "list",
        fields: field.interface.options.fields,
      };
    case "select-multiple-checkbox":
      return {
        nullable: !field.required || !!field.nullable,
        kind: "structured",
        type: "select-multiple-checkbox",
        choices: field.interface.options.choices,
      };
    case "select-multiple-checkbox-tree":
      const recurseChildren = (choice: DirectusFieldTreeChoice): Array<{ value: string }> => [
        { value: choice.value },
        ...(choice.children?.flatMap(recurseChildren) ?? []),
      ];
      return {
        kind: "structured",
        nullable: !field.required || !!field.nullable,
        type: "select-multiple-checkbox-tree",
        choices: field.interface.options.choices.flatMap(recurseChildren),
      };
    case "select-multiple-dropdown":
      return {
        kind: "structured",
        nullable: !field.required || !!field.nullable,
        type: "select-multiple-dropdown",
        choices: field.interface.options.choices,
      };
    case "tags":
      return {
        kind: "structured",
        nullable: !field.required || !!field.nullable,
        type: "tags",
        presets: field.interface.options.presets,
        allowCustom: field.interface.options.allowCustom,
      };
    default:
      return {
        kind: "structured",
        nullable: !field.required || !!field.nullable,
        type: "unknown",
      };
  }
}

function isPresentational(field: Field) {
  return (
    field.interface?.name.startsWith("presentation") || field.interface?.name.startsWith("group")
  );
}
