import { useState } from 'react'
import { FileText, TrendingUp, DollarSign, ShoppingBag, Package, PieChart } from 'lucide-react'
import SalesReports from './SalesReports'
import ExpenseReports from './ExpenseReports'
import ProfitabilityReports from './ProfitabilityReports'
import OrdersReports from './OrdersReports'
import InventoryReports from './InventoryReports'

const Reports = ({ orders, expenses, inventory }) => {
    const [activeTab, setActiveTab] = useState('sales')

    const tabs = [
        { id: 'sales', label: 'Sales', icon: TrendingUp },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'profitability', label: 'Profitability', icon: PieChart },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'inventory', label: 'Inventory', icon: Package },
    ]

    const renderContent = () => {
        switch (activeTab) {
            case 'sales':
                return <SalesReports orders={orders} inventory={inventory} />
            case 'expenses':
                return <ExpenseReports expenses={expenses} />
            case 'profitability':
                return <ProfitabilityReports orders={orders} expenses={expenses} />
            case 'orders':
                return <OrdersReports orders={orders} />
            case 'inventory':
                return <InventoryReports inventory={inventory} orders={orders} />
            default:
                return <SalesReports orders={orders} inventory={inventory} />
        }
    }

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Financial Reports</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Comprehensive analytics of your business performance</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', gap: '0.5rem', borderBottom: '1px solid var(--border-color)' }} className="no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                                color: isActive ? '#fff' : 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: isActive ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
                            }}
                            className={!isActive ? 'hover-bg-white-5 hover-text-white' : ''}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content Area */}
            <div className="animate-fade-in">
                {renderContent()}
            </div>
        </div>
    )
}

export default Reports
