import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Repeat, Loader, MessageCircle, FileText, Eye, X, Crown, Filter, ChevronUp, ChevronDown, Calendar } from 'lucide-react'
import { saveQuotations, getQuotations, deleteQuotation, getProducts, getSettings } from '../utils/storage'
import { formatWhatsAppNumber, generateWhatsAppMessage } from '../utils/whatsapp'
import { openExternalUrl } from '../utils/platform'
import { useLicensing } from './LicensingContext'
import { useToast } from './Toast/ToastContext'
import ProFeatureLock from './ProFeatureLock'
import QuotationForm from './QuotationForm'
import ViewQuotationModal from './ViewQuotationModal'
import ConfirmationModal from './ConfirmationModal'
import CollapsibleDateFilter from './Common/CollapsibleDateFilter'
import CustomDropdown from './Common/CustomDropdown'
import { format, startOfMonth, endOfMonth, parse, isWithinInterval } from 'date-fns'

const QuotationManagement = ({ quotations, onUpdateQuotations, orders, onUpdateOrders }) => {
    const { addToast } = useToast()
    const { isFreeUser } = useLicensing()
    const [showForm, setShowForm] = useState(false)
    const [viewingQuotation, setViewingQuotation] = useState(null)
    const [viewingDetails, setViewingDetails] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [products, setProducts] = useState({ categories: [] })
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default',
        onConfirm: null,
        confirmText: 'Confirm'
    })
    const [settings, setSettings] = useState(null)

    // Date Filter State
    const [filterType, setFilterType] = useState(() => localStorage.getItem('allset_quotations_filter_type') || 'month')
    const [selectedMonth, setSelectedMonth] = useState(() => localStorage.getItem('allset_quotations_selected_month') || format(new Date(), 'yyyy-MM'))
    const [startDate, setStartDate] = useState(() => localStorage.getItem('allset_quotations_start_date') || format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(() => localStorage.getItem('allset_quotations_end_date') || format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('allset_quotations_status_filter') || 'all')

    useEffect(() => {
        getProducts().then(setProducts)
        getSettings().then(setSettings)
    }, [])

    // Persist date filter state
    useEffect(() => {
        localStorage.setItem('allset_quotations_filter_type', filterType)
    }, [filterType])

    useEffect(() => {
        localStorage.setItem('allset_quotations_selected_month', selectedMonth)
    }, [selectedMonth])

    useEffect(() => {
        localStorage.setItem('allset_quotations_start_date', startDate)
    }, [startDate])

    useEffect(() => {
        localStorage.setItem('allset_quotations_end_date', endDate)
    }, [endDate])

    useEffect(() => {
        localStorage.setItem('allset_quotations_status_filter', statusFilter)
    }, [statusFilter])

    // Filter & Sort Logic
    const filteredQuotations = useMemo(() => {
        let filtered = (quotations || []).filter(q => {
            const searchLower = searchTerm.toLowerCase()
            // Search logic (Customer, ID, Items)
            const matchesSearch =
                (q.id?.toString().toLowerCase().includes(searchLower)) ||
                (q.customerName?.toLowerCase().includes(searchLower)) ||
                (q.phone?.toLowerCase().includes(searchLower))

            // Date filtering
            let matchesDate = true
            if (q.createdDate) {
                try {
                    const quotationDate = parse(q.createdDate, 'yyyy-MM-dd', new Date())

                    if (filterType === 'month') {
                        const monthStart = startOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()))
                        const monthEnd = endOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()))
                        matchesDate = isWithinInterval(quotationDate, { start: monthStart, end: monthEnd })
                    } else {
                        const rangeStart = parse(startDate, 'yyyy-MM-dd', new Date())
                        const rangeEnd = parse(endDate, 'yyyy-MM-dd', new Date())
                        matchesDate = isWithinInterval(quotationDate, { start: rangeStart, end: rangeEnd })
                    }
                } catch (error) {
                    matchesDate = true
                }
            }

            // Status filtering
            const matchesStatus = statusFilter === 'all' || (q.status || 'Draft') === statusFilter

            return matchesSearch && matchesDate && matchesStatus
        })

        // Default Sorting Logic (ID Descending)
        filtered.sort((a, b) => (parseInt(b.id) || 0) - (parseInt(a.id) || 0))

        return filtered
    }, [quotations, searchTerm, filterType, selectedMonth, startDate, endDate, statusFilter])

    const handleSaveQuotation = async (quotationData) => {
        setIsProcessing(true)
        try {
            // Determine if new or update
            const existingIndex = (quotations || []).findIndex(q => q.id === quotationData.id)
            let updatedQuotations = [...(quotations || [])]

            if (existingIndex >= 0) {
                updatedQuotations[existingIndex] = quotationData
            } else {
                updatedQuotations = [quotationData, ...updatedQuotations]
            }

            // Save to storage
            const success = await saveQuotations(updatedQuotations)
            if (success) {
                onUpdateQuotations(updatedQuotations)
                addToast(`Quotation ${quotationData.id} saved successfully`, 'success')
                return true
            } else {
                addToast('Failed to save quotation', 'error')
                return false
            }
        } catch (error) {
            console.error(error)
            addToast('Error saving quotation', 'error')
            return false
        } finally {
            setIsProcessing(false)
        }
    }

    const executeDeleteQuotation = async (id) => {
        setIsProcessing(true)
        try {
            const success = await deleteQuotation(id)
            if (success) {
                const updatedQuotations = quotations.filter(q => q.id !== id)
                onUpdateQuotations(updatedQuotations)
                addToast('Quotation deleted successfully', 'success')
            } else {
                addToast('Failed to delete quotation', 'error')
            }
        } catch (error) {
            console.error(error)
            addToast('Error deleting quotation', 'error')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDeleteQuotation = (id) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete Quotation',
            message: 'Are you sure you want to delete this quotation? This action cannot be undone.',
            type: 'danger',
            confirmText: 'Delete',
            onConfirm: () => executeDeleteQuotation(id)
        })
    }

    const executeConvertToOrder = async (quotation) => {
        setIsProcessing(true)
        try {
            // 1. Create new order object
            // We need to generate a new Order ID.
            // Ideally we check basic logic or let the backend/storage logic handle it if simplified.
            // But OrderForm handles ID generation. 
            // Here we need to grab the latest Order ID from 'orders' prop to generate the next one.

            const lastOrder = (orders || []).sort((a, b) => b.createdDate.localeCompare(a.createdDate) || String(b.id).localeCompare(String(a.id)))[0]
            // Simple parse logic similar to OrderForm/storage
            let nextId = 1000
            if (lastOrder && !isNaN(parseInt(lastOrder.id))) {
                nextId = parseInt(lastOrder.id) + 1
            }

            const newOrder = {
                ...quotation,
                id: nextId.toString(),
                status: 'New Order',
                trackingNumber: '', // Clear tracking
                dispatchDate: '',
                createdDate: new Date().toISOString().split('T')[0],
                orderDate: new Date().toISOString().split('T')[0],
                paymentStatus: 'Pending',
                isFromQuotation: true, // Optional flag
                quotationId: quotation.id
            }

            // 2. Save new order
            // We need to import saveOrders from storage or use a prop if available.
            // But 'onUpdateOrders' just updates state. We need to actually persist it.
            // I should import saveOrders.

            // I need to import saveOrders at the top.
            const { saveOrders } = await import('../utils/storage')

            // We need to merge with existing orders to save
            // Actually saveOrders takes the full list or single? 
            // storage.js saveOrders takes the FULL array of orders.
            const updatedOrders = [newOrder, ...orders]
            const successOrder = await saveOrders(updatedOrders)

            if (successOrder) {
                onUpdateOrders(updatedOrders)

                // 3. Update Quotation Status
                const updatedQuotation = { ...quotation, status: 'Order Received' }
                await handleSaveQuotation(updatedQuotation)

                addToast(`Quotation converted to Order #${newOrder.id}`, 'success')
            } else {
                addToast('Failed to create order', 'error')
            }

        } catch (error) {
            console.error(error)
            addToast('Error converting quotation', 'error')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleConvertToOrder = (quotation) => {
        setModalConfig({
            isOpen: true,
            title: 'Convert to Order',
            message: 'Convert this quotation to a new order? This will create a new order with the same details.',
            type: 'default', // Blue/Info
            confirmText: 'OK',
            onConfirm: () => executeConvertToOrder(quotation)
        })
    }

    const handleSendWhatsApp = (quotation) => {
        if (!quotation.whatsapp && !quotation.phone) {
            addToast('No phone number available for this quotation.', 'error');
            return;
        }

        const formattedNumber = formatWhatsAppNumber(quotation.whatsapp || quotation.phone)
        if (!formattedNumber) {
            addToast('Invalid phone number format.', 'error')
            return
        }

        // Calculate item details string for template context
        const itemDetailsString = (quotation.orderItems || []).map(it => {
            const category = products.categories.find(c => c.id === it.categoryId)
            const catName = category ? category.name : 'Item'
            const itemName = it.name || it.customItemName || 'N/A'
            const qty = it.quantity || 1
            const price = Number(it.unitPrice) || 0
            return `🔸 ${catName} - ${itemName} (x${qty}): Rs. ${price.toLocaleString()}`
        }).join('\n')

        // Calculate financials for context
        const subtotal = (quotation.orderItems || []).reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0)
        const discount = Number(quotation.discount || quotation.discountValue || 0)
        let discountAmount = 0
        if (quotation.discountType === '%') {
            discountAmount = (subtotal * discount) / 100
        } else {
            discountAmount = discount
        }
        const deliveryCharge = Number(quotation.deliveryCharge ?? 0)
        const finalPrice = Math.max(0, subtotal - discountAmount + deliveryCharge)

        const context = {
            subtotal,
            discountAmount,
            deliveryCharge,
            finalPrice,
            itemDetailsString
        }

        // Use template if available, otherwise default
        let message = ''
        if (settings?.whatsappTemplates?.quotation) {
            message = generateWhatsAppMessage(settings.whatsappTemplates.quotation, quotation, context)
        } else {
            // Default fallback
            message = `Hello ${quotation.customerName},\n\nHere is your quotation details:\nQuotation ID: ${quotation.id}\nTotal Price: Rs. ${finalPrice.toLocaleString()}\n\nFor more details, please visit our website or contact us.\n\nThank you!`
        }

        const encodedMessage = encodeURIComponent(message);
        const numberForUrl = formattedNumber.replace('+', '')
        const whatsappUrl = `https://wa.me/${numberForUrl}?text=${encodedMessage}`;
        openExternalUrl(whatsappUrl);
        addToast('WhatsApp message initiated.', 'info');
    };

    const content = (
        <div className="quotation-management">
            <style>{`
                @media (max-width: 768px) {
                    .desktop-view {
                        display: none !important;
                    }
                    .mobile-view {
                        display: flex !important;
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .header-actions {
                        flex-direction: column;
                        align-items: flex-start !important;
                        gap: 1rem;
                    }
                    .header-actions button {
                        width: 100%;
                        justify-content: center;
                    }
                    .search-box {
                        max-width: 100% !important;
                        width: 100%;
                    }
                }
                @media (min-width: 769px) {
                    .mobile-view {
                        display: none !important;
                    }
                }
            `}</style>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Quotations</h1>
                    <p>Create and manage quotations for customers</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => { setViewingQuotation(null); setShowForm(true); }}>
                        <Plus size={18} /> Add Quotation
                    </button>
                </div>
            </div>


            <div className="filters-bar" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                <div className="search-box" style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by ID, customer or phone..."
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.5rem 0.5rem 2.2rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)'
                        }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ width: '140px' }}>
                    <CustomDropdown
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'Active', label: 'Active' },
                            { value: 'Draft', label: 'Draft' },
                            { value: 'Order Received', label: 'Order Received' }
                        ]}
                        value={statusFilter}
                        onChange={setStatusFilter}
                    />
                </div>
                <CollapsibleDateFilter
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    startDate={startDate}
                    endDate={endDate}
                    onRangeChange={({ startDate: newStart, endDate: newEnd }) => {
                        if (newStart) setStartDate(newStart)
                        if (newEnd) setEndDate(newEnd)
                    }}
                    onReset={() => {
                        setFilterType('month')
                        setSelectedMonth(format(new Date(), 'yyyy-MM'))
                        setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
                        setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
                        setStatusFilter('all')
                    }}
                    align="right"
                />
                {(searchTerm !== '' || statusFilter !== 'all' || filterType !== 'month' || selectedMonth !== format(new Date(), 'yyyy-MM')) && (
                    <button
                        onClick={() => {
                            setSearchTerm('')
                            setStatusFilter('all')
                            setFilterType('month')
                            setSelectedMonth(format(new Date(), 'yyyy-MM'))
                            setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
                            setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))',
                            color: '#ef4444',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.1))'
                            e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))'
                            e.currentTarget.style.transform = 'translateY(0)'
                        }}
                        title="Clear search filter"
                    >
                        <X size={16} /> Clear Filters
                    </button>
                )}
            </div>

            {/* Quotations Table (Desktop) */}
            <div className="card desktop-view" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.75rem 1rem' }}>ID & Date</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Customer</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Item Details</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Qty</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Total</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredQuotations.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No quotations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotations.map(q => {
                                    // Item Summary Logic
                                    const firstItem = q.orderItems?.[0] || {}
                                    const moreCount = (q.orderItems?.length || 0) - 1

                                    const itemName = firstItem.name || firstItem.customItemName || 'Unknown Item'

                                    // Get Category Name
                                    const categoryId = firstItem.categoryId
                                    const category = products.categories.find(c => c.id === categoryId)
                                    const categoryName = category ? category.name : 'N/A'

                                    return (
                                        <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s ease' }}>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.875rem' }}>
                                                    #{q.id}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                    {q.createdDate}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{q.customerName}</div>
                                                {q.whatsapp && (
                                                    <div
                                                        onClick={() => openExternalUrl(`https://wa.me/${q.whatsapp.replace(/\D/g, '')}`)}
                                                        style={{ cursor: 'pointer', fontSize: '0.75rem', color: '#25D366', marginTop: '0.25rem' }}
                                                    >
                                                        {q.whatsapp}
                                                    </div>
                                                )}
                                                {q.phone && !q.whatsapp && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {q.phone}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {categoryName}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ fontWeight: 500 }}>
                                                    {itemName}
                                                    {moreCount > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>+{moreCount} more</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    Rs. {(Number(firstItem.unitPrice) || 0).toLocaleString()}
                                                </div>
                                                {firstItem.notes && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-muted)',
                                                        marginTop: '2px',
                                                        fontStyle: 'italic',
                                                        maxWidth: '250px',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {firstItem.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{ fontWeight: 600 }}>{firstItem.quantity || 1}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                                                Rs. {(Number(q.totalPrice) || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    backgroundColor: q.status === 'Order Received' ? 'var(--success)' : 'var(--accent-primary)',
                                                    color: 'white'
                                                }}>
                                                    {q.status || 'Draft'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => setViewingDetails(q)}
                                                        title="View Quotation"
                                                        style={{
                                                            backgroundColor: 'var(--accent-primary)',
                                                            color: 'white',
                                                            padding: '0.4rem',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    <button
                                                        className="btn-icon"
                                                        title={isFreeUser ? 'WhatsApp is a Pro feature' : 'WhatsApp'}
                                                        onClick={() => handleSendWhatsApp(q)}
                                                        disabled={isFreeUser}
                                                        style={{
                                                            backgroundColor: isFreeUser ? 'var(--text-muted)' : 'var(--success)',
                                                            color: 'white',
                                                            padding: '0.4rem',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            cursor: isFreeUser ? 'not-allowed' : 'pointer',
                                                            opacity: isFreeUser ? 0.6 : 1,
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <MessageCircle size={16} />
                                                        {isFreeUser && <Crown size={10} color="var(--danger)" />}
                                                    </button>

                                                    {q.status !== 'Order Received' && (
                                                        <button
                                                            className="btn-icon"
                                                            title="Convert to Order"
                                                            onClick={() => handleConvertToOrder(q)}
                                                            style={{
                                                                backgroundColor: 'var(--warning)',
                                                                color: 'white',
                                                                padding: '0.4rem',
                                                                borderRadius: '8px',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Repeat size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => { setViewingQuotation(q); setShowForm(true); }}
                                                        title="Edit Quotation"
                                                        style={{
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-primary)',
                                                            padding: '0.4rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--border-color)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-icon danger"
                                                        onClick={() => handleDeleteQuotation(q.id)}
                                                        title="Delete Quotation"
                                                        style={{
                                                            backgroundColor: 'var(--danger)',
                                                            color: 'white',
                                                            padding: '0.4rem',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-view" style={{ display: 'none', flexDirection: 'column', gap: '1rem' }}>
                {filteredQuotations.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)' }}>
                        No quotations found.
                    </div>
                ) : (
                    filteredQuotations.map(q => {
                        // Item Summary Logic
                        const firstItem = q.orderItems?.[0] || {}
                        const moreCount = (q.orderItems?.length || 0) - 1
                        const itemName = firstItem.name || firstItem.customItemName || 'Unknown Item'
                        const categoryId = firstItem.categoryId
                        const category = products.categories.find(c => c.id === categoryId)
                        const categoryName = category ? category.name : 'N/A'
                        const totalPrice = Number(q.totalPrice) || 0

                        return (
                            <div
                                key={q.id}
                                className="card"
                                style={{
                                    padding: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    backgroundColor: 'var(--bg-card)',
                                    position: 'relative'
                                }}
                            >
                                {/* Header Row: ID + Date on left, Status badge on right */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>#{q.id}</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {q.createdDate}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <span
                                            className="badge"
                                            style={{
                                                backgroundColor: q.status === 'Order Received' ? 'var(--success)' : 'var(--accent-primary)',
                                                color: 'white',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            {q.status || 'Draft'}
                                        </span>
                                    </div>
                                </div>

                                {/* Customer & Item Info Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                                    {/* Customer Info */}
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{q.customerName}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{q.whatsapp || q.phone || 'No Contact'}</div>
                                    </div>

                                    {/* Item Info */}
                                    <div style={{ wordBreak: 'break-word', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        {categoryName} - {itemName} (x{firstItem.quantity || 1})
                                        {moreCount > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>+{moreCount} more</span>}
                                        {firstItem.notes && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                                                {firstItem.notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pricing Info */}
                                    <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                                        Rs. {totalPrice.toLocaleString()}
                                    </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '0.5rem' }}>
                                    <div className="action-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <button
                                            onClick={() => handleSendWhatsApp(q)}
                                            className="btn-icon"
                                            disabled={isFreeUser}
                                            style={{ background: 'none', color: isFreeUser ? '#888' : '#25D366', padding: 0, opacity: isFreeUser ? 0.6 : 1, cursor: isFreeUser ? 'not-allowed' : 'pointer' }}
                                            title={isFreeUser ? 'WhatsApp is a Pro feature' : 'Send via WhatsApp'}
                                        >
                                            <MessageCircle size={22} />
                                            {isFreeUser && <Crown size={10} color="#ef4444" style={{ position: 'absolute', top: -2, right: -2 }} />}
                                        </button>
                                        <button onClick={() => setViewingDetails(q)} className="btn-icon" style={{ background: 'none', color: 'var(--accent-primary)', padding: 0 }} title="View Quotation"><Eye size={22} /></button>
                                        <button onClick={() => { setViewingQuotation(q); setShowForm(true); }} className="btn-icon" style={{ background: 'none', color: 'var(--text-secondary)', padding: 0 }} title="Edit Quotation"><Edit size={22} /></button>
                                        {q.status !== 'Order Received' && (
                                            <button onClick={() => handleConvertToOrder(q)} className="btn-icon" style={{ background: 'none', color: '#8b5cf6', padding: 0 }} title="Convert to Order"><Repeat size={22} /></button>
                                        )}
                                        <button onClick={() => handleDeleteQuotation(q.id)} className="btn-icon danger" style={{ background: 'none', color: 'var(--danger)', padding: 0 }} title="Delete Quotation"><Trash2 size={22} /></button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>


            {showForm && (
                <QuotationForm
                    quotation={viewingQuotation}
                    onClose={() => { setShowForm(false); setViewingQuotation(null); }}
                    onSave={handleSaveQuotation}
                />
            )}

            {viewingDetails && (
                <ViewQuotationModal
                    quotation={viewingDetails}
                    onClose={() => setViewingDetails(null)}
                    onSave={handleSaveQuotation}
                    onConvertToOrder={handleConvertToOrder}
                />
            )}

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                confirmText={modalConfig.confirmText}
                onConfirm={modalConfig.onConfirm}
            />
        </div>
    )

    if (isFreeUser) {
        return (
            <ProFeatureLock
                featureName="Quotation Management"
                showContent={false}
                features={[
                    "Professional Quotation Creation",
                    "One-Click Convert to Order",
                    "Quotation History & Tracking",
                    "Share via WhatsApp & Email"
                ]}
            >
                {content}
            </ProFeatureLock>
        )
    }

    return content
}

export default QuotationManagement
