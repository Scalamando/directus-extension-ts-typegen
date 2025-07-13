import type {
  CollectionType,
  FieldType,
  PrimitiveField,
  ResolvedSchema,
  StructuredField,
} from "./resolve.ts";

export function compileTypes(schema: ResolvedSchema) {
  let typeString = "";

  typeString += compileSchemaType(schema);
  typeString += "\n\n";

  for (const collectionName in schema) {
    const collection = schema[collectionName]!;
    typeString += compileCollectionType(collection, schema);
    typeString += "\n\n";
  }

  typeString += GeoJSONTypes;

  return typeString;
}

function compileCollectionType(collection: CollectionType, schema: ResolvedSchema) {
  return `export interface ${collection.typeName} {
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
    const collectionTypeNames = field.relatedCollections.map(
      ({ collection }) => schema[collection]!.typeName
    );
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

  if(field.kind === "m2a-discriminator") {
    return `${compileFieldType(field.primitive, schema)} | ${field.relatedCollections.map(c => `"${c.collection}"`).join(" | ")}`
  }

  // Below must be M2O or O2M

  const collectionTypeName = schema[field.relatedCollection]!.typeName;
  const relatedField = schema[field.relatedCollection]!.fields[field.relatedField]!;
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

function compilePrimitiveType(field: PrimitiveField): string {
  switch (field.type) {
    case "string":
    case "text":
    case "uuid":
    case "hash":
    case "date":
    case "time":
    case "datetime":
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
              `${quoteSpecial(name)}: ${compilePrimitiveType({ type } as PrimitiveField)};`
          )
          .join(" ") +
        " }>"
      );
    case "select-multiple-checkbox":
      return "Array<" + field.choices.map(({ value }) => `"${value}"`).join(" | ") + ">";
    case "select-multiple-checkbox-tree":
      return "Array<" + field.choices.flatMap(({ value }) => `"${value}"`).join(" | ") + ">";
    case "select-multiple-dropdown":
      return "Array<" + field.choices.map(({ value }) => `"${value}"`).join(" | ") + ">";
    case "tags":
      return (
        "Array<" +
        (field.allowCustom === false
          ? field.presets?.map((value) => `"${value}"`).join(" | ")
          : "string") +
        ">"
      );
    default:
      return "unknown";
  }
}

function compileSchemaType(schema: ResolvedSchema) {
  return `export interface Schema {
${Object.entries(schema).map(
  ([name, collection]) => `  ${name}: ${collection.typeName}${collection.singleton ? "" : "[]"};`
).join("\n")}
}`;
}

function quoteSpecial(name: string) {
  if (/[\$:]/.test(name)) {
    return `"${name}"`;
  } else {
    return name;
  }
}

const GeoJSONTypes = `
// GeoJSON Types

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

export interface GeoJSONMultiPoint{
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
}`;
