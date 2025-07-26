import type {
  CollectionType,
  FieldType,
  PrimitiveField,
  ResolvedSchema,
  StructuredField,
  M2OField,
  O2MField,
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

    for (const collection of Object.values(schema)) {
      if (collection.system) continue;

      const relatedFields = Object.values(collection.fields).filter(
        (f) => (f.kind === "o2m" || f.kind === "m2o") && f.system
      ) as Array<M2OField | O2MField>;
      for (const field of relatedFields) {
        systemCollections.add(field.relatedCollection as SystemCollectionName);
      }
    }

    const collectionTypes = Array.from(systemCollections.values()).map((c) => collectionToType[c]);
    if (collectionTypes.length === 0) return "";

    return `import type { ${collectionTypes.join(", ")} } from "@directus/sdk"\n\n`;
  }

  function compileSchemaType(schema: ResolvedSchema) {
    const nonEmptyCollections = Object.entries(schema).filter(
      ([_, collection]) =>
        !collection.system ||
        Object.values(collection.fields).some((f) => "system" in f && !f.system)
    );
    return collectionTempl(
      "Schema",
      nonEmptyCollections.map(([name, collection]) => ({
        name,
        type: `${(collection.system ? systemCollectionPrefix : "") + toTypeName(collection.name)}${collection.singleton || collection.system ? "" : "[]"}`,
      }))
    );
  }

  function compileCollectionType(collection: CollectionType, schema: ResolvedSchema) {
    return `export interface ${(collection.system ? systemCollectionPrefix : "") + toTypeName(collection.name)} {
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
          return toTypeName(relatedCollection.name) + `<${schemaTypeName}>`;
        } else {
          return toTypeName(relatedCollection.name);
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
    const collectionName = toTypeName(relatedCollection.name);
    if (relatedCollection.system) {
      if (field.kind === "m2o") {
        return `${collectionName}['${field.relatedField}'] | ${collectionName}<${schemaTypeName}>`;
      } /* o2m */ else {
        return `${collectionName}['${field.relatedField}'][] | ${collectionName}<${schemaTypeName}>[]`;
      }
    } else {
      const relatedField = relatedCollection!.fields[field.relatedField]!;
      if (relatedField == null) {
        return "unknown";
      }

      const fieldType = compileFieldType(
        "primitive" in relatedField ? relatedField.primitive : relatedField,
        schema
      );

      if (field.kind === "m2o") {
        return `${fieldType} | ${collectionName}`;
      } /* o2m */ else {
        return `${fieldType}[] | ${collectionName}[]`;
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

  function toTypeName(name: string) {
    if (name in collectionToType) {
      return collectionToType[name as SystemCollectionName];
    }

    return (
      (typePrefix ?? "") +
      name
        .replace(/-\s/g, "_") // remove invalid characters
        .split("_")
        .map((word) => pluralize.singular(word)) // use singular for types
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
