<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSessionsStore } from '../stores/sessions'
import { computeMemberSubtotals, computeSessionTotal, itemTotal } from '../utils/calc'

const props = defineProps({ sessionId: { type: String, required: true } })
const emit = defineEmits(['back'])

const store = useSessionsStore()
const session = computed(() => store.getSession(props.sessionId))

watch(
  session,
  (s) => {
    if (!s) emit('back')
  },
  { immediate: true }
)

const subtotals = computed(() =>
  session.value ? computeMemberSubtotals(session.value) : {}
)
const total = computed(() => (session.value ? computeSessionTotal(session.value) : 0))
const unpaidTotal = computed(() => {
  if (!session.value) return 0
  let unpaid = 0
  session.value.members.forEach((m) => {
    if (!m.paid) unpaid += subtotals.value[m.id] || 0
  })
  return unpaid
})
const paidTotal = computed(() => total.value - unpaidTotal.value)

function memberName(id) {
  return session.value?.members.find((m) => m.id === id)?.name || '?'
}

const memberDrawerVisible = ref(false)
const newMemberName = ref('')

function handleAddMember() {
  const name = newMemberName.value.trim()
  if (!name) {
    ElMessage.warning('請輸入名字')
    return
  }
  store.addMember(props.sessionId, name)
  newMemberName.value = ''
  memberDrawerVisible.value = false
}

const itemDrawerVisible = ref(false)
const editingItemId = ref(null)
const itemForm = ref({
  name: '',
  price: 0,
  quantity: 1,
  mode: 'personal',
  assignedTo: []
})

const itemFormSubtotal = computed(
  () => (itemForm.value.price || 0) * (itemForm.value.quantity || 1)
)

function openAddItem() {
  if (!session.value || session.value.members.length === 0) {
    ElMessage.warning('請先新增至少一位成員')
    return
  }
  editingItemId.value = null
  itemForm.value = {
    name: '',
    price: 0,
    quantity: 1,
    mode: 'personal',
    assignedTo: []
  }
  itemDrawerVisible.value = true
}

function openEditItem(item) {
  editingItemId.value = item.id
  itemForm.value = {
    name: item.name,
    price: item.price,
    quantity: item.quantity ?? 1,
    mode: item.assignedTo.length > 1 ? 'shared' : 'personal',
    assignedTo: [...item.assignedTo]
  }
  itemDrawerVisible.value = true
}

function handleModeChange(mode) {
  itemForm.value.mode = mode
  if (mode === 'personal' && itemForm.value.assignedTo.length > 1) {
    itemForm.value.assignedTo = [itemForm.value.assignedTo[0]]
  }
}

function handleSaveItem() {
  const f = itemForm.value
  const name = f.name.trim()
  if (!name) {
    ElMessage.warning('請輸入品項名稱')
    return
  }
  if (!f.price || f.price <= 0) {
    ElMessage.warning('金額需大於 0')
    return
  }
  if (!f.quantity || f.quantity < 1) {
    ElMessage.warning('數量至少為 1')
    return
  }
  if (f.assignedTo.length === 0) {
    ElMessage.warning('請選擇歸屬成員')
    return
  }

  const data = {
    name,
    price: f.price,
    quantity: f.quantity,
    assignedTo: [...f.assignedTo]
  }

  if (editingItemId.value) {
    store.updateItem(props.sessionId, editingItemId.value, data)
  } else {
    store.addItem(props.sessionId, data)
  }
  itemDrawerVisible.value = false
}

function handleDeleteItem() {
  if (!editingItemId.value) return
  store.deleteItem(props.sessionId, editingItemId.value)
  itemDrawerVisible.value = false
}
</script>

<template>
  <div v-if="session" class="min-h-screen bg-gray-50 flex flex-col">
    <header class="sticky top-0 bg-white shadow-sm z-10">
      <div class="px-3 py-2 flex items-center gap-2">
        <el-button size="default" @click="emit('back')">
          ← 返回
        </el-button>
        <h1 class="text-base font-semibold flex-1 truncate">{{ session.name }}</h1>
      </div>
    </header>

    <main class="flex-1 p-4 pb-44 space-y-6">
      <!-- 成員區塊 -->
      <section>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-gray-700">
            成員 ({{ session.members.length }})
          </h2>
          <el-button size="small" @click="memberDrawerVisible = true">
            + 加成員
          </el-button>
        </div>
        <div
          v-if="session.members.length === 0"
          class="text-center text-gray-400 py-6 bg-white rounded-xl"
        >
          尚未新增成員
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="m in session.members"
            :key="m.id"
            class="bg-white rounded-xl p-3 flex items-center gap-3"
            :class="{ 'opacity-60': m.paid }"
          >
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ m.name }}</div>
              <div
                class="text-sm font-semibold"
                :class="m.paid ? 'text-gray-400' : 'text-orange-600'"
              >
                NT$ {{ subtotals[m.id] || 0 }}
                <span v-if="m.paid" class="ml-1 text-xs font-normal">✓ 已付</span>
              </div>
            </div>
            <el-switch
              :model-value="m.paid"
              @update:model-value="store.toggleMemberPaid(props.sessionId, m.id)"
            />
            <el-popconfirm
              title="刪除此成員會清掉只有他點的品項，確定？"
              confirm-button-text="刪除"
              cancel-button-text="取消"
              @confirm="store.deleteMember(props.sessionId, m.id)"
            >
              <template #reference>
                <el-button link type="danger" size="small">刪除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </section>

      <!-- 品項區塊 -->
      <section>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-sm font-semibold text-gray-700">
            品項 ({{ session.items.length }})
          </h2>
          <el-button size="small" type="primary" @click="openAddItem">
            + 加品項
          </el-button>
        </div>
        <div
          v-if="session.items.length === 0"
          class="text-center text-gray-400 py-6 bg-white rounded-xl"
        >
          尚未新增品項
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in session.items"
            :key="item.id"
            class="bg-white rounded-xl p-3 active:bg-gray-100 cursor-pointer"
            @click="openEditItem(item)"
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-medium truncate">
                {{ item.name }}
                <span
                  v-if="(item.quantity ?? 1) > 1"
                  class="text-xs text-gray-500 ml-1 font-normal"
                >× {{ item.quantity }}</span>
              </span>
              <span class="font-semibold whitespace-nowrap">
                NT$ {{ itemTotal(item) }}
              </span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              <template v-if="(item.quantity ?? 1) > 1">
                <span class="mr-2">單價 NT$ {{ item.price }}</span>
              </template>
              <template v-if="item.assignedTo.length === 1">
                🧍 {{ memberName(item.assignedTo[0]) }}
              </template>
              <template v-else>
                👥 {{ item.assignedTo.length }} 人共用：{{
                  item.assignedTo.map(memberName).join('、')
                }}
                · 每人約 NT$
                {{ Math.round(itemTotal(item) / item.assignedTo.length) }}
              </template>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 底部統計列 -->
    <div
      class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg"
    >
      <div class="p-3 space-y-1.5">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">總額</span>
          <span class="font-semibold">NT$ {{ total }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-green-600">已收</span>
          <span>NT$ {{ paidTotal }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-orange-600">未收</span>
          <span class="font-semibold text-orange-600">NT$ {{ unpaidTotal }}</span>
        </div>
        <el-button
          v-if="unpaidTotal > 0 && session.members.length > 0"
          size="small"
          class="!w-full !mt-2"
          @click="store.markAllPaid(props.sessionId)"
        >
          全部標為已付
        </el-button>
      </div>
    </div>

    <!-- 新增成員 drawer -->
    <el-drawer
      v-model="memberDrawerVisible"
      direction="btt"
      size="auto"
      title="新增成員"
    >
      <div class="space-y-4 px-1 pb-2">
        <el-input
          v-model="newMemberName"
          placeholder="名字或綽號"
          size="large"
          maxlength="20"
          show-word-limit
          @keyup.enter="handleAddMember"
        />
        <el-button
          type="primary"
          size="large"
          class="!w-full"
          @click="handleAddMember"
        >
          加入
        </el-button>
      </div>
    </el-drawer>

    <!-- 新增 / 編輯品項 drawer -->
    <el-drawer
      v-model="itemDrawerVisible"
      direction="btt"
      size="auto"
      :title="editingItemId ? '編輯品項' : '新增品項'"
    >
      <div class="space-y-4 px-1 pb-2">
        <div>
          <label class="block text-sm text-gray-600 mb-1">品項名稱</label>
          <el-input
            v-model="itemForm.name"
            placeholder="例: 牛肉鍋"
            size="large"
            maxlength="30"
          />
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="block text-sm text-gray-600 mb-1">單價 (NT$)</label>
            <el-input-number
              v-model="itemForm.price"
              :min="0"
              :step="10"
              size="large"
              class="!w-full"
              controls-position="right"
            />
          </div>
          <div class="w-32">
            <label class="block text-sm text-gray-600 mb-1">數量</label>
            <el-input-number
              v-model="itemForm.quantity"
              :min="1"
              :step="1"
              :precision="0"
              size="large"
              class="!w-full"
              controls-position="right"
            />
          </div>
        </div>
        <div
          v-if="itemForm.quantity > 1 && itemForm.price > 0"
          class="text-sm text-gray-500 -mt-2"
        >
          小計：NT$ {{ itemFormSubtotal }}
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-2">歸屬</label>
          <el-radio-group
            :model-value="itemForm.mode"
            @update:model-value="handleModeChange"
            class="!w-full"
          >
            <el-radio-button value="personal" class="!flex-1">
              🧍 個人
            </el-radio-button>
            <el-radio-button value="shared" class="!flex-1">
              👥 共用平分
            </el-radio-button>
          </el-radio-group>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-2">
            {{ itemForm.mode === 'personal' ? '選擇成員' : '選擇共用成員（可多選）' }}
          </label>
          <el-radio-group
            v-if="itemForm.mode === 'personal'"
            :model-value="itemForm.assignedTo[0]"
            @update:model-value="(v) => (itemForm.assignedTo = [v])"
            class="!flex !flex-wrap gap-2"
          >
            <el-radio
              v-for="m in session.members"
              :key="m.id"
              :value="m.id"
              border
              size="large"
            >
              {{ m.name }}
            </el-radio>
          </el-radio-group>
          <el-checkbox-group
            v-else
            v-model="itemForm.assignedTo"
            class="!flex !flex-wrap gap-2"
          >
            <el-checkbox
              v-for="m in session.members"
              :key="m.id"
              :value="m.id"
              border
              size="large"
            >
              {{ m.name }}
            </el-checkbox>
          </el-checkbox-group>
        </div>

        <div class="flex gap-2 pt-2">
          <el-popconfirm
            v-if="editingItemId"
            title="刪除此品項？"
            confirm-button-text="刪除"
            cancel-button-text="取消"
            @confirm="handleDeleteItem"
          >
            <template #reference>
              <el-button type="danger" size="large">刪除</el-button>
            </template>
          </el-popconfirm>
          <el-button
            type="primary"
            size="large"
            class="!flex-1"
            @click="handleSaveItem"
          >
            儲存
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>
