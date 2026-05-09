export function itemTotal(item) {
  return item.price * (item.quantity ?? 1)
}

export function computeMemberSubtotals(session) {
  const totals = {}
  session.members.forEach((m) => {
    totals[m.id] = 0
  })

  session.items.forEach((item) => {
    const assignees = item.assignedTo.filter((id) => totals[id] !== undefined)
    const n = assignees.length
    if (n === 0) return

    const total = itemTotal(item)
    const baseShare = Math.floor(total / n)
    const remainder = total - baseShare * n
    assignees.forEach((memberId, idx) => {
      totals[memberId] += baseShare + (idx < remainder ? 1 : 0)
    })
  })

  return totals
}

export function computeSessionTotal(session) {
  return session.items.reduce((sum, it) => sum + itemTotal(it), 0)
}
