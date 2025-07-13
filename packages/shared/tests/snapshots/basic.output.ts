export interface Schema {
  test: Test[];
}

export interface Test {
  id: number;
  string: string | null;
  uuid: string | null;
  big_integer: number | null;
  integer: number | null;
  float: number | null;
  decimal: number | null;
  text: string | null;
  boolean: boolean | null;
  date_time: string | null;
  date: string | null;
  time: string | null;
  timestamp: string | null;
  repeater: Array<{ field: string; }> | null;
  point: GeoJSONPoint | null;
  line_string: GeoJSONLineString | null;
  polygon: GeoJSONPolygon | null;
  multi_point: GeoJSONMultiPoint | null;
  multi_line_string: GeoJSONMultiLineString | null;
  multi_polygon: GeoJSONMultiPolygon | null;
  geometry: GeoJSONGeometryCollection | null;
  checkboxes: Array<"a" | "b"> | null;
  checkboxes_with_other: Array<"c" | "d" | string> | null;
  checkboxes_tree: Array<"a" | "b" | "c"> | null;
  dropdown_multiple: Array<"a" | "b" | "c"> | null;
  dropdown_multiple_with_other: Array<"a" | "b" | "c" | string> | null;
  dropdown_multiple_with_none: Array<"a" | "b"> | null;
  tags: Array<"a" | "b" | "c"> | null;
  tags_with_other: Array<"a" | "b" | "c" | string> | null;
  block_editor: unknown | null;
  dropdown: "a" | "b" | null;
  dropdown_with_other: "a" | "b" | string | null;
  dropdown_with_none: "a" | "b" | null;
  dropdown_numeric: 1 | 2 | null;
  dropdown_numeric_with_other: 1 | 2 | number | null;
}


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
}