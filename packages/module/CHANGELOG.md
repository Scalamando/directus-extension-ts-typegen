# directus-extension-ts-typegen

## 0.4.0

### Minor Changes

- af14020: feat: resolve nested fields in repeater (list) interfaces

### Patch Changes

- 6c0eaea: Fix code selection for safari and firefox

## 0.3.1

### Patch Changes

- 43f5fb6: fix global style leakage that prevented flows from sidescrolling

## 0.3.0

### Minor Changes

- 00907fd: generate system collections for sdk consumption
- ab17499: fix: types for m2a collections
- 70f4db3: fix: don't singularize singleton collection names
- 07f4d43: fix: don't singularize 'data' to 'datum'
- 1386e10: fix: don't include folders in the generated types

## 0.2.2

### Patch Changes

- 9be7f48: fix: handle further nullable directus fields

## 0.2.1

### Patch Changes

- d8f23b3: Use latest @directus-ts-typegen/shared version for build. Please use this version instead of v0.2.0

## 0.2.0

### Minor Changes

- ec04811: Add stricter types for structured fields where literals are available, preserve primitive type of dropdowns and add support for radio buttons
