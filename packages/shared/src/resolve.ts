import { type Field, type FieldInterface, PRIMARY_KEY, type Schema } from "./prepare.ts";
import { type DirectusFieldListField, type DirectusFieldTreeChoice } from "./types/directus.ts";

export type ResolvedSchema = Record<string, CollectionType>;
export type CollectionType = {
  name: string;
  singleton: boolean;
  system: boolean;
  fields: Record<string, FieldType>;
};
export type FieldType = PrimitiveField | AliasField | StructuredField;

export type PrimitiveField = {
  kind: "primitive";
  name: string;
  type: string;
  nullable: boolean;
  system: boolean;
  relation: M2ORelation | O2MRelation | M2ARelation | M2ADiscriminatorRelation | null;
};

export type AliasField = {
  kind: "alias";
  name: string;
  system: boolean;
  relation: M2ORelation | O2MRelation | M2ARelation | M2ADiscriminatorRelation;
};

export type M2ORelation = {
  kind: "m2o";
  relatedCollection: string;
  relatedField: string;
};
export type O2MRelation = {
  kind: "o2m";
  relatedCollection: string;
  relatedField: string;
};
export type M2ARelation = {
  kind: "m2a";
  relatedCollections: Array<{ collection: string; field: string }>;
};
export type M2ADiscriminatorRelation = {
  kind: "m2a-discriminator";
  relatedCollections: Array<string>;
};

export type ListField = { name: string; type: string | StructuredField };

export type StructuredField = {
  kind: "structured";
  name: string;
  nullable: boolean;
  system: boolean;
} & (
  | {
      type: "unknown";
      fieldType: string;
    }
  | {
      type: "list";
      fields: Array<ListField>;
    }
  | {
      type: "select-multiple-checkbox";
      choices: Array<{ value: string }>;
      allowOther: boolean;
    }
  | {
      type: "select-multiple-checkbox-tree";
      choices: Array<{ value: string }>;
    }
  | {
      type: "select-dropdown";
      choices: Array<{ value: string }>;
      fieldType: string;
      allowOther: boolean;
      allowNone: boolean;
    }
  | {
      type: "select-multiple-dropdown";
      choices: Array<{ value: string }>;
      allowOther: boolean;
      allowNone: boolean;
    }
  | {
      type: "select-radio";
      fieldType: string;
      choices: Array<{ value: string }>;
    }
  | {
      type: "tags";
      presets: Array<string>;
      allowCustom: boolean;
    }
);

export interface ResolveTypesOptions {
  requiredNotNullable?: boolean;
}
export function resolveTypes(schema: Schema, opts?: ResolveTypesOptions) {
  let types: ResolvedSchema = {};

  for (const collectionName in schema) {
    types[collectionName] = {
      name: collectionName,
      singleton: schema[collectionName]!.singleton,
      system: schema[collectionName]!.system,
      fields: {},
    };

    for (const fieldName in schema[collectionName]!.fields) {
      const field = schema[collectionName]!.fields[fieldName]!;
      if (isPresentational(field) || isSystem(field)) continue;

      if (isStructured(field)) {
        types[collectionName].fields[fieldName] = resolveStructuredType(field, opts);
      } else if (isAlias(field)) {
        const aliasField = resolveAliasType(field, schema);
        if (aliasField != null) {
          types[collectionName].fields[fieldName] = aliasField;
        }
      } else {
        types[collectionName].fields[fieldName] = resolvePrimitiveType(field, schema, opts);
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
  schema: Schema,
  { requiredNotNullable }: ResolvePrimitiveTypeOptions = {}
): PrimitiveField {
  return {
    kind: "primitive",
    name: field.name,
    nullable: isNullable(field, requiredNotNullable),
    type: field.type,
    system: field.system,
    relation: resolveRelation(field, schema),
  };
}

function resolveAliasType(field: Field, schema: Schema): AliasField | null {
  const relation = resolveRelation(field, schema);
  if (relation == null) return null;

  return {
    kind: "alias",
    name: field.name,
    system: field.system,
    relation,
  };
}

function resolveRelation(
  field: Field,
  schema: Schema
): M2ORelation | O2MRelation | M2ARelation | M2ADiscriminatorRelation | null {
  const relation = field.relation;
  if (relation == null) return null;

  // M2O Relation
  if (
    field.collection === relation.manyCollection &&
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
      relatedField: relation.oneKeyColumn,
      relatedCollection: relation.oneCollection,
    };
  }

  // O2M Relation
  if (
    field.collection === relation.oneCollection &&
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
      relatedField: relation.manyField,
      relatedCollection: relation.manyCollection,
    };
  }

  // M2A
  if (field.collection === relation.manyCollection && relation.oneAllowedCollections != null) {
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
        relatedCollections,
      };
    } else if (field.name === relation.oneCollectionField) {
      return {
        kind: "m2a-discriminator",
        relatedCollections: relation.oneAllowedCollections,
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
    case "list": {
      const listFieldToField = (listField: DirectusFieldListField): Field => ({
        collection: field.collection,
        dataType: listField.type,
        name: listField.name,
        interface: {
          name: listField.meta.interface,
          options: listField.meta.options,
        } as FieldInterface, // TypeScript breaks down here...
        nullable: !(listField.meta.required ?? false),
        primaryKey: null,
        relation: null,
        system: false,
        type: listField.type,
        required: listField.meta.required ?? false,
      });
      const resolveChildren = (listField: DirectusFieldListField): ListField => ({
        name: listField.name,
        type: ["json", "csv"].includes(listField.type)
          ? resolveStructuredType(listFieldToField(listField), { requiredNotNullable })
          : listField.type,
      });
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "list",
        fields: field.interface.options.fields.map(resolveChildren),
        system: field.system,
      };
    }
    case "select-multiple-checkbox":
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "select-multiple-checkbox",
        choices: field.interface.options.choices,
        allowOther: field.interface.options.allowOther || false,
        system: field.system,
      };
    case "select-multiple-checkbox-tree": {
      const recurseChildren = (choice: DirectusFieldTreeChoice): Array<{ value: string }> => [
        { value: choice.value },
        ...(choice.children?.flatMap(recurseChildren) ?? []),
      ];
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "select-multiple-checkbox-tree",
        choices: field.interface.options.choices.flatMap(recurseChildren),
        system: field.system,
      };
    }
    case "select-dropdown":
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "select-dropdown",
        fieldType: field.type,
        choices: field.interface.options.choices,
        allowOther: field.interface.options.allowOther || false,
        allowNone: field.interface.options.allowNone || false,
        system: field.system,
      };
    case "select-multiple-dropdown":
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "select-multiple-dropdown",
        choices: field.interface.options.choices,
        allowOther: field.interface.options.allowOther || false,
        allowNone: field.interface.options.allowNone || false,
        system: field.system,
      };
    case "select-radio":
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "select-radio",
        fieldType: field.type,
        choices: field.interface.options.choices,
        system: field.system,
      };
    case "tags":
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        type: "tags",
        presets: field.interface.options?.presets ?? [],
        allowCustom: field.interface.options?.allowCustom ?? true,
        system: field.system,
      };
    default:
      return {
        kind: "structured",
        name: field.name,
        nullable: isNullable(field, requiredNotNullable),
        fieldType: field.type,
        type: "unknown",
        system: field.system,
      };
  }
}

function isPresentational(field: Field) {
  return (
    field.interface?.name.startsWith("presentation") || field.interface?.name.startsWith("group")
  );
}

const structuredInterfaces = [
  "select-multiple-checkbox-tree",
  "select-dropdown",
  "select-multiple-dropdown",
  "select-multiple-checkbox",
  "select-radio",
  "list",
  "tags",
];
function isStructured(field: Field) {
  return (
    field.type === "json" ||
    field.type === "csv" ||
    structuredInterfaces.includes(field.interface?.name ?? "")
  );
}

function isNullable(field: Field, requiredNotNullable: boolean = false) {
  return requiredNotNullable ? !field.required && !!field.nullable : !!field.nullable;
}

function isSystem(field: Field): boolean {
  return field.system;
}

function isAlias(field: Field): boolean {
  return field.type === "alias";
}
