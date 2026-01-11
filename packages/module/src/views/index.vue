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
import modulePackage from "../../package.json";

const api = useApi();

const moduleVersion = modulePackage.version;

const typePrefix = ref("");
const typeSuffix = ref("");
const typeStyle = ref<"interface" | "type">("interface");
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
          typeStyle: typeStyle.value,
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

    <template #navigation>
      <v-list nav>
        <v-list-item to="" active>
          <v-list-item-icon><v-icon name="code" /></v-list-item-icon>
          <v-list-item-content>
            <v-text-overflow text="Type Generation"> </v-text-overflow>
          </v-list-item-content>
        </v-list-item>
        <v-divider />
        <v-list-item
          href="https://github.com/Scalamando/directus-extension-ts-typegen/tree/main"
          target="_blank"
          rel="noopener"
        >
          <v-list-item-icon><v-icon name="book" /></v-list-item-icon>
          <v-list-item-content>
            <v-text-overflow text="Docs"> </v-text-overflow>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          href="https://github.com/Scalamando/directus-extension-ts-typegen/releases"
          target="_blank"
          rel="noopener"
        >
          <v-list-item-icon><v-icon name="history" /></v-list-item-icon>
          <v-list-item-content>
            <v-text-overflow text="Changelog"> </v-text-overflow>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          href="https://github.com/Scalamando/directus-extension-ts-typegen/issues"
          target="_blank"
          rel="noopener"
        >
          <v-list-item-icon><v-icon name="help" /></v-list-item-icon>
          <v-list-item-content>
            <v-text-overflow text="Issues & Support"> </v-text-overflow>
          </v-list-item-content>
        </v-list-item>
        <v-list-item
          :href="`https://github.com/Scalamando/directus-extension-ts-typegen/releases/tag/directus-ts-typegen@${moduleVersion}`"
          target="_blank"
          rel="noopener"
          class="version"
        >
          <v-list-item-content>
            <v-text-overflow :text="`directus-ts-typegen ${moduleVersion}`"></v-text-overflow>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </template>

    <div class="page">
      <div class="options">
        <h2 class="heading">Options</h2>

        <label for="required-not-nullable">Required Not Nullable</label>
        <v-checkbox v-model="requiredNotNullable" id="required-not-nullable" block>
          Treat required fields as non-nullable
        </v-checkbox>
        <small class="type-note">Omit <code>null</code> from required field types.</small>

        <label for="type-prefix">Type Prefix</label>
        <v-input v-model="typePrefix" id="type-prefix" placeholder="Enter a type prefix..." trim />
        <small class="type-note">Prepends text to every generated type name.</small>

        <label for="type-suffix">Type Suffix</label>
        <v-input v-model="typeSuffix" id="type-suffix" placeholder="Enter a type suffix..." trim />
        <small class="type-note">Appends text to every generated type name.</small>

        <label for="type-style">Type Style</label>
        <v-select
          v-model="typeStyle"
          id="type-style"
          :items="[
            { text: 'Interface', value: 'interface' },
            { text: 'Type', value: 'type' },
          ]"
        />
        <small class="type-note"
          >Choose whether to emit <code>interface</code> or <code>type</code> declarations.</small
        >
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

@media screen and (max-width: 1024px) {
  #ts-typegen {
    #main-content {
      > .header-bar {
        min-width: 0;
      }
      > .content-wrapper {
        overflow: auto;
      }
    }
  }
}
</style>

<style scoped>
.header-icon {
  --v-button-color-disabled: var(--theme--foreground);
}

.version,
.version :deep(.v-icon) {
  color: var(--theme--foreground-subdued);
  transition: color var(--fast) var(--transition);

  :hover {
    color: var(--theme--foreground-accent);
  }
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
      margin-bottom: 4px;
      cursor: pointer;
      color: var(--theme--form--field--label--foreground);
    }

    .type-note {
      color: var(--theme--foreground-subdued);
      font-weight: var(--theme--fonts--sans--font-weight);
      font-size: 13px;
      font-family: var(--theme--fonts--sans--font-family);
      font-style: italic;
      line-height: 18px;
      display: block;
      margin: -2px 0 32px;
    }

    .type-note code {
      font-family: var(--theme--fonts--monospace--font-family);
      font-size: 12px;
      background: var(--theme--background-subdued);
      padding: 0 4px;
      border-radius: var(--theme--border-radius);
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
  .page {
    flex-direction: column;
    height: unset;
  }
  .page .options {
    flex-direction: column;
  }
}
</style>
