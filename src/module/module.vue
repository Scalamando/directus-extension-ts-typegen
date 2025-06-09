<script setup lang="ts">
import { useApi } from "@directus/extensions-sdk";
import { useAsyncState, watchDebounced } from "@vueuse/core";
import { ref } from "vue";
import CodeHighlighter from "./CodeHighlighter.vue";

const api = useApi();

const typePrefix = ref("");
const requiredNotNullable = ref(false);

const { state, isLoading, execute } = useAsyncState(
  () =>
    api
      .get<{ types: string }>(`/ts-typegen/types`, {
        params: {
          typePrefix: typePrefix.value,
          requiredNotNullable: requiredNotNullable.value,
        },
      })
      .then((res) => res.data),
  { types: "" },
  { resetOnExecute: false }
);
watchDebounced([typePrefix, requiredNotNullable], () => execute(), {
  debounce: 500,
  maxWait: 1000,
});
</script>

<template>
  <private-view title="TypeScript TypeGen">
    <template #title-outer:prepend>
      <v-button icon rounded disabled class="header-icon">
        <v-icon name="code" />
      </v-button>
    </template>

    <div class="page">
      <div class="options">
        <h2 class="heading">Options</h2>
        <label for="required-not-nullable">Required Not Nullable</label>
        <v-checkbox v-model="requiredNotNullable" id="required-not-nullable" block
          >Treat required fields as non-nullable</v-checkbox
        >
        <label for="type-prefix">Type Prefix</label>
        <v-input v-model="typePrefix" id="type-prefix" placeholder="Enter a type prefix..." trim />
      </div>

      <Suspense>
        <template #fallback>
          <p>Loading types &hellip;</p>
        </template>
        <CodeHighlighter
          :code="state.types"
          :class="['code', isLoading && 'loading']"
          :loading="isLoading"
        ></CodeHighlighter>
      </Suspense>
    </div>
  </private-view>
</template>

<style scoped>
.page {
  padding: 0 var(--content-padding);
  display: flex;
  flex-direction: row-reverse;
  gap: 1rem;

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;

    .heading {
      font-size: 24px;
      line-height: 22px;
      font-weight: var(--theme--fonts--display--font-weight);
      font-family: var(--theme--fonts--display--font-family);
      margin-bottom: 20px;
    }

    label {
      font-size: 16px;
      line-height: 19px;
      margin-bottom: 8px;
      cursor: pointer;
      color: var(--theme--form--field--label--foreground);
    }

    .v-input, .v-checkbox {
      margin-bottom: 16px;
    }
  }
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
