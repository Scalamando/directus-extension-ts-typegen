import { defineModule } from "@directus/extensions-sdk";
import IndexView from "./views/index.vue";

export default defineModule({
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
