<script setup lang="ts">
import { useApi } from "@directus/extensions-sdk";
import { useAsyncState } from "@vueuse/core";
import CodeHighlighter from "./CodeHighlighter.vue";
import { ref } from "vue";

interface Options {
  typePrefix: string;
  requiredNotNullable: boolean;
}

const options = ref<Options>({
  typePrefix: "",
  requiredNotNullable: false,
});

const api = useApi();
const { state, isReady } = useAsyncState(
  () => api.get(`/ts-typegen/types`, {
    params: options.value
  }),
  null
);
</script>

<template>
  <private-view title="TypeScript TypeGen">
    <template #title-outer:prepend>
      <v-button icon rounded disabled class="header-icon">
        <v-icon name="code" />
      </v-button>
    </template>
    <div class="page">
      <Suspense v-if="isReady && state?.data.types">
        <template #fallback>
          <p>Loading types &hellip;</p>
        </template>
        <CodeHighlighter :code="state.data.types" class="code"></CodeHighlighter>
      </Suspense>
    </div>
  </private-view>
</template>

<style scoped>
.page {
  padding: 0 var(--content-padding);
  display: flex;
}

.code {
  max-width: 100%;
  width: 80ch;

  border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
  border-radius: var(--theme--border-radius);
  border-color: var(--theme--form--field--input--border-color-hover);
  box-shadow: var(--theme--form--field--input--box-shadow-hover);
}

.header-icon {
  --v-button-color-disabled: var(--theme--foreground);
}
</style>
