import { type Field, PRIMARY_KEY, type Schema } from "./prepare";
import { type DirectusFieldTreeChoice } from "./types/directus";

export type ResolvedSchema = Record<string, CollectionType>;
export type CollectionType = {
  typeName: string;
  singleton: boolean;
  fields: Record<string, FieldType>;
};
export type FieldType =
  | PrimitiveField
  | StructuredField
  | M2OField
  | O2MField
  | M2AField
  | M2ADiscriminatorField;

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
export type M2ADiscriminatorField = {
  kind: "m2a-discriminator";
  nullable: boolean;
  primitive: PrimitiveField;
  relatedCollections: Array<{ collection: string; field: string }>;
};

export interface ResolveTypesOptions {
  requiredNotNullable?: boolean;
}
export function resolveTypes(schema: Schema, opts: ResolveTypesOptions) {
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
          types[collectionName].fields[fieldName] = resolveStructuredType(field, opts);
        } else {
          types[collectionName].fields[fieldName] = resolvePrimitiveType(field, opts);
        }
      } else {
        const relation = resolveRelation(field, collectionName, schema, opts);
        if (relation == null) continue;

        types[collectionName].fields[fieldName] = relation;
      }
    }
  }

  return types;
}

interface ResolvePrimitiveTypeOptions {
  requiredNotNullable?: boolean;
}
function resolvePrimitiveType(
  field: Field,
  { requiredNotNullable }: ResolvePrimitiveTypeOptions = {}
): PrimitiveField {
  return {
    kind: "primitive",
    nullable: isNullable(field, requiredNotNullable),
    type: field.type,
  };
}

interface ResolveRelationOptions {
  requiredNotNullable?: boolean;
}
function resolveRelation(
  field: Field,
  collection: string,
  schema: Schema,
  { requiredNotNullable }: ResolveRelationOptions = {}
): M2OField | O2MField | M2AField | M2ADiscriminatorField | null {
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
      nullable: isNullable(field, requiredNotNullable),
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
      nullable: isNullable(field, requiredNotNullable),
      primitive: resolvePrimitiveType(field),
      relatedField: relation.manyField,
      relatedCollection: relation.manyCollection,
    };
  }

  // M2A
  if (collection === relation.manyCollection && relation.oneAllowedCollections != null) {
    const relatedCollections = relation.oneAllowedCollections
      .map((c) => ({
        collection: c,
        field: schema[c]?.fields[PRIMARY_KEY]?.name,
      }))
      .filter(
        (item): item is { collection: string; field: string } =>
          item.field != null &&
          schema[item.collection] != null &&
          schema[item.collection]!.fields[item.field] != null
      );

    if (field.name === relation.manyField) {
      return {
        kind: "m2a",
        nullable: isNullable(field, requiredNotNullable),
        primitive: resolvePrimitiveType(field),
        relatedCollections,
      };
    } else if (field.name === relation.oneCollectionField) {
      return {
        kind: "m2a-discriminator",
        nullable: isNullable(field, requiredNotNullable),
        primitive: resolvePrimitiveType(field),
        relatedCollections,
      };
    }
  }

  // We shouldn't normally land here, but some directus internal relations seem to be setup differently?
  // TODO: Check if this is a problem
  return null;
}

interface ResolveStructuredTypeOptions {
  requiredNotNullable?: boolean;
}
function resolveStructuredType(
  field: Field,
  { requiredNotNullable }: ResolveStructuredTypeOptions = {}
): StructuredField {
  switch (field.interface?.name) {
    case "list":
      return {
        kind: "structured",
        nullable: isNullable(field, requiredNotNullable),
        type: "list",
        fields: field.interface.options.fields,
      };
    case "select-multiple-checkbox":
      return {
        kind: "structured",
        nullable: isNullable(field, requiredNotNullable),
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
        nullable: isNullable(field, requiredNotNullable),
        type: "select-multiple-checkbox-tree",
        choices: field.interface.options.choices.flatMap(recurseChildren),
      };
    case "select-multiple-dropdown":
      return {
        kind: "structured",
        nullable: isNullable(field, requiredNotNullable),
        type: "select-multiple-dropdown",
        choices: field.interface.options.choices,
      };
    case "tags":
      return {
        kind: "structured",
        nullable: isNullable(field, requiredNotNullable),
        type: "tags",
        presets: field.interface.options.presets,
        allowCustom: field.interface.options.allowCustom,
      };
    default:
      return {
        kind: "structured",
        nullable: isNullable(field, requiredNotNullable),
        type: "unknown",
      };
  }
}

function isPresentational(field: Field) {
  return (
    field.interface?.name.startsWith("presentation") || field.interface?.name.startsWith("group")
  );
}

function isNullable(field: Field, requiredNotNullable: boolean = false) {
  return requiredNotNullable ? !field.required && !!field.nullable : !!field.nullable;
}
