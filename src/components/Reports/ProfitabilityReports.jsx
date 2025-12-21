import { useMemo } from 'react'
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
    formatCurrency,
    calculateProfitability,
    calculateAverageBusinessMetrics,
    calculateExpenseMetrics,
    getMonthlyFinancials
} from '../../utils/reportUtils'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const ProfitabilityReports = ({ orders, expenses }) => {
    const { netProfit, margin } = useMemo(() => calculateProfitability(orders, expenses), [orders, expenses])

    const {
        avgRevenuePerOrder,
        avgCostPerOrder,
        avgProfitPerOrder
    } = useMemo(() => calculateAverageBusinessMetrics(orders, expenses), [orders, expenses])

    const monthlyData = useMemo(() => getMonthlyFinancials(orders, expenses), [orders, expenses])

    const { categoryData: expenseBreakdown } = useMemo(() => calculateExpenseMetrics(expenses), [expenses])

    // Filter out small expenses for better pie chart visualization
    const pieData = useMemo(() => {
        return expenseBreakdown
            .sort((a, b) => b.value - a.value)
            .filter(item => item.value > 0)
    }, [expenseBreakdown])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* --- Summary Cards --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Net Profit (Total)</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(netProfit)}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{margin.toFixed(1)}% Margin</p>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avg Revenue / Order</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(avgRevenuePerOrder)}</p>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avg Cost / Order</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)' }}>{formatCurrency(avgCostPerOrder)}</p>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avg Profit / Order</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(avgProfitPerOrder)}</p>
                </div>
            </div>

            {/* --- Charts --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Monthly Profit Trend */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Monthly Profit Trend</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `Rs.${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="revenue" stackId="a" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="expenses" stackId="a" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} barSize={20} />
                                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Net Profit" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>Where is money going?</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Legend
                                    layout="vertical"
                                    verticalAlign="middle"
                                    align="right"
                                    wrapperStyle={{ paddingLeft: '20px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- Monthly Table Breakdown --- */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Monthly Breakdown</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Month</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Revenue</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Expenses</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Matches</th>
                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Net Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.slice().reverse().map((item, idx) => (
                                <tr key={item.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.date}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-primary)' }}>{formatCurrency(item.revenue)}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--error)' }}>{formatCurrency(item.expenses)}</td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                        {/* Matches is just a placeholder here if needed, or we can calculate % */}
                                        {item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) + '%' : '-'}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 600, color: item.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                        {formatCurrency(item.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default ProfitabilityReports
