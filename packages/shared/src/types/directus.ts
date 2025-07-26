export interface DirectusCollection {
  collection: string;
  meta: {
    singleton: boolean;
    system?: boolean;
  } | null;
}

export interface DirectusField {
  collection: string;
  field: string;
  type: string;
  schema: {
    data_type: string;
    is_nullable: boolean;
    is_primary_key: boolean;
    foreign_key_table: string | null;
    foreign_key_column: string | null;
  } | null;
  meta: {
    required: boolean;
    system?: boolean;
  } & (
    | DirectusFieldMeta
    | DirectusFieldListMeta
    | DirectusFieldMultipleCheckboxMeta
    | DirectusFieldTreeMeta
    | DirectusFieldDropdownMeta
    | DirectusFieldMultipleDropdownMeta
    | DirectusFieldTagsMeta
  ) | null;
}

export interface DirectusFieldMeta {
  interface: string | null;
  options: unknown | null;
}

export interface DirectusFieldListMeta {
  interface: "list";
  options: {
    fields: Array<{
      field: string;
      name: string;
      type: string;
    }>;
  };
}

export interface DirectusFieldMultipleCheckboxMeta {
  interface: "select-multiple-checkbox";
  options: {
    choices: Array<{
      text: string;
      value: string;
    }>;
    allowOther?: boolean;
  };
}

export interface DirectusFieldTreeMeta {
  interface: "select-multiple-checkbox-tree";
  options: {
    choices: Array<{
      text: string;
      value: string;
      children?: Array<DirectusFieldTreeChoice>;
    }>;
  };
}

export interface DirectusFieldTreeChoice {
  text: string;
  value: string;
  children?: Array<DirectusFieldTreeChoice>;
}

export interface DirectusFieldDropdownMeta {
  interface: "select-dropdown";
  options: {
    choices: Array<{
      text: string;
      value: string;
    }>;
    allowOther?: boolean;
    allowNone?: boolean;
  };
}

export interface DirectusFieldMultipleDropdownMeta {
  interface: "select-multiple-dropdown";
  options: {
    choices: Array<{
      text: string;
      value: string;
    }>;
    allowOther?: boolean;
    allowNone?: boolean;
  };
}

export interface DirectusFieldRadioMeta {
  interface: "select-radio";
  options: {
    choices: Array<{
      text: string;
      value: string;
    }>;
  };
}

export interface DirectusFieldTagsMeta {
  interface: "tags";
  options: {
    presets: Array<string>;
    allowCustom?: boolean;
  } | null;
}

export interface DirectusRelation {
  collection: string;
  field: string;
  related_collection: string | null;
  meta: {
    many_collection: string | null;
    many_field: string | null;
    one_collection: string | null;
    one_field: string | null;
    one_collection_field: string | null;
    one_allowed_collections: string[] | null;
  } | null;
  schema: {
    foreign_key_table: string;
    foreign_key_column: string;
  } | null;
}
