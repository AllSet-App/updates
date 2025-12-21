import { useState, useEffect } from 'react'
import { FileText, TrendingUp, DollarSign, ShoppingBag, Package, PieChart } from 'lucide-react'
import SalesReports from './SalesReports'
import ExpenseReports from './ExpenseReports'
import ProfitabilityReports from './ProfitabilityReports'
import OrdersReports from './OrdersReports'
import InventoryReports from './InventoryReports'

const Reports = ({ orders, expenses, inventory }) => {
    const [activeTab, setActiveTab] = useState('sales')
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const tabs = [
        { id: 'sales', label: 'Sales', icon: TrendingUp },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'profitability', label: 'Profitability', icon: PieChart },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'inventory', label: 'Inventory', icon: Package },
    ]

    const renderContent = () => {
        const props = { orders, expenses, inventory, isMobile }
        switch (activeTab) {
            case 'sales': return <SalesReports {...props} />
            case 'expenses': return <ExpenseReports {...props} />
            case 'profitability': return <ProfitabilityReports {...props} />
            case 'orders': return <OrdersReports {...props} />
            case 'inventory': return <InventoryReports {...props} />
            default: return <SalesReports {...props} />
        }
    }

    return (
        <div style={{
            padding: window.innerWidth < 450 ? '0.25rem' : (isMobile ? '0.75rem' : '1.5rem'),
            maxWidth: '100%',
            margin: '0 auto',
            overflowX: 'hidden'
        }}>
            <style>{`
                .reports-header h1 {
                    font-size: 1.875rem;
                    font-weight: 800;
                    color: #fff;
                    margin-bottom: 0.25rem;
                    letter-spacing: -0.025em;
                    line-height: 1.2;
                }
                .reports-header p {
                    color: var(--text-muted);
                    font-size: 1rem;
                    line-height: 1.4;
                }
                @media (max-width: 600px) {
                    .reports-header h1 { font-size: 1.35rem !important; }
                    .reports-header p { font-size: 0.8rem !important; }
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .tab-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.55rem 1rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: all 0.2s;
                    white-space: nowrap;
                    border: none;
                    cursor: pointer;
                    background: transparent;
                    color: var(--text-muted);
                    border-radius: 8px;
                }
                .tab-btn.active {
                    background-color: var(--accent-primary);
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                }
                .tab-btn:hover:not(.active) {
                    background-color: rgba(255, 255, 255, 0.05);
                    color: #fff;
                }
            `}</style>

            <div className="reports-header" style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
                <h1>Financial Reports</h1>
                <p>Comprehensive analytics of your business performance</p>
            </div>

            {/* Navigation Tabs */}
            <div style={{
                display: 'flex',
                overflowX: 'auto',
                paddingBottom: '0.75rem',
                marginBottom: '1.5rem',
                gap: '0.4rem',
                borderBottom: '1px solid var(--border-color)',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0
            }} className="no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`tab-btn ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Content Area */}
            <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
                {renderContent()}
            </div>
        </div>
    )
}

export default Reports
