import { useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatCurrency, calculateExpenseMetrics } from '../../utils/reportUtils'

const ExpenseReports = ({ expenses, isMobile }) => {
    const metrics = useMemo(() => calculateExpenseMetrics(expenses), [expenses])

    const trendData = useMemo(() => {
        const grouped = {}
        expenses.forEach(e => {
            const dateStr = e.date || ''
            if (!dateStr) return
            const key = dateStr.substring(0, 7) // YYYY-MM
            if (!grouped[key]) grouped[key] = 0
            grouped[key] += Number(e.amount) || 0
        })
        return Object.entries(grouped)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }, [expenses])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Expenses Recorded</h3>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(metrics.total)}</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
                gap: '1.5rem',
                width: '100%'
            }}>
                {/* Category Breakdown */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Expenses by Category</h3>
                    <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={metrics.categoryData} layout="vertical" margin={{ left: -10, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis type="number" stroke="#e5e7eb" fontSize={14} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" width={80} stroke="#e5e7eb" fontSize={14} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#f3f4f6' }}
                                    itemStyle={{ color: '#e5e7eb' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Monthly Expense Trend</h3>
                    <div style={{ height: '220px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={trendData} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="#e5e7eb" fontSize={14} tickLine={false} axisLine={false} />
                                <YAxis stroke="#e5e7eb" fontSize={14} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#f3f4f6' }}
                                    itemStyle={{ color: '#e5e7eb' }}
                                    labelStyle={{ color: '#9ca3af', marginBottom: '0.25rem' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExpenseReports
