import { defineModule } from "@directus/extensions-sdk";
import ModuleComponent from "./module.vue";

export default defineModule({
  id: "ts-typegen",
  name: "TS TypeGen",
  icon: "code",
  routes: [
    {
      path: "",
      component: ModuleComponent,
    },
  ],
  preRegisterCheck(user) {
    return user.admin_access;
  },
});
