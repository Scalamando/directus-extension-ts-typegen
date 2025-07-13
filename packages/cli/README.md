# directus-ts-typegen

[![npm version](https://badge.fury.io/js/directus-ts-typegen.svg)](https://badge.fury.io/js/directus-ts-typegen)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A CLI that automatically generates TypeScript types for your Directus schema, making it easier to work with your Directus data in a type-safe manner.

This CLI features support for O2M (One-to-Many), M2O (Many-to-One), M2M (Many-to-Many), and M2A (Many-to-Any) relations.

## Installation

### Global Installation

```bash
npm install -g directus-ts-typegen
```

### As Dev Dependency

```bash
npm install --save-dev directus-ts-typegen
```

### One-time Usage

```bash
npx directus-ts-typegen
```

## Usage and Options

### Interactive Mode

When you run the CLI without all required options, it will prompt you interactively:

```bash
npx directus-ts-typegen
```

The CLI will ask for:

- Directus instance URL (with connectivity validation)
- Authentication method (email/password or static token)
- Credentials based on your chosen auth method
- Output file location (optional - defaults to stdout)
- Confirmation before overwriting existing files

### Command Line Options

```bash
npx directus-ts-typegen [options]
```

- **`--directus-host`**: Host address of your directus instance
- **`--directus-email`**: Email address of your directus admin user
- **`--directus-password`**: Password of your directus admin user
- **`--directus-token`**: Static token of your directus admin user
- **`--directus-output`**: Location of the file the types will be written to. If not set, types output to stdout

These options can also be set using environment variables:

```bash
DIRECTUS_TS_TYPEGEN_HOST=https://your-directus.com
DIRECTUS_TS_TYPEGEN_PASSWORD=yourpassword
DIRECTUS_TS_TYPEGEN_EMAIL=admin@example.com
DIRECTUS_TS_TYPEGEN_TOKEN=your-static-token
DIRECTUS_TS_TYPEGEN_OUTPUT=./types/directus.ts
```

## Authentication

The CLI supports two authentication methods to access your Directus instance:

### Email & Password

```bash
npx directus-ts-typegen --directus-host https://your-directus.com --directus-email admin@example.com --directus-password yourpassword
```

### Static Access Token

```bash
npx directus-ts-typegen --directus-host https://your-directus.com --directus-token your-static-token
```

> **Note**: Static tokens are recommended for CI/CD environments and automated workflows.

## License

Published under the [MIT](./LICENSE) License.

---

_Need help or found a bug? Please open an issue on the project repository._
