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

const SalesReports = ({ orders, inventory }) => {
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Revenue</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(metrics.revenue)}</p>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Total Orders (All Status)</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.totalOrders}</p>
                </div>
                <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button onClick={handleExport} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        <Download size={18} /> Export Sales Data
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Revenue Trend Chart */}
                {/* Revenue Trend Chart */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Revenue Trend</h3>
                    <div style={{ height: '16rem', width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                <YAxis stroke="#9ca3af" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales by Channel */}
                {/* Sales by Channel */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Sales by Channel</h3>
                    <div style={{ height: '16rem', width: '100%' }}>
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
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {metrics.channelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`url(#salesPieGradient${index % COLORS.length})`} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Products Table */}
            {/* Top Products Table */}
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Top Selling Products</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Product Name</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>Category</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'right' }}>Units Sold</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'right' }}>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProducts.map((p, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{p.name}</td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{p.category}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{p.quantity}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(p.revenue)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default SalesReports
