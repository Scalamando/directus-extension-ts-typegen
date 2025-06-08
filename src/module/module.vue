<script setup lang="ts">
import { useApi } from "@directus/extensions-sdk";
import { useAsyncState } from "@vueuse/core";

const api = useApi();

const { state, isReady } = useAsyncState(
  () => api.get("/ts-typegen/types"),
  null,
);
</script>

<template>
  <private-view title="TypeScript TypeGen">
    <div class="page">
      <pre v-if="isReady && state != null">{{ state.data.types }}</pre>
      <p v-else>Loading &hellip;</p>
    </div>
  </private-view>
</template>

<style scoped>
.page {
  padding: 0 var(--content-padding);
  display: flex;
}
</style>
