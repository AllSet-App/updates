import { useMemo, useState } from 'react'
import { ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react'
import { runDataHealthCheck } from '../utils/dataHealth'

const DataHealthCheck = ({ orders = [], expenses = [], inventory = [] }) => {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const issueCount = useMemo(() => {
    if (!report?.issues) return 0
    return Object.values(report.issues).reduce((sum, arr) => sum + (arr?.length || 0), 0)
  }, [report])

  const run = async () => {
    setLoading(true)
    setError(null)
    setShowAdvanced(false)
    try {
      const r = await runDataHealthCheck({ uiOrders: orders, uiExpenses: expenses, uiInventory: inventory })
      setReport(r)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const humanizeIssue = (issue) => {
    const id = issue?.id ? ` (ID: ${issue.id})` : ''
    if (issue?.entity === 'expenses' && issue?.issues?.includes('missing description/item')) {
      return `Expense${id} is missing a description/item. This means it would show up as a blank expense name. Fix: edit that expense and enter a Description or Item name.`
    }
    if (issue?.entity === 'orders' && issue?.issues?.includes('missing customerName')) {
      return `Order${id} is missing the customer name. Fix: edit the order and add Customer Name.`
    }
    if (issue?.entity === 'inventory' && issue?.issues?.includes('missing itemName')) {
      return `Inventory item${id} is missing the item name. Fix: edit the inventory item and add Item Name.`
    }
    return `${issue?.entity || 'Record'}${id} has issues: ${(issue?.issues || []).join(', ')}`
  }

  const buildSimpleSummary = () => {
    if (!report?.issues) return []
    const msgs = []

    const invalid = report.issues.invalidRecords || []
    for (const r of invalid.slice(0, 10)) {
      msgs.push(humanizeIssue(r))
    }
    if (invalid.length > 10) {
      msgs.push(`…and ${invalid.length - 10} more invalid record(s).`)
    }

    const dup = report.issues.duplicates || []
    if (dup.length) {
      msgs.push(`Duplicate IDs detected in ${dup.length} place(s). This can cause missing/overwritten rows when saving.`)
    }

    const ref = report.issues.referentialIntegrity || []
    if (ref.length) {
      msgs.push(`Some records reference missing linked data (e.g., an expense linked to an inventory item that no longer exists).`)
    }

    const sync = report.issues.sync || []
    if (sync.length) {
      msgs.push(`UI and database are out of sync for ${sync.length} area(s). This can happen if the UI didn’t refresh after saving.`)
    }

    const schema = report.issues.schema || []
    if (schema.length) {
      msgs.push(`Database schema mismatch detected. Some expected columns are missing.`)
    }

    return msgs
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: report?.ok ? 'rgba(34, 197, 94, 0.12)' : 'rgba(249, 115, 22, 0.12)'
          }}>
            {report?.ok ? <ShieldCheck size={20} color="var(--success)" /> : <AlertTriangle size={20} color="var(--warning)" />}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Data Health Check</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Validates reads/writes assumptions, duplicates, links, and UI↔DB sync.
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={run}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={18} />
          {loading ? 'Running…' : 'Run Check'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.08)' }}>
          <div style={{ color: 'var(--error)', fontWeight: 600, marginBottom: '0.25rem' }}>Health check failed</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{error}</div>
        </div>
      )}

      {report && !error && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Result</div>
              <div style={{ fontWeight: 700, color: report.ok ? 'var(--success)' : 'var(--warning)' }}>
                {report.ok ? 'OK' : `Issues Found (${issueCount})`}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Orders (UI / DB)</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {report.summary?.orders?.ui} / {report.summary?.orders?.db}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Expenses (UI / DB)</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {report.summary?.expenses?.ui} / {report.summary?.expenses?.db}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Inventory (UI / DB)</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {report.summary?.inventory?.ui} / {report.summary?.inventory?.db}
              </div>
            </div>
          </div>

          {!report.ok && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Error details (simple English)
              </div>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {buildSimpleSummary().length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    No specific details available.
                  </div>
                ) : (
                  buildSimpleSummary().map((m, idx) => (
                    <div key={idx} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      - {m}
                    </div>
                  ))
                )}
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setShowAdvanced(v => !v)}
                style={{ marginTop: '1rem' }}
              >
                {showAdvanced ? 'Hide advanced details' : 'Show advanced details'}
              </button>

              {showAdvanced && (
                <pre style={{
                  marginTop: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(report.issues, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DataHealthCheck


