import type { ModuleConfig } from "@directus/extensions";
import { defineModule } from "@directus/extensions-sdk";
import IndexView from "./views/index.vue";

const config: ModuleConfig = defineModule({
  id: "ts-typegen",
  name: "TS TypeGen",
  icon: "code",
  routes: [
    {
      path: "",
      component: IndexView,
    },
  ],
  preRegisterCheck(user) {
    return user.admin_access;
  },
});

export default config;
