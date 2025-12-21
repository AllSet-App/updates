import { useMemo } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { formatCurrency, calculateConsumptionTrends } from '../../utils/reportUtils'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const InventoryReports = ({ inventory, orders = [] }) => {
    const stats = useMemo(() => {
        let totalValue = 0
        let lowStockCount = 0
        let totalItems = 0

        inventory.forEach(item => {
            const value = (Number(item.price) || Number(item.unitCost) || 0) * (Number(item.currentStock) || 0)
            // Prioritize cost for value if available, else price? Actually usually Value = Cost * Quantity.
            // Let's use unitCost if available, else 0 (safest for "Book Value")
            // Or if previous logic used price, we can stick to it, but Cost is better for Inventory Value.
            // Let's use Cost as per previous Inventory.jsx logic.
            const costVal = (Number(item.unitCost) || 0) * (Number(item.currentStock) || 0)

            totalValue += costVal
            totalItems += (Number(item.currentStock) || 0)

            if (item.currentStock <= item.reorderLevel) {
                lowStockCount++
            }
        })

        return { totalValue, lowStockCount, totalItems }
    }, [inventory])

    const lowStockItems = useMemo(() => {
        return inventory
            .filter(item => item.currentStock <= item.reorderLevel)
            .sort((a, b) => a.currentStock - b.currentStock)
    }, [inventory])

    const { chartData: consumptionData, topItems } = useMemo(() => calculateConsumptionTrends(orders), [orders])

    // Safety check for consumption chart
    const hasConsumptionData = consumptionData && consumptionData.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Inventory Value</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(stats.totalValue)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Based on Unit Cost)</p>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Items to Reorder</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{stats.lowStockCount}</p>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Stock Quantity</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalItems}</p>
                </div>
            </div>

            {/* Consumption Trends Chart */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Consumption Trends</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Monthly usage history for top {topItems.length} items. Helps forecast demand.
                    </p>
                </div>

                {hasConsumptionData ? (
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={consumptionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    {topItems.map((item, index) => (
                                        <linearGradient key={`gradient-${index}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {topItems.map((item, index) => (
                                    <Area
                                        key={item}
                                        type="monotone"
                                        dataKey={item}
                                        stroke={COLORS[index % COLORS.length]}
                                        fillOpacity={1}
                                        fill={`url(#color-${index})`}
                                        strokeWidth={2}
                                        name={item}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        No sufficient order data to forecast trends yet.
                    </div>
                )}
            </div>

            {/* Low Stock Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Low Stock Alerts
                        {lowStockItems.length > 0 && (
                            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>{lowStockItems.length}</span>
                        )}
                    </h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Item Name</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Current Stock</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Reorder Level</th>
                                <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lowStockItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        All stock levels are healthy.
                                    </td>
                                </tr>
                            ) : (
                                lowStockItems.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>{item.itemName}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{item.categoryName || item.category}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{item.currentStock}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.reorderLevel}</td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <span style={{ display: 'inline-block', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>Critical</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default InventoryReports
