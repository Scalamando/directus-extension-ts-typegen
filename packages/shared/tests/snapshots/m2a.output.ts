export interface Schema {
  posts: Post[];
  posts_content: PostContent[];
  bodies: Body[];
  images: Image[];
}

export interface Post {
  id: number;
  date_created: string | null;
  date_updated: string | null;
  content: number[] | PostContent[];
}

export interface PostContent {
  id: number;
  posts_id: number | Post | null;
  item: number | Body | Image | null;
  collection: string | "bodies" | "images" | null;
}

export interface Body {
  id: number;
}

export interface Image {
  id: number;
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