export interface Schema {
  blogs: TestBlog[];
  blog_authors: TestBlogAuthor[];
  authors: TestAuthor[];
}

export interface TestBlog {
  authors: number[] | TestBlogAuthor[];
  id: number;
}

export interface TestBlogAuthor {
  id: number;
  authors_id: number | TestAuthor | null;
  blogs_id: number | TestBlog | null;
}

export interface TestAuthor {
  id: number;
  blogs: number[] | TestBlogAuthor[];
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
