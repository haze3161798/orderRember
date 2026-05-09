import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'orderRember:v1'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.sessions) ? parsed.sessions : []
  } catch {
    return []
  }
}

function saveToStorage(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions }))
  } catch (e) {
    console.error('localStorage save failed', e)
  }
}

export const useSessionsStore = defineStore('sessions', () => {
  const sessions = ref(loadFromStorage())

  watch(sessions, (val) => saveToStorage(val), { deep: true })

  function getSession(id) {
    return sessions.value.find((s) => s.id === id)
  }

  function createSession(name) {
    const session = {
      id: uid(),
      name,
      createdAt: Date.now(),
      members: [],
      items: []
    }
    sessions.value.unshift(session)
    return session.id
  }

  function deleteSession(id) {
    const i = sessions.value.findIndex((s) => s.id === id)
    if (i !== -1) sessions.value.splice(i, 1)
  }

  function addMember(sessionId, name) {
    const s = getSession(sessionId)
    if (!s) return
    s.members.push({ id: uid(), name, paid: false })
  }

  function deleteMember(sessionId, memberId) {
    const s = getSession(sessionId)
    if (!s) return
    s.members = s.members.filter((m) => m.id !== memberId)
    s.items = s.items
      .map((it) => ({
        ...it,
        assignedTo: it.assignedTo.filter((id) => id !== memberId)
      }))
      .filter((it) => it.assignedTo.length > 0)
  }

  function toggleMemberPaid(sessionId, memberId) {
    const s = getSession(sessionId)
    const m = s?.members.find((mm) => mm.id === memberId)
    if (m) m.paid = !m.paid
  }

  function addItem(sessionId, item) {
    const s = getSession(sessionId)
    if (!s) return
    s.items.push({ id: uid(), ...item })
  }

  function updateItem(sessionId, itemId, patch) {
    const s = getSession(sessionId)
    const item = s?.items.find((i) => i.id === itemId)
    if (item) Object.assign(item, patch)
  }

  function deleteItem(sessionId, itemId) {
    const s = getSession(sessionId)
    if (!s) return
    s.items = s.items.filter((i) => i.id !== itemId)
  }

  function markAllPaid(sessionId) {
    const s = getSession(sessionId)
    if (!s) return
    s.members.forEach((m) => {
      m.paid = true
    })
  }

  return {
    sessions,
    getSession,
    createSession,
    deleteSession,
    addMember,
    deleteMember,
    toggleMemberPaid,
    addItem,
    updateItem,
    deleteItem,
    markAllPaid
  }
})
