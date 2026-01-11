<script setup lang="ts">
import {
  generateTypes,
  type DirectusCollection,
  type DirectusField,
  type DirectusRelation,
} from "@directus-ts-typegen/shared";
import { useApi } from "@directus/extensions-sdk";
import { useAsyncState } from "@vueuse/core";
import { computed, ref } from "vue";
import CodeHighlighter from "../components/CodeHighlighter.vue";

const api = useApi();

const typePrefix = ref("");
const typeSuffix = ref("");
const requiredNotNullable = ref(false);

const { state: collections, isLoading: isLoadingCollections } = useAsyncState(
  () => api.get<{ data: DirectusCollection[] }>("/collections").then((res) => res.data.data),
  []
);
const { state: fields, isLoading: isLoadingFields } = useAsyncState(
  () => api.get<{ data: DirectusField[] }>("/fields").then((res) => res.data.data),
  []
);
const { state: relations, isLoading: isLoadingRelations } = useAsyncState(
  () => api.get<{ data: DirectusRelation[] }>("/relations?limit=-1").then((res) => res.data.data),
  []
);
const isLoading = computed(
  () => isLoadingCollections.value && isLoadingRelations.value && isLoadingFields.value
);

const types = computed(() =>
  isLoading.value
    ? ""
    : generateTypes(
        { collections: collections.value, fields: fields.value, relations: relations.value },
        {
          typePrefix: typePrefix.value,
          typeSuffix: typeSuffix.value,
          requiredNotNullable: requiredNotNullable.value,
        }
      )
);
</script>

<template>
  <private-view title="TypeScript TypeGen" id="ts-typegen">
    <template #title-outer:prepend>
      <v-button icon rounded disabled class="header-icon">
        <v-icon name="code" />
      </v-button>
    </template>

    <div class="page">
      <div class="options">
        <h2 class="heading">Options</h2>

        <label for="required-not-nullable">Required Not Nullable</label>
        <v-checkbox v-model="requiredNotNullable" id="required-not-nullable" block>
          Treat required fields as non-nullable
        </v-checkbox>

        <label for="type-prefix">Type Prefix</label>
        <v-input v-model="typePrefix" id="type-prefix" placeholder="Enter a type prefix..." trim />

        <label for="type-suffix">Type Suffix</label>
        <v-input v-model="typeSuffix" id="type-suffix" placeholder="Enter a type suffix..." trim />
      </div>

      <Suspense>
        <template #fallback>
          <p>Loading types &hellip;</p>
        </template>

        <CodeHighlighter
          :code="types"
          :class="['code', isLoading && 'loading']"
          :loading="isLoading"
        />
      </Suspense>
    </div>
  </private-view>
</template>

<style>
#ts-typegen {
  #main-content {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;

    > .content-wrapper {
      overflow: hidden;
      display: block !important;
    }
  }
}
</style>

<style scoped>
.header-icon {
  --v-button-color-disabled: var(--theme--foreground);
}

.page {
  padding: 0 var(--content-padding);
  padding-bottom: var(--content-padding);
  display: flex;
  flex-direction: row-reverse;
  gap: 1rem;
  height: 100%;

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

    .v-input,
    .v-checkbox {
      margin-bottom: 16px;
    }
  }

  .code {
    max-width: 100%;
    width: 100%;

    border: var(--theme--border-width) solid var(--theme--form--field--input--border-color);
    border-radius: var(--theme--border-radius);
    border-color: var(--theme--form--field--input--border-color-hover);
    box-shadow: var(--theme--form--field--input--box-shadow-hover);
  }
}

@media screen and (max-width: 1024px) {
  .page .options {
    flex-direction: row;
  }
}
</style>
