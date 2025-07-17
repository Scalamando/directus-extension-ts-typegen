# directus-extension-ts-typegen

[![npm version](https://badge.fury.io/js/directus-extension-ts-typegen.svg)](https://badge.fury.io/js/directus-extension-ts-typegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Directus extension that automatically generates TypeScript types for your Directus schema, making it easier to work with your Directus data in a type-safe manner.

This extensions features support for O2M, M2O, M2M and M2A relations.

![preview](https://github.com/user-attachments/assets/6a24c17a-9d27-495d-aa95-93de33cdbf2f)

## Installation

This extension can be installed in multiple ways:

### Via Directus Marketplace

1. Navigate to your Directus admin panel
2. Go to Settings → Marketplace
3. Search for "directus-extension-ts-typegen"
4. Click "Install Extension"

### Via npm (Docker Setup)

Add the extension to your Directus Dockerfile. For detailed installation instructions, refer to the [official Directus documentation](https://directus.io/docs/self-hosting/including-extensions).

**Requirements:** Directus >= 10.10.0

## Basic Usage

1. After installation, navigate to your Directus admin panel
2. Enable the TS Typegen module under settings → modules
3. Look for the new TS Typegen module in your sidebar
4. Copy the generated TypeScript types (and change any of the options)
5. Paste them into your project

The generated types will reflect your current Directus schema and can be used with the Directus SDK for full type safety in your applications.

## Credits

- **[directus-extension-generate-types](https://github.com/maltejur/directus-extension-generate-types)** - Initial inspiration for this project

## License

Published under the [MIT](./LICENSE) License.

---

_Need help or found a bug? Please open an issue on the project repository._
