import { defineEndpoint } from "@directus/extensions-sdk";
import { generateTypes } from "../shared/typegen";

export default defineEndpoint({
  id: "ts-typegen",
  handler: async (router, { services, getSchema }) => {
    const { CollectionsService, FieldsService, RelationsService } = services;

    router.get("/types", async (req, res) => {
      const schema = await getSchema();
      const accountability = (req as any).accountability;

      const collectionService = new CollectionsService({ schema, accountability });
      const fieldService = new FieldsService({ schema, accountability });
      const relationService = new RelationsService({ schema, accountability });

      const collections = await collectionService.readByQuery({ limit: -1 });
      const fields = await fieldService.readAll();
      const relations = await relationService.readAll();

      const types = generateTypes(
        { collections, fields, relations },
        {
          typePrefix: req.query.typePrefix as string,
          requiredNotNullable: req.query.requiredNotNullable === "true",
        }
      );

      res.json({ types });
    });
  },
});
