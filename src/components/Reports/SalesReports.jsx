import { useState, useMemo, useEffect } from 'react'
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { Download, Calendar } from 'lucide-react'
import { formatCurrency, calculateSalesMetrics, getTopSellingProducts } from '../../utils/reportUtils'
import { getProducts } from '../../utils/storage'
import * as XLSX from 'xlsx'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

const SalesReports = ({ orders, inventory, isMobile }) => {
    const [timeRange, setTimeRange] = useState('monthly') // weekly, monthly, yearly
    const [products, setProducts] = useState({ categories: [] })

    useEffect(() => {
        getProducts().then(setProducts)
    }, [])

    const metrics = useMemo(() => calculateSalesMetrics(orders), [orders])
    const topProducts = useMemo(() => getTopSellingProducts(orders, inventory, products), [orders, inventory, products])

    // Prepare Chart Data (Revenue over time)
    const chartData = useMemo(() => {
        // Basic grouping by date for the line chart
        const grouped = {}
        orders.forEach(order => {
            if (order.paymentStatus !== 'Paid') return
            const date = order.orderDate || order.createdDate
            if (!date) return

            let key = date.substring(0, 7) // YYYY-MM by default
            if (timeRange === 'yearly') key = date.substring(0, 4)
            // For weekly we'd need more complex logic, stick to monthly/yearly for MVP or simple daily

            if (!grouped[key]) grouped[key] = 0
            grouped[key] += Number(order.totalPrice) || 0
        })

        return Object.entries(grouped)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }, [orders, timeRange])

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
            ID: o.id,
            Date: o.orderDate,
            Customer: o.customerName,
            Amount: o.totalPrice,
            Status: o.status,
            Source: o.orderSource
        })))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Sales Data")
        XLSX.writeFile(wb, "Sales_Report.xlsx")
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <style>{`
                .sales-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
                    gap: 1rem;
                }
                .sales-charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr));
                    gap: 1.5rem;
                }
                @media (max-width: 768px) {
                    .sales-stats-grid { grid-template-columns: 1fr; }
                    .sales-charts-grid { grid-template-columns: 1fr; }
                    .sales-desktop-table { display: none; }
                    .sales-mobile-list { display: flex !important; flex-direction: column; gap: 1rem; }
                }
                .sales-mobile-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1rem;
                }
                .sales-card-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.85rem;
                }
            `}</style>

            <div className="sales-stats-grid">
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Revenue</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(metrics.revenue)}</p>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Orders</h3>
                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.totalOrders}</p>
                </div>
                <div className="card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center' }}>
                    <button onClick={handleExport} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: '100%' }}>
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            <div className="sales-charts-grid">
                {/* Revenue Trend Chart */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Revenue Trend</h3>
                    <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by Channel */}
                <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Sales by Channel</h3>
                    <div style={{ height: '240px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <defs>
                                    {COLORS.map((color, index) => (
                                        <linearGradient key={index} id={`salesPieGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <Pie
                                    data={metrics.channelData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {metrics.channelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products */}
            <div className="card" style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Top Selling Products</h3>

                <div className="sales-desktop-table" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Name</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Category</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'right', fontSize: '0.8rem' }}>Units</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'right', fontSize: '0.8rem' }}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProducts.map((p, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 500, fontSize: '0.85rem' }}>{p.name}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.category}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>{p.quantity}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>{formatCurrency(p.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="sales-mobile-list" style={{ display: 'none' }}>
                    {topProducts.map((p, idx) => (
                        <div key={idx} className="sales-mobile-card">
                            <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{p.name}</div>
                            <div className="sales-card-row">
                                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                                <span>{p.category}</span>
                            </div>
                            <div className="sales-card-row">
                                <span style={{ color: 'var(--text-muted)' }}>Units:</span>
                                <span>{p.quantity}</span>
                            </div>
                            <div className="sales-card-row" style={{ marginBottom: 0 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Revenue:</span>
                                <span style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(p.revenue)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default SalesReports
