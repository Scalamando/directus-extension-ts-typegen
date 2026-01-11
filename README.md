# directus-extension-ts-typegen

A suite of tools to automatically generates TypeScript types for your Directus schema, making it easier to work with your Directus data in a type-safe manner.

This suite features support for O2M, M2O, M2M and M2A relations, JSON fields used by dropdowns/selects/etc., and GeoJSON fields.

![preview](https://github.com/user-attachments/assets/6a24c17a-9d27-495d-aa95-93de33cdbf2f)

## Usage

### Directus module (GUI)

1. Install the extension (Marketplace or via npm in your Directus setup).
2. Enable the TS Typegen module under Settings -> Modules.
3. Open the module from the sidebar, adjust options, and copy the generated types.
4. Paste the types into your project and use them with the Directus SDK.

### CLI

Run interactively:

```bash
npx directus-ts-typegen
```

Or provide credentials and output explicitly:

```bash
npx directus-ts-typegen \
  --directus-host https://your-directus.com \
  --directus-email admin@example.com \
  --directus-password yourpassword \
  --directus-output ./types/directus.ts
```

The CLI also supports static tokens for CI via `--directus-token` and the
matching `DIRECTUS_TS_TYPEGEN_*` environment variables. See the
[package readme](/packages/cli/README.md) for the full option list.

Further options affecting the type generation are available
in both the CLI and the module UI. See the CLI and module readmes for details.

## Packages

- [directus-extension-ts-typegen](./packages/module/) - Directus module extension to generate the types via gui
- [directus-ts-typegen](./packages/cli/) - CLI to integrate the type generaton directly in your code base
- [@directus-ts-typegen/shared](./packages/shared/) - Core type generation logic used in the extension and CLI

## Credits

- **[directus-extension-generate-types](https://github.com/maltejur/directus-extension-generate-types)** - Initial inspiration for this project

## License

Published under the [MIT](./LICENSE) License.

---

_Need help or found a bug? Please open an issue on the project repository._
