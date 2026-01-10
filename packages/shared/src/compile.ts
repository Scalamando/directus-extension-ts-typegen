import type {
  AliasField,
  CollectionType,
  M2ADiscriminatorRelation,
  M2ARelation,
  M2ORelation,
  O2MRelation,
  PrimitiveField,
  ResolvedSchema,
  StructuredField,
} from "./resolve.ts";
import pluralize from "pluralize-esm";

const DEFAULT_SCHEMA_TYPE_NAME = "Schema";
const DEFAULT_SYSTEM_COLLECTION_PREFIX = "Custom";

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

export interface CompileTypesOptions {
  typePrefix?: string;
  schemaTypeName?: string;
  systemCollectionPrefix?: string;
}
export function compileTypes(schema: ResolvedSchema, opts: CompileTypesOptions = {}) {
  const {
    typePrefix = "",
    schemaTypeName = DEFAULT_SCHEMA_TYPE_NAME,
    systemCollectionPrefix = DEFAULT_SYSTEM_COLLECTION_PREFIX,
  } = opts;

  let typeString = "";

  typeString += compileReferencedSystemCollections();

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

  function compileReferencedSystemCollections() {
    const systemCollections = new Set<SystemCollectionName>();

    for (const collectionName in schema) {
      if (schema[collectionName]!.system) continue;

      for (const fieldName in schema[collectionName]!.fields) {
        const field = schema[collectionName]!.fields[fieldName]!;
        if (
          (field.kind === "primitive" || field.kind === "alias") &&
          (field.relation?.kind === "m2o" || field.relation?.kind === "o2m") &&
          schema[field.relation.relatedCollection]?.system
        ) {
          systemCollections.add(field.relation.relatedCollection as SystemCollectionName);
        }
      }
    }

    const collectionTypes = Array.from(systemCollections.values()).map((c) => collectionToType[c]);
    if (collectionTypes.length === 0) return "";

    return `import type { ${collectionTypes.join(", ")} } from "@directus/sdk"\n\n`;
  }

  function compileSchemaType(schema: ResolvedSchema) {
    const nonEmptyCollections = Object.values(schema).filter(
      (collection) =>
        !collection.system ||
        Object.values(collection.fields).some((f) => "system" in f && !f.system)
    );
    return collectionTempl(
      "Schema",
      nonEmptyCollections.map((collection) => ({
        name: collection.name,
        type: `${(collection.system ? systemCollectionPrefix : "") + toTypeName(collection)}${
          collection.singleton || collection.system ? "" : "[]"
        }`,
      }))
    );
  }

  function compileCollectionType(collection: CollectionType, schema: ResolvedSchema) {
    return collectionTempl(
      (collection.system ? systemCollectionPrefix : "") + toTypeName(collection),
      Object.entries(collection.fields).map(([name, field]) => ({
        name,
        type: `${
          field.kind === "structured"
            ? compileStructuredType(field)
            : field.kind === "alias"
              ? compileAliasType(field, schema)
              : compilePrimitiveType(field, schema)
        }${"nullable" in field && field.nullable ? " | null" : ""}`,
      }))
    );
  }

  function compilePrimitiveType(field: PrimitiveField, schema: ResolvedSchema): string {
    const dataType = compileDataType(field.type);
    if (field.relation == null) {
      return dataType;
    }

    const relatedType = compileRelationType(field.relation, schema);
    return `${dataType} | ${relatedType}`;
  }

  function compileAliasType(field: AliasField, schema: ResolvedSchema): string {
    const relatedType = compileRelationType(field.relation, schema);

    if (field.relation.kind === "m2o" || field.relation.kind === "o2m") {
      const { relatedCollection, relatedField } = field.relation;
      const foreignField = schema[relatedCollection]!.fields[relatedField]!;
      if (foreignField.kind !== "primitive") {
        return "unknown";
      }

      return `${compileDataType(foreignField.type)}${field.relation.kind === "o2m" ? "[]" : ""} | ${relatedType}`;
    }

    return "unknown";
  }

  function compileDataType(type: string): string {
    switch (type) {
      case "string":
      case "text":
      case "uuid":
      case "hash":
        return "string";
      case "date":
      case "time":
      case "dateTime":
      case "timestamp":
        return '"datetime"';
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

  function compileRelationType(
    relation: M2ORelation | O2MRelation | M2ARelation | M2ADiscriminatorRelation,
    schema: ResolvedSchema
  ): string {
    if (relation.kind === "m2a") {
      const collectionTypeNames = relation.relatedCollections.map(({ collection }) => {
        const relatedCollection = schema[collection]!;
        if (relatedCollection.system) {
          return toTypeName(relatedCollection) + `<${schemaTypeName}>`;
        } else {
          return toTypeName(relatedCollection);
        }
      });
      return collectionTypeNames.join(" | ");
    }

    if (relation.kind === "m2a-discriminator") {
      return relation.relatedCollections.map((name) => `"${name}"`).join(" | ");
    }

    // Below must be M2O or O2M

    const relatedCollection = schema[relation.relatedCollection]!;
    const collectionName = toTypeName(relatedCollection);

    if (relatedCollection.system) {
      if (relation.kind === "m2o") {
        return `${collectionName}<${schemaTypeName}>`;
      } /* o2m */ else {
        return `${collectionName}<${schemaTypeName}>[]`;
      }
    }

    if (relation.kind === "m2o") {
      return collectionName;
    } /* o2m */ else {
      return `${collectionName}[]`;
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
                `${quoteSpecial(name)}: ${
                  typeof type === "string"
                    ? compileDataType(type)
                    : `${compileStructuredType(type)}${type.nullable ? " | null" : ""}`
                }`
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
        const type = compileDataType(field.fieldType);
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
        const type = compileDataType(field.fieldType);
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

  function toTypeName(collection: { name: string; singleton: boolean }) {
    if (collection.name in collectionToType) {
      return collectionToType[collection.name as SystemCollectionName];
    }

    return (
      (typePrefix ?? "") +
      sanitizeTypeName(collection.name)
        .split("_")
        .map((word) =>
          collection.singleton || word.toLowerCase().endsWith("data")
            ? word
            : pluralize.singular(word)
        ) // use singular for types (except for singletons and 'data')
        .map((word) => word.slice(0, 1).toLocaleUpperCase() + word.slice(1)) // pascalize
        .join("")
    );
  }

  function quoteSpecial(name: string) {
    if (/[\$:]/.test(name)) {
      return `"${name}"`;
    } else {
      return name;
    }
  }
}

function sanitizeTypeName(name: string) {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

const fieldTempl = (name: string, type: string) => `  ${name}: ${type};`;

const collectionTempl = (name: string, fields: Array<{ name: string; type: string }>) =>
  `export interface ${name} {
${fields.map(({ name, type }) => fieldTempl(name, type)).join("\n")}
}`;

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
