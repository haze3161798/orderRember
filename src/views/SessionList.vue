<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useSessionsStore } from '../stores/sessions'
import { computeMemberSubtotals, computeSessionTotal } from '../utils/calc'

const emit = defineEmits(['open'])
const store = useSessionsStore()

const drawerVisible = ref(false)
const newName = ref('')

const sessionStats = computed(() => {
  const map = {}
  for (const s of store.sessions) {
    const subs = computeMemberSubtotals(s)
    let unpaid = 0
    s.members.forEach((m) => {
      if (!m.paid) unpaid += subs[m.id] || 0
    })
    map[s.id] = {
      total: computeSessionTotal(s),
      unpaid
    }
  }
  return map
})

function handleCreate() {
  const name = newName.value.trim()
  if (!name) {
    ElMessage.warning('請輸入聚餐名稱')
    return
  }
  const id = store.createSession(name)
  newName.value = ''
  drawerVisible.value = false
  emit('open', id)
}

function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header class="sticky top-0 bg-white shadow-sm z-10">
      <div class="px-4 py-3">
        <h1 class="text-lg font-semibold">orderRember</h1>
        <p class="text-xs text-gray-500 mt-0.5">聚餐記帳・分攤計算</p>
      </div>
    </header>

    <main class="flex-1 p-4 pb-28">
      <el-empty
        v-if="store.sessions.length === 0"
        description="還沒有聚餐記錄，點下方按鈕開始"
      />

      <div v-else class="space-y-3">
        <div
          v-for="s in store.sessions"
          :key="s.id"
          class="bg-white rounded-xl shadow-sm p-4 active:bg-gray-100 transition cursor-pointer"
          @click="emit('open', s.id)"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <h2 class="text-base font-semibold truncate flex-1">{{ s.name }}</h2>
            <div @click.stop>
              <el-popconfirm
                title="確定要刪除此聚餐？"
                confirm-button-text="刪除"
                cancel-button-text="取消"
                @confirm="store.deleteSession(s.id)"
              >
                <template #reference>
                  <el-button link type="danger" size="small">刪除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
          <div class="text-xs text-gray-500 flex items-center gap-3">
            <span>{{ fmtDate(s.createdAt) }}</span>
            <span>{{ s.members.length }} 人</span>
            <span>{{ s.items.length }} 項</span>
          </div>
          <div class="mt-3 flex items-baseline justify-between">
            <span class="text-xs text-gray-400">總額</span>
            <span class="text-lg font-semibold">
              NT$ {{ sessionStats[s.id]?.total || 0 }}
            </span>
          </div>
          <div
            v-if="sessionStats[s.id]?.unpaid > 0"
            class="text-sm text-orange-600 text-right mt-0.5"
          >
            未收 NT$ {{ sessionStats[s.id].unpaid }}
          </div>
        </div>
      </div>
    </main>

    <div class="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
      <el-button
        type="primary"
        size="large"
        class="!w-full"
        @click="drawerVisible = true"
      >
        + 建立新聚餐
      </el-button>
    </div>

    <el-drawer
      v-model="drawerVisible"
      direction="btt"
      size="auto"
      title="建立新聚餐"
      :with-header="true"
    >
      <div class="space-y-4 px-1 pb-2">
        <el-input
          v-model="newName"
          placeholder="例: 5/3 火鍋聚餐"
          size="large"
          maxlength="40"
          show-word-limit
          @keyup.enter="handleCreate"
        />
        <el-button
          type="primary"
          size="large"
          class="!w-full"
          @click="handleCreate"
        >
          建立
        </el-button>
      </div>
    </el-drawer>
  </div>
</template>
