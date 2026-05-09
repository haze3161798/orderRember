<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SessionList from './views/SessionList.vue'
import SessionDetail from './views/SessionDetail.vue'

const currentSessionId = ref(null)

function syncFromHash() {
  const m = location.hash.match(/^#\/session\/(.+)$/)
  currentSessionId.value = m ? m[1] : null
}

function openSession(id) {
  history.pushState({}, '', `#/session/${id}`)
  currentSessionId.value = id
}

function closeSession() {
  if (location.hash.startsWith('#/session/')) {
    history.back()
  } else {
    currentSessionId.value = null
  }
}

onMounted(() => {
  syncFromHash()
  window.addEventListener('popstate', syncFromHash)
})

onUnmounted(() => {
  window.removeEventListener('popstate', syncFromHash)
})
</script>

<template>
  <SessionDetail
    v-if="currentSessionId"
    :session-id="currentSessionId"
    @back="closeSession"
  />
  <SessionList v-else @open="openSession" />
</template>
