<script setup lang="ts">
import { computedAsync, useClipboard } from "@vueuse/core";
import { format } from "prettier";
import estreePlugin from "prettier/plugins/estree";
import typescriptPlugin from "prettier/plugins/typescript";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { computed, onBeforeUnmount } from "vue";

const props = defineProps<{
  code: string;
  loading?: boolean;
}>();

const highlighter = await createHighlighterCore({
  themes: [import("@shikijs/themes/github-light"), import("@shikijs/themes/github-dark")],
  langs: [import("@shikijs/langs/typescript")],
  engine: createJavaScriptRegexEngine(),
});
onBeforeUnmount(() => highlighter.dispose());

const formattedCode = computedAsync(
  () =>
    format(props.code, {
      parser: "typescript",
      plugins: [estreePlugin, typescriptPlugin],
    }),
  ""
);

const highlightedCode = computed(() =>
  highlighter.codeToHtml(formattedCode.value, {
    lang: "typescript",
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  })
);

const { copy, copied } = useClipboard({ source: formattedCode });
</script>

<template>
  <div class="container">
    <div class="toolbar">
      <v-button
        @click="copy(formattedCode)"
        v-tooltip.top="copied ? 'Copied!' : 'Click to copy'"
        class="copy-button"
        kind="secondary"
      >
        <v-icon name="content_copy" />
        <template v-if="copied">Copied!</template>
        <template v-else>Copy to clipboard</template>
      </v-button>

      <v-progress-circular v-if="props.loading" indeterminate />
    </div>
    <div v-html="highlightedCode"></div>
  </div>
</template>

<style>
.container {
  position: relative;
}

.toolbar {
  position: sticky;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.copy-button {
  .button {
    padding-left: 15px;
  }
  .content {
    gap: 0.5em;
  }
}

/* Shiki */

body.dark .shiki,
body.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
  /* Optional, if you also want font styles */
  font-style: var(--shiki-dark-font-style) !important;
  font-weight: var(--shiki-dark-font-weight) !important;
  text-decoration: var(--shiki-dark-text-decoration) !important;
}

.shiki {
  padding: 1rem;
  overflow-x: auto;
  * {
    user-select: text;
  }
}
</style>
