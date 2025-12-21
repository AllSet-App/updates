import { useState, useEffect } from 'react'
import { Package, TrendingUp, AlertTriangle, Calendar, CreditCard, X, ShoppingBag } from 'lucide-react'
import SummaryCard from './SummaryCard'
import {
  calculateNetProfit,
  getPendingDispatch
} from '../utils/calculations'

const Dashboard = ({ orders, expenses, inventory = [], onNavigate }) => {
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })
  const [showDateFilter, setShowDateFilter] = useState(false)

  // Get today's date for default end date
  const today = new Date().toISOString().split('T')[0]
  // Get 30 days ago for default start date
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0]

  // Filter orders and expenses by date range
  const filterByDateRange = (items, dateField) => {
    if (!dateFilter.startDate && !dateFilter.endDate) {
      return items
    }

    return items.filter(item => {
      const itemDate = item[dateField] || item.createdDate || ''
      if (!itemDate) return false

      const date = new Date(itemDate)
      const start = dateFilter.startDate ? new Date(dateFilter.startDate) : null
      const end = dateFilter.endDate ? new Date(dateFilter.endDate) : null

      if (start && end) {
        return date >= start && date <= end
      } else if (start) {
        return date >= start
      } else if (end) {
        return date <= end
      }
      return true
    })
  }

  const filteredOrders = filterByDateRange(orders, 'createdDate')
  const filteredExpenses = filterByDateRange(expenses, 'date')

  const pendingDispatch = getPendingDispatch(filteredOrders)
  const netProfit = calculateNetProfit(filteredOrders, filteredExpenses)

  // Calculate Net Sales (total revenue from paid orders)
  const netSales = filteredOrders
    .filter(order => order.paymentStatus === 'Paid')
    .reduce((sum, order) => {
      const totalPrice = order.totalPrice || order.totalAmount || 0
      return sum + totalPrice
    }, 0)

  // Calculate Net Expenses
  const netExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

  // Calculate total value of pending dispatch orders
  const pendingDispatchValue = pendingDispatch.reduce((sum, order) => {
    const totalPrice = order.totalPrice || order.totalAmount || 0
    return sum + totalPrice
  }, 0)

  // Calculate Pending Payments (only dispatched orders with pending payment)
  const pendingPayments = filteredOrders.filter(order => {
    const status = order.status || 'Pending'
    const paymentStatus = order.paymentStatus || 'Pending'
    return status === 'Dispatched' && paymentStatus !== 'Paid'
  })

  const pendingPaymentsAmount = pendingPayments.reduce((sum, order) => {
    const totalPrice = order.totalPrice || order.totalAmount || 0
    return sum + totalPrice
  }, 0)

  // Calculate Critical Inventory Items (below reorder level)
  const criticalItems = inventory.filter(item => item.currentStock < item.reorderLevel)

  // Generate subtitle for critical items
  const getCriticalItemsSubtitle = () => {
    if (criticalItems.length === 0) {
      return 'No critical items'
    }
    if (criticalItems.length === 1) {
      return criticalItems[0].itemName
    }
    if (criticalItems.length <= 3) {
      return criticalItems.map(item => item.itemName).join(', ')
    }
    // Show first 3 items and count of remaining
    const firstThree = criticalItems.slice(0, 3).map(item => item.itemName).join(', ')
    const remaining = criticalItems.length - 3
    return `${firstThree} and ${remaining} more`
  }

  // Calculate Total Orders for Current Month using Reports ROI logic
  const getOrdersCountBySource = () => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    const monthOrders = filteredOrders.filter(order => {
      // Logic matching Reports ROI period filtering
      const orderDate = new Date(order.orderDate || order.createdDate || order.dispatchDate || '')
      return orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth
    })

    // Classification matching Reports isAdSourceKey logic
    const isAdSource = (source) => {
      const k = (source || '').toLowerCase().trim()
      return k === 'ad' || k === 'ads' || k.includes('ad') || k.includes('facebook') || k.includes('fb') || k.includes('meta') || k.includes('instagram') || k.includes('ig')
    }

    const adsCount = monthOrders.filter(o => isAdSource(o.orderSource)).length
    const organicCount = monthOrders.length - adsCount

    return {
      totalCount: monthOrders.length,
      adsCount,
      organicCount
    }
  }

  const { totalCount: totalOrdersThisMonth, adsCount, organicCount } = getOrdersCountBySource()

  // Scheduled deliveries: orders with a future deliveryDate within next 3 days
  const getUpcomingScheduledDeliveries = () => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 3)
    end.setHours(23, 59, 59, 999)

    return (orders || []).filter(o => {
      const d = o.deliveryDate
      if (!d) return false
      const dt = new Date(d)
      if (Number.isNaN(dt.getTime())) return false
      return dt >= start && dt <= end
    }).sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate))
  }

  const upcomingScheduledDeliveries = getUpcomingScheduledDeliveries()

  const getScheduledSubtitle = () => {
    if (upcomingScheduledDeliveries.length === 0) return 'No deliveries in next 3 days'
    const names = upcomingScheduledDeliveries
      .slice(0, 3)
      .map(o => o.customerName || o.id)
      .filter(Boolean)
    const extra = upcomingScheduledDeliveries.length - names.length
    return extra > 0 ? `${names.join(', ')} and ${extra} more` : names.join(', ')
  }

  const handleDateFilterChange = (field, value) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const clearDateFilter = () => {
    setDateFilter({
      startDate: '',
      endDate: ''
    })
  }

  const hasDateFilter = dateFilter.startDate || dateFilter.endDate

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              Overview
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
              Real-time business performance metrics
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {showDateFilter && (
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--bg-card)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                  className="form-input"
                  style={{ width: '140px', height: '36px' }}
                />
                <span style={{ color: 'var(--text-muted)' }}>—</span>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                  className="form-input"
                  style={{ width: '140px', height: '36px' }}
                />
              </div>
            )}
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="btn btn-secondary"
              style={{
                height: '42px',
                padding: '0 1.25rem',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <Calendar size={18} />
              <span>{showDateFilter ? 'Hide Filter' : 'Date Range'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Section: Quick KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        <SummaryCard
          title="Total Orders"
          value={totalOrdersThisMonth}
          icon={ShoppingBag}
          color="var(--accent-primary)"
          subtitle={`Ads: ${adsCount} | Organic: ${organicCount}`}
          onClick={() => onNavigate && onNavigate('orders')}
        />
        <SummaryCard
          title="Pending to Dispatch"
          value={pendingDispatch.length}
          icon={Package}
          color="var(--warning)"
          subtitle={`Rs.${pendingDispatchValue.toLocaleString('en-IN')} value`}
          onClick={() => onNavigate && onNavigate('orders', { statusFilter: 'pendingDispatch' })}
        />
        <SummaryCard
          title="Net Profit"
          value={`Rs.${netProfit.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          color="var(--success)"
          subtitle={`Sales: Rs.${netSales.toLocaleString('en-IN')} | Expenses: Rs.${netExpenses.toLocaleString('en-IN')}`}
        />
        <SummaryCard
          title="Pending Payments"
          value={`Rs.${pendingPaymentsAmount.toLocaleString('en-IN')}`}
          icon={CreditCard}
          color="var(--danger)"
          subtitle={`${pendingPayments.length} open invoices`}
          onClick={() => onNavigate && onNavigate('orders', { statusFilter: 'Dispatched', paymentFilter: 'Pending' })}
        />
      </div>

      {/* Middle Section: Deliveries and Alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        marginBottom: '2.5rem'
      }}>
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={20} color="var(--accent-primary)" />
              Scheduled Deliveries
            </h3>
            <button
              onClick={() => onNavigate('orders', { scheduledDeliveries: true })}
              style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}
            >
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingScheduledDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No deliveries scheduled for the next 3 days
              </div>
            ) : (
              upcomingScheduledDeliveries.slice(0, 4).map(delivery => (
                <div key={delivery.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>{delivery.customerName}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{delivery.nearestCity} • Order #{delivery.id}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--accent-primary)',
                      borderRadius: '20px',
                      fontWeight: 600
                    }}>
                      {new Date(delivery.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} color="var(--warning)" />
              Low Stock Alerts
            </h3>
            <button
              onClick={() => onNavigate('inventory', { stockFilter: 'below' })}
              style={{ background: 'transparent', color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600 }}
            >
              Inventory
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {criticalItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                All inventory levels are healthy
              </div>
            ) : (
              criticalItems.slice(0, 4).map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.1)'
                }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem' }}>{item.itemName}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Category: {item.categoryName}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)' }}>{item.currentStock} left</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Level: {item.reorderLevel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Dashboard
