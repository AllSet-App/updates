import { useMemo } from 'react'
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { formatCurrency, calculateProfitabilityMetrics } from '../../utils/reportUtils'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const ProfitabilityReports = ({ orders, expenses, isMobile }) => {
    const { monthlyData, pieData, netProfit, margin, avgRevenuePerOrder, avgCostPerOrder, avgProfitPerOrder } = useMemo(() =>
        calculateProfitabilityMetrics(orders, expenses), [orders, expenses]
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <style>{`
                .profit-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
                    gap: 1rem;
                }
                .profit-charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr));
                    gap: 1.5rem;
                }
                @media (max-width: 768px) {
                    .profit-stats-grid { grid-template-columns: 1fr; }
                    .profit-charts-grid { grid-template-columns: 1fr; }
                    .profit-desktop-table { display: none; }
                    .profit-mobile-list { display: flex !important; flex-direction: column; gap: 1rem; }
                    .profit-card-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 0.5rem;
                        font-size: 0.85rem;
                    }
                }
                .profit-mobile-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1rem;
                }
            `}</style>

            {/* --- Summary Cards --- */}
            <div className="profit-stats-grid">
                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Net Profit</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(netProfit)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{margin.toFixed(1)}% Margin</p>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avg Revenue</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(avgRevenuePerOrder)}</p>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avg Cost</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--error)' }}>{formatCurrency(avgCostPerOrder)}</p>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Avg Profit</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(avgProfitPerOrder)}</p>
                </div>
            </div>

            {/* --- Charts --- */}
            <div className="profit-charts-grid">
                {/* Monthly Profit Trend */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Profit Trend</h3>
                    <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer>
                            <ComposedChart data={monthlyData} margin={{ left: -20, right: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="#e5e7eb" fontSize={14} tickLine={false} axisLine={false} />
                                <YAxis stroke="#e5e7eb" fontSize={14} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#f3f4f6' }}
                                    itemStyle={{ color: '#e5e7eb' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', color: '#e5e7eb', paddingTop: '10px' }} />
                                <Bar dataKey="revenue" stackId="a" fill="#3b82f6" name="Revenue" radius={[2, 2, 0, 0]} barSize={16} />
                                <Bar dataKey="expenses" stackId="a" fill="#ef4444" name="Expenses" radius={[2, 2, 0, 0]} barSize={16} />
                                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} name="Profit" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown Pie */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Money Flow</h3>
                    <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="45%"
                                    innerRadius={50} outerRadius={70}
                                    paddingAngle={2} dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#f3f4f6' }}
                                    itemStyle={{ color: '#e5e7eb' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', color: '#e5e7eb' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* --- Monthly Table Breakdown --- */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Monthly Breakdown</h3>
                </div>

                <div className="profit-desktop-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Month</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Revenue</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Expenses</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Margin</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Net Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlyData.slice().reverse().map((item, idx) => (
                                <tr key={item.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.date}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-primary)' }}>{formatCurrency(item.revenue)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--error)' }}>{formatCurrency(item.expenses)}</td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                                        {item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) + '%' : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: item.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>
                                        {formatCurrency(item.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="profit-mobile-list" style={{ display: 'none', padding: '1rem' }}>
                    {monthlyData.slice().reverse().map((item, idx) => (
                        <div key={item.date} className="profit-mobile-card">
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>{item.date}</div>
                            <div className="profit-card-row"><span>Revenue</span><span>{formatCurrency(item.revenue)}</span></div>
                            <div className="profit-card-row"><span>Expenses</span><span style={{ color: 'var(--error)' }}>{formatCurrency(item.expenses)}</span></div>
                            <div className="profit-card-row"><span>Margin</span><span>{item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) + '%' : '-'}</span></div>
                            <div className="profit-card-row" style={{ marginBottom: 0 }}><span>Net Profit</span><span style={{ fontWeight: 700, color: item.profit >= 0 ? 'var(--success)' : 'var(--error)' }}>{formatCurrency(item.profit)}</span></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default ProfitabilityReports
