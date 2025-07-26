import type {
  CollectionType,
  FieldType,
  PrimitiveField,
  ResolvedSchema,
  StructuredField,
  M2OField,
  O2MField,
} from "./resolve.ts";

const SCHEMA_TYPE_NAME = "Schema";
const SYSTEM_COLLECTION_PREFIX = "Custom";

export function compileTypes(schema: ResolvedSchema) {
  let typeString = "";

  const referencedSystemCollections = collectReferencedSystemCollections(schema);
  if (referencedSystemCollections.length > 0) {
    typeString += `import type { ${referencedSystemCollections.join(", ")} } from "@directus/sdk"`;
    typeString += "\n\n";
  }

  typeString += compileSchemaType(schema);
  typeString += "\n\n";

  for (const collectionName in schema) {
    const collection = schema[collectionName]!;
    if (Object.keys(collection.fields).length == 0) continue;
    typeString += compileCollectionType(collection, schema);
    typeString += "\n\n";
  }

  typeString += GeoJSONTypes;

  return typeString;
}

const collectionToType = {
  directus_users: "DirectusUser",
  directus_roles: "DirectusRole",
  directus_permissions: "DirectusPermission",
  directus_settings: "DirectusSettings",
  directus_files: "DirectusFile",
  directus_folders: "DirectusFolder",
  directus_activity: "DirectusActivity",
  directus_notifications: "DirectusNotification",
  directus_shares: "DirectusShare",
  directus_flows: "DirectusFlow",
  directus_operations: "DirectusOperation",
  directus_panels: "DirectusPanel",
  directus_dashboards: "DirectusDashboard",
  directus_translations: "DirectusTranslation",
  directus_versions: "DirectusVersion",
  directus_revisions: "DirectusRevision",
  directus_webhooks: "DirectusWebhook",
  directus_presets: "DirectusPreset",
  directus_relations: "DirectusRelation",
  directus_fields: "DirectusField",
  directus_collections: "DirectusCollection",
} as const;
export type SystemCollectionName = keyof typeof collectionToType;

function collectReferencedSystemCollections(schema: ResolvedSchema) {
  const systemCollections = new Set<SystemCollectionName>();
  for (const collection of Object.values(schema)) {
    if (collection.system) continue;
    const relatedFields = Object.values(collection.fields).filter(
      (f) => (f.kind === "o2m" || f.kind === "m2o") && f.system
    ) as Array<M2OField | O2MField>;
    for (const field of relatedFields) {
      systemCollections.add(field.relatedCollection as SystemCollectionName);
    }
  }
  return Array.from(systemCollections.values()).map((c) => collectionToType[c]);
}

function compileCollectionType(collection: CollectionType, schema: ResolvedSchema) {
  return `export interface ${(collection.system ? SYSTEM_COLLECTION_PREFIX : "") + collection.typeName} {
${Object.entries(collection.fields)
  .map(
    ([name, type]) =>
      `  ${name}: ${compileFieldType(type, schema)}${type.nullable ? " | null" : ""};`
  )
  .join("\n")}
}`;
}

function compileFieldType(field: FieldType, schema: ResolvedSchema): string {
  if (field.kind === "structured") {
    return `${compileStructuredType(field)}`;
  }

  if (field.kind === "primitive") {
    return `${compilePrimitiveType(field)}`;
  }

  if (field.kind === "m2a") {
    const collectionTypeNames = field.relatedCollections.map(({ collection }) => {
      const relatedCollection = schema[collection]!;
      if (relatedCollection.system) {
        return relatedCollection.typeName + `<${SCHEMA_TYPE_NAME}>`;
      } else {
        return relatedCollection.typeName;
      }
    });

    const fieldTypes = field.relatedCollections
      .map(({ collection, field }) => {
        const relatedField = schema[collection]!.fields[field]!;

        if ("primitive" in relatedField) {
          return compileFieldType(relatedField.primitive, schema);
        } else {
          return compileFieldType(relatedField, schema);
        }
      })
      .reduce((unique, type) => unique.add(type), new Set<string>());

    return `${Array.from(fieldTypes).join(" | ")} | ${collectionTypeNames.join(" | ")}`;
  }

  if (field.kind === "m2a-discriminator") {
    return `${compileFieldType(field.primitive, schema)} | ${field.relatedCollections.map((c) => `"${c.collection}"`).join(" | ")}`;
  }

  // Below must be M2O or O2M

  const relatedCollection = schema[field.relatedCollection]!;
  if (relatedCollection.system) {
    if (field.kind === "m2o") {
      return `${relatedCollection.typeName}['${field.relatedField}'] | ${relatedCollection.typeName}<${SCHEMA_TYPE_NAME}>`;
    } /* o2m */ else {
      return `${relatedCollection.typeName}['${field.relatedField}'][] | ${relatedCollection.typeName}<${SCHEMA_TYPE_NAME}>[]`;
    }
  } else {
    const collectionTypeName = relatedCollection.typeName;
    const relatedField = relatedCollection!.fields[field.relatedField]!;
    if (relatedField == null) {
      return "unknown";
    }

    const fieldType = compileFieldType(
      "primitive" in relatedField ? relatedField.primitive : relatedField,
      schema
    );

    if (field.kind === "m2o") {
      return `${fieldType} | ${collectionTypeName}`;
    } /* o2m */ else {
      return `${fieldType}[] | ${collectionTypeName}[]`;
    }
  }
}

function compilePrimitiveType(field: PrimitiveField): string {
  switch (field.type) {
    case "string":
    case "text":
    case "uuid":
    case "hash":
    case "date":
    case "time":
    case "dateTime":
    case "timestamp":
      return "string";
    case "integer":
    case "bigInteger":
    case "float":
    case "decimal":
      return "number";
    case "boolean":
      return "boolean";
    case "geometry":
      return `GeoJSONGeometryCollection`;
    case "geometry.Point":
      return `GeoJSONPoint`;
    case "geometry.LineString":
      return `GeoJSONLineString`;
    case "geometry.Polygon":
      return `GeoJSONPolygon`;
    case "geometry.MultiPoint":
      return `GeoJSONMultiPoint`;
    case "geometry.MultiLineString":
      return `GeoJSONMultiLineString`;
    case "geometry.MultiPolygon":
      return `GeoJSONMultiPolygon`;
    default:
      return "unknown";
  }
}

function compileStructuredType(field: StructuredField): string {
  switch (field.type) {
    case "list":
      return (
        "Array<{ " +
        field.fields
          .map(
            ({ name, type }) =>
              `${quoteSpecial(name)}: ${compilePrimitiveType({ type } as PrimitiveField)}`
          )
          .join("; ") +
        " }>"
      );
    case "select-multiple-checkbox":
      return (
        "Array<" +
        field.choices
          .map(({ value }) => `"${value}"`)
          .concat(field.allowOther ? ["string"] : [])
          .join(" | ") +
        ">"
      );
    case "select-multiple-checkbox-tree":
      return "Array<" + field.choices.flatMap(({ value }) => `"${value}"`).join(" | ") + ">";
    case "select-dropdown": {
      const type = compilePrimitiveType({ type: field.fieldType } as PrimitiveField);
      return field.choices
        .map(({ value }) => (type === "string" ? `"${value}"` : `${value}`))
        .concat(field.allowOther ? [type] : [])
        .join(" | ");
    }
    case "select-multiple-dropdown":
      return (
        "Array<" +
        field.choices
          .map(({ value }) => `"${value}"`)
          .concat(field.allowOther ? ["string"] : [])
          .join(" | ") +
        ">"
      );
    case "select-radio": {
      const type = compilePrimitiveType({ type: field.fieldType } as PrimitiveField);
      return field.choices
        .map(({ value }) => (type === "string" ? `"${value}"` : `${value}`))
        .join(" | ");
    }
    case "tags":
      return (
        "Array<" +
        (field.presets ?? [])
          .map((value) => `"${value}"`)
          .concat(field.allowCustom ? ["string"] : [])
          .join(" | ") +
        ">"
      );
    default:
      return "unknown";
  }
}

function compileSchemaType(schema: ResolvedSchema) {
  return `export interface Schema {
${Object.entries(schema)
  .filter(
    ([_, collection]) =>
      !collection.system || Object.values(collection.fields).some((f) => "system" in f && !f.system)
  )
  .map(
    ([name, collection]) =>
      `  ${name}: ${(collection.system ? SYSTEM_COLLECTION_PREFIX : "") + collection.typeName}${collection.singleton || collection.system ? "" : "[]"};`
  )
  .join("\n")}
}`;
}

function quoteSpecial(name: string) {
  if (/[\$:]/.test(name)) {
    return `"${name}"`;
  } else {
    return name;
  }
}

const GeoJSONTypes = `// GeoJSON Types

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoJSONLineString {
  type: "LineString";
  coordinates: Array<[number, number]>;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: Array<Array<[number, number]>>;
}

export interface GeoJSONMultiPoint {
  type: "MultiPoint";
  coordinates: Array<[number, number]>;
}

export interface GeoJSONMultiLineString {
  type: "MultiLineString";
  coordinates: Array<Array<[number, number]>>;
}

export interface GeoJSONMultiPolygon {
  type: "MultiPolygon";
  coordinates: Array<Array<Array<[number, number]>>>;
}

export interface GeoJSONGeometryCollection {
  type: "GeometryCollection";
  geometries: Array<
    | GeoJSONPoint
    | GeoJSONLineString
    | GeoJSONPolygon
    | GeoJSONMultiPoint
    | GeoJSONMultiLineString
    | GeoJSONMultiPolygon
  >;
}
`;
