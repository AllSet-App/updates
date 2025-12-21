import { useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { formatCurrency, calculateExpenseMetrics } from '../../utils/reportUtils'

const ExpenseReports = ({ expenses }) => {
    const metrics = useMemo(() => calculateExpenseMetrics(expenses), [expenses])

    // Aggregate expenses by month for trend chart
    const trendData = useMemo(() => {
        const grouped = {}
        expenses.forEach(e => {
            const date = e.date || ''
            if (!date) return
            const key = date.substring(0, 7) // YYYY-MM
            if (!grouped[key]) grouped[key] = 0
            grouped[key] += Number(e.amount) || 0
        })
        return Object.entries(grouped)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }, [expenses])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Expenses Recorded</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(metrics.total)}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Category Breakdown */}
                {/* Category Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Expenses by Category</h3>
                    <div style={{ height: '16rem', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={metrics.categoryData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                <YAxis dataKey="name" type="category" width={100} stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Trend */}
                {/* Monthly Trend */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Monthly Expense Trend</h3>
                    <div style={{ height: '16rem', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExpenseReports
