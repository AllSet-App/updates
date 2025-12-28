import { useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatCurrency, calculateExpenseMetrics } from '../../utils/reportUtils'

import { COLORS, CustomTooltip, chartTheme, DonutCenterText, renderDonutLabel } from './ChartConfig'

const ExpenseReports = ({ expenses, orders, isMobile }) => {
    const metrics = useMemo(() => calculateExpenseMetrics(expenses, orders), [expenses, orders])

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
            <style>{`
                .expense-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
                    gap: 1rem;
                }
                .expense-charts-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
                    gap: 1.5rem;
                }
                .expense-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }
                .expense-table th {
                    text-align: left;
                    padding: 0.75rem 1rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    border-bottom: 1px solid var(--border-color);
                }
                .expense-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                @media (max-width: 768px) {
                    .expense-stats-grid { grid-template-columns: 1fr; }
                    .expense-charts-row { grid-template-columns: 1fr; }
                }
            `}</style>

            {/* Top Row: Summary Cards */}
            <div className="expense-stats-grid">
                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Expenses</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--error)' }}>{formatCurrency(metrics.total)}</p>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Top Category Spend</h3>
                    <p style={{ fontSize: '1.15rem', fontWeight: 700 }}>{metrics.topCategory.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--error)' }}>{formatCurrency(metrics.topCategory.value)}</p>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Expense vs. Sales Ratio</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: metrics.expenseSalesRatio > 25 ? 'var(--error)' : 'var(--success)' }}>
                        {metrics.expenseSalesRatio.toFixed(1)}%
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of Revenue</p>
                </div>
            </div>

            <div className="expense-charts-row">
                {/* Categorized Breakdown Pie */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Spend Distribution</h3>
                    <div style={{ height: '260px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Tooltip content={<CustomTooltip />} />
                                <Pie
                                    data={metrics.categoryData}
                                    cx="50%" cy="50%"
                                    {...chartTheme.donut}
                                    dataKey="value"
                                    label={renderDonutLabel}
                                    labelLine={false}
                                >
                                    {metrics.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <DonutCenterText
                                    cx="50%"
                                    cy="50%"
                                    label="Total Spend"
                                    value={formatCurrency(metrics.total)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown Bar - Existing Logic */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Expenses by Category</h3>
                    <div style={{ height: '260px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={metrics.categoryData} layout="vertical" margin={{ left: -10, right: 10 }}>
                                <CartesianGrid {...chartTheme.grid} />
                                <XAxis type="number" {...chartTheme.axis} />
                                <YAxis dataKey="name" type="category" width={80} {...chartTheme.axis} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Monthly Expense Trend</h3>
                <div style={{ height: '220px', width: '100%' }}>
                    <ResponsiveContainer>
                        <BarChart data={trendData} margin={{ left: -20 }}>
                            <CartesianGrid {...chartTheme.grid} />
                            <XAxis dataKey="date" {...chartTheme.axis} />
                            <YAxis {...chartTheme.axis} tickFormatter={(val) => `${val / 1000}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Spending Items Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Top Spending Items</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="expense-table">
                        <thead>
                            <tr>
                                <th>Item / Description</th>
                                <th>Category</th>
                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.topItems.map((item, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                                    <td>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '0.2rem 0.6rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--error)' }}>
                                        {formatCurrency(item.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    )
}

export default ExpenseReports
