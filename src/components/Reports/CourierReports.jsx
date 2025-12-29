import { useState, useEffect, useMemo } from 'react'
import { curfoxService } from '../../utils/curfox'
import { RefreshCw, Truck, FileText, CornerUpLeft, Clock } from 'lucide-react'
import { format } from 'date-fns'

// --- Status Definitions ---
const FORWARD_STATUSES = [
    'CONFIRMED',
    'PICKUP RIDER ASSIGNED',
    'PICKED UP',
    'DISPATCH TO ORIGIN WAREHOUSE',
    'RECEIVED TO ORIGIN WAREHOUSE',
    'DISPATCHED FROM ORIGIN WAREHOUSE',
    'RECEIVED AT DESTINATION WAREHOUSE',
    'ASSIGNED TO DESTINATION RIDER',
    'RESCHEDULED',
    'DEFAULT WAREHOUSE CHANGE'
]

const RETURN_PATH_KEYS = [
    'key_18', // RETURN TO ORIGIN WAREHOUSE
    'key_19', // RECEIVED TO ORIGIN WAREHOUSE (FAILED TO DELIVER)
    'key_20'  // RETURN TO CLIENT
]

const CourierReports = ({ isMobile }) => {
    const [loading, setLoading] = useState(true)
    const [loadingInvoice, setLoadingInvoice] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [orders, setOrders] = useState([])
    const [invoiceOrders, setInvoiceOrders] = useState([]) // Specific list for 'To be Invoiced'
    const [lastUpdated, setLastUpdated] = useState(null)
    const [error, setError] = useState(null)

    // Load data on mount
    useEffect(() => {
        loadData(false)
    }, [])

    const loadData = async (force = false) => {
        if (force) setRefreshing(true)
        else {
            setLoading(true)
            setLoadingInvoice(true)
        }

        try {
            const stored = localStorage.getItem('curfox_auth')
            if (!stored) {
                setError('Curfox not connected. Please go to Settings > Integrations.')
                setLoading(false)
                setLoadingInvoice(false)
                setRefreshing(false)
                return
            }

            const auth = JSON.parse(stored)

            // 1. Fetch Main Orders (Fast, Cached)
            const mainPromise = curfoxService.getCachedOrders(auth, force).then(res => {
                if (res.error) {
                    console.error("Curfox fetch error:", res.error)
                    setError('Failed to fetch data from Curfox.')
                } else {
                    setOrders(res.data || [])
                    setLastUpdated(res.lastUpdated)
                    setError(null)
                }
                setLoading(false)
            });

            // 2. Fetch To Be Invoiced (Pending Verification) - Independent loading
            const invoicePromise = curfoxService.getToBeInvoicedOrders(auth).then(res => {
                setInvoiceOrders(res || [])
                setLoadingInvoice(false)
            });

            await Promise.all([mainPromise, invoicePromise])

        } catch (e) {
            console.error(e)
            setError('An unexpected error occurred.')
            setLoading(false)
            setLoadingInvoice(false)
        } finally {
            setRefreshing(false)
        }
    }

    const [selectedMetric, setSelectedMetric] = useState(null) // 'pending', 'invoice', 'returned'

    // --- Metrics Calculation ---

    // --- Metrics Calculation ---

    const metrics = useMemo(() => {
        let pendingCount = 0
        let pendingValue = 0

        let returnCount = 0
        let returnValue = 0

        // 1. Calculate General Metrics from Main List (Pending / Returned)
        orders.forEach(o => {
            const status = (o.status?.name || o.order_current_status?.name || o.status || '').toUpperCase().trim()
            const val = parseFloat(o.cod || o.cod_amount || o.total || 0)

            // Pending Delivery
            if (FORWARD_STATUSES.includes(status)) {
                pendingCount++
                pendingValue += val
            }

            // To be Returned
            // Check status key (curfox sometimes returns nested status object or flat key)
            const statusKey = o.status?.key || o.status_key || o.order_current_status?.key;
            if (RETURN_PATH_KEYS.includes(statusKey)) {
                returnCount++
                returnValue += val
            }
        })

        // 2. Calculate "To be Invoiced" from the dedicated, accurate list
        let invoiceCount = invoiceOrders.length
        let invoiceValue = invoiceOrders.reduce((acc, o) => {
            return acc + parseFloat(o.cod || o.cod_amount || o.total || 0)
        }, 0)

        return {
            pending: { count: pendingCount, value: pendingValue },
            invoice: { count: invoiceCount, value: invoiceValue },
            returned: { count: returnCount, value: returnValue }
        }
    }, [orders, invoiceOrders])

    const filteredOrders = useMemo(() => {
        if (!selectedMetric) return []

        if (selectedMetric === 'invoice') return invoiceOrders

        return orders.filter(o => {
            const status = (o.status?.name || o.order_current_status?.name || o.status || '').toUpperCase().trim()

            if (selectedMetric === 'pending') {
                return FORWARD_STATUSES.includes(status)
            }
            if (selectedMetric === 'returned') {
                const statusKey = o.status?.key || o.status_key || o.order_current_status?.key;
                return RETURN_PATH_KEYS.includes(statusKey)
            }
            return false
        })
    }, [selectedMetric, orders, invoiceOrders])


    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '1rem' : '1.5rem' }}>
            <style>{`
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100%, 1fr));
                    gap: 1rem;
                }
                @media (min-width: 640px) {
                    .stats-grid {
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    }
                }
                .metric-card {
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    height: 100%;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius);
                }
                .icon-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @media (max-width: 768px) {
                    .courier-desktop-table { display: none; }
                    .courier-mobile-list { display: flex !important; flex-direction: column; gap: 1rem; }
                }
                .courier-mobile-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1rem;
                }
                .courier-card-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.5rem;
                    font-size: 0.85rem;
                }
            `}</style>

            {/* Header / Controls */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Courier Dashboard</h3>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Live data from Curfox • {orders.length} orders loaded
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {lastUpdated && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <Clock size={14} />
                            Updated {format(lastUpdated, 'h:mm a')}
                        </div>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={() => loadData(true)}
                        disabled={refreshing || loading || loadingInvoice}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius)',
                    color: '#f87171'
                }}>
                    {error}
                </div>
            )}

            {/* Metrics Grid */}
            <div className="stats-grid">
                <MetricCard
                    title="Pending Delivery"
                    icon={Truck}
                    count={metrics.pending.count}
                    value={formatCurrency(metrics.pending.value)}
                    color="var(--accent-primary)" // Blue
                    loading={loading && !refreshing && orders.length === 0}
                    onClick={() => setSelectedMetric(selectedMetric === 'pending' ? null : 'pending')}
                    isSelected={selectedMetric === 'pending'}
                />

                <MetricCard
                    title="To be Invoiced"
                    icon={FileText}
                    count={metrics.invoice.count}
                    value={formatCurrency(metrics.invoice.value)}
                    color="#f59e0b" // Amber
                    loading={(loadingInvoice || loading) && !refreshing && invoiceOrders.length === 0}
                    onClick={() => setSelectedMetric(selectedMetric === 'invoice' ? null : 'invoice')}
                    isSelected={selectedMetric === 'invoice'}
                />

                <MetricCard
                    title="To be Returned"
                    icon={CornerUpLeft}
                    count={metrics.returned.count}
                    value={formatCurrency(metrics.returned.value)}
                    color="#ef4444" // Red
                    loading={loading && !refreshing && orders.length === 0}
                    onClick={() => setSelectedMetric(selectedMetric === 'returned' ? null : 'returned')}
                    isSelected={selectedMetric === 'returned'}
                />
            </div>

            {/* Filtered Orders Table */}
            {selectedMetric && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                            {selectedMetric === 'pending' && 'Pending Delivery Orders'}
                            {selectedMetric === 'invoice' && 'Orders To Be Invoiced'}
                            {selectedMetric === 'returned' && 'Returned Orders'}
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                ({filteredOrders.length})
                            </span>
                        </h4>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setSelectedMetric(null)}
                            style={{ fontSize: '0.85rem' }}
                        >
                            Close List
                        </button>
                    </div>

                    <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', background: 'transparent' }}>
                        {/* Desktop Table View */}
                        <div className="courier-desktop-table" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)' }}>Date</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)' }}>Waybill</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)' }}>Recipient</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 500, color: 'var(--text-muted)' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    No orders found for this category.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOrders.map(o => (
                                                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        {o.created_at ? format(new Date(o.created_at), 'MMM d, yyyy') : '-'}
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                            {o.created_at ? format(new Date(o.created_at), 'h:mm a') : ''}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>
                                                        {o.waybill_number}
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{o.order_no}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ fontWeight: 500 }}>{o.customer_name}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.customer_phone}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                                            border: '1px solid var(--border-color)',
                                                            whiteSpace: 'nowrap',
                                                            color: 'var(--text-primary)'
                                                        }}>
                                                            {o.order_current_status?.name || o.status || 'Unknown'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                                        {formatCurrency(o.cod || o.cod_amount || o.total || 0)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile Card View */}
                        <div className="courier-mobile-list" style={{ display: 'none' }}>
                            {filteredOrders.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    No orders found.
                                </div>
                            ) : (
                                filteredOrders.map(o => (
                                    <div key={o.id} className="courier-mobile-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{o.customer_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {o.waybill_number} • <span style={{ fontFamily: 'monospace' }}>#{o.order_no}</span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(o.cod || o.cod_amount || o.total || 0)}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {o.created_at ? format(new Date(o.created_at), 'MMM d') : '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="courier-card-row">
                                            <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                                            <span>{o.customer_phone}</span>
                                        </div>

                                        <div className="courier-card-row" style={{ marginTop: '0.5rem', marginBottom: 0, alignItems: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                                            <span style={{
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '8px',
                                                fontSize: '0.75rem',
                                                backgroundColor: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-color)',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {o.order_current_status?.name || o.status || 'Unknown'}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function MetricCard({ title, icon: Icon, count, value, color, loading, onClick, isSelected }) {
    return (
        <div
            className="card metric-card"
            onClick={onClick}
            style={{
                cursor: 'pointer',
                borderColor: isSelected ? color : 'var(--border-color)',
                backgroundColor: isSelected ? `rgba(${color === 'var(--accent-primary)' ? '59, 130, 246' : (color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68')}, 0.05)` : 'var(--bg-card)',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>{title}</h4>
                </div>
                <div className="icon-box" style={{
                    backgroundColor: `rgba(${color === 'var(--accent-primary)' ? '59, 130, 246' : (color === '#f59e0b' ? '245, 158, 11' : '239, 68, 68')}, 0.1)`,
                    color: color
                }}>
                    <Icon size={20} />
                </div>
            </div>
            <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    {loading ? '-' : count}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: color, marginTop: '0.25rem' }}>
                    {loading ? '-' : value}
                </div>
            </div>
        </div>
    )
}

export default CourierReports
