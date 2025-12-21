import { supabase } from './supabase'
import { getOrders, getExpenses, getInventory } from './storage'

const uniqDuplicates = (arr) => {
  const seen = new Set()
  const dups = new Set()
  for (const v of arr) {
    if (v == null) continue
    if (seen.has(v)) dups.add(v)
    seen.add(v)
  }
  return Array.from(dups)
}

const diffIdSets = (uiItems, dbItems) => {
  const ui = new Set((uiItems || []).map(x => x?.id).filter(Boolean))
  const db = new Set((dbItems || []).map(x => x?.id).filter(Boolean))
  const onlyInUi = Array.from(ui).filter(id => !db.has(id))
  const onlyInDb = Array.from(db).filter(id => !ui.has(id))
  return { onlyInUi, onlyInDb }
}

const validateOrder = (o) => {
  const issues = []
  if (!o?.id) issues.push('missing id')
  if (!o?.customerName?.trim?.()) issues.push('missing customerName')
  if (!o?.createdDate) issues.push('missing createdDate')
  if (Number.isNaN(Number(o?.unitPrice))) issues.push('unitPrice not a number')
  if (Number.isNaN(Number(o?.totalAmount ?? o?.totalPrice))) issues.push('totalAmount not a number')
  return issues
}

const validateExpense = (e) => {
  const issues = []
  if (!e?.id) issues.push('missing id')
  if (!e?.description?.trim?.() && !e?.item?.trim?.()) issues.push('missing description/item')
  if (!e?.date) issues.push('missing date')
  if (Number.isNaN(Number(e?.amount ?? e?.total))) issues.push('amount not a number')
  return issues
}

const validateInventoryItem = (i) => {
  const issues = []
  if (!i?.id) issues.push('missing id')
  if (!i?.itemName?.trim?.()) issues.push('missing itemName')
  if (Number.isNaN(Number(i?.currentStock))) issues.push('currentStock not a number')
  if (Number.isNaN(Number(i?.reorderLevel))) issues.push('reorderLevel not a number')
  return issues
}

export async function runDataHealthCheck({ uiOrders = [], uiExpenses = [], uiInventory = [] } = {}) {
  const startedAt = new Date().toISOString()
  const report = {
    startedAt,
    ok: true,
    summary: {},
    issues: {
      schema: [],
      duplicates: [],
      invalidRecords: [],
      referentialIntegrity: [],
      sync: []
    }
  }

  // Fetch via app paths (ensures transforms are exercised)
  const [dbOrders, dbExpenses, dbInventory] = await Promise.all([
    getOrders(),
    getExpenses(),
    getInventory()
  ])

  report.summary = {
    orders: { ui: uiOrders.length, db: dbOrders.length },
    expenses: { ui: uiExpenses.length, db: dbExpenses.length },
    inventory: { ui: uiInventory.length, db: dbInventory.length }
  }

  // Duplicate IDs (UI and DB)
  const orderDupUi = uniqDuplicates((uiOrders || []).map(o => o?.id))
  const orderDupDb = uniqDuplicates((dbOrders || []).map(o => o?.id))
  const expenseDupUi = uniqDuplicates((uiExpenses || []).map(e => e?.id))
  const expenseDupDb = uniqDuplicates((dbExpenses || []).map(e => e?.id))
  const invDupUi = uniqDuplicates((uiInventory || []).map(i => i?.id))
  const invDupDb = uniqDuplicates((dbInventory || []).map(i => i?.id))

  const pushDup = (entity, where, ids) => {
    if (ids.length > 0) report.issues.duplicates.push({ entity, where, ids: ids.slice(0, 50), count: ids.length })
  }
  pushDup('orders', 'ui', orderDupUi)
  pushDup('orders', 'db', orderDupDb)
  pushDup('expenses', 'ui', expenseDupUi)
  pushDup('expenses', 'db', expenseDupDb)
  pushDup('inventory', 'ui', invDupUi)
  pushDup('inventory', 'db', invDupDb)

  // Validate required fields / shape
  const collectInvalid = (entity, rows, validateFn) => {
    for (const r of rows || []) {
      const issues = validateFn(r)
      if (issues.length) {
        report.issues.invalidRecords.push({ entity, id: r?.id ?? null, issues })
      }
    }
  }
  collectInvalid('orders', dbOrders, validateOrder)
  collectInvalid('expenses', dbExpenses, validateExpense)
  collectInvalid('inventory', dbInventory, validateInventoryItem)

  // Referential integrity: expenses.inventoryItemId must exist in inventory IDs
  const invIds = new Set((dbInventory || []).map(i => i?.id).filter(Boolean))
  const badLinks = (dbExpenses || [])
    .filter(e => e?.inventoryItemId)
    .filter(e => !invIds.has(e.inventoryItemId))
    .map(e => ({ expenseId: e.id, inventoryItemId: e.inventoryItemId }))
  if (badLinks.length) {
    report.issues.referentialIntegrity.push({
      entity: 'expenses',
      issue: 'inventoryItemId points to missing inventory item',
      rows: badLinks.slice(0, 50),
      count: badLinks.length
    })
  }

  // UI vs DB sync (ID set diffs)
  const orderSync = diffIdSets(uiOrders, dbOrders)
  const expenseSync = diffIdSets(uiExpenses, dbExpenses)
  const invSync = diffIdSets(uiInventory, dbInventory)
  const pushSync = (entity, d) => {
    if (d.onlyInUi.length || d.onlyInDb.length) {
      report.issues.sync.push({
        entity,
        onlyInUi: d.onlyInUi.slice(0, 50),
        onlyInDb: d.onlyInDb.slice(0, 50),
        counts: { onlyInUi: d.onlyInUi.length, onlyInDb: d.onlyInDb.length }
      })
    }
  }
  pushSync('orders', orderSync)
  pushSync('expenses', expenseSync)
  pushSync('inventory', invSync)

  // Schema presence check (best-effort): detect missing columns that app expects
  // We read a single row and look for keys; absence can mean "no rows" so we only warn if rows exist.
  const schemaChecks = []
  const checkColumns = async (table, expectedColumns) => {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      report.issues.schema.push({ table, error: error.message || String(error) })
      return
    }
    if (!data || data.length === 0) return
    const row = data[0] || {}
    const missing = expectedColumns.filter(c => !(c in row))
    if (missing.length) {
      schemaChecks.push({ table, missing })
    }
  }

  await Promise.all([
    checkColumns('orders', ['order_date', 'dispatch_date', 'order_source']),
    checkColumns('expenses', ['inventory_item_id']),
    checkColumns('inventory', ['item_name', 'current_stock', 'reorder_level', 'unit_cost'])
  ])

  if (schemaChecks.length) {
    report.issues.schema.push(...schemaChecks)
  }

  // Final ok flag
  const hasAnyIssues = Object.values(report.issues).some(arr => (arr || []).length > 0)
  report.ok = !hasAnyIssues
  report.finishedAt = new Date().toISOString()
  return report
}


