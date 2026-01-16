import { useState, useEffect } from 'react'
import { X, Download, MessageCircle, Star, Crown, Truck, RefreshCw, MapPin, CheckCircle } from 'lucide-react'
import CustomDropdown from './Common/CustomDropdown'
import { getProducts, getSettings } from '../utils/storage'
import { formatWhatsAppNumber, generateWhatsAppMessage } from '../utils/whatsapp'
import { getPrintStyles } from './PrintStyles'

import TrackingNumberModal from './TrackingNumberModal'
import DispatchModal from './DispatchModal'
import ConfirmationModal from './ConfirmationModal'
import { curfoxService } from '../utils/curfox'
import { useToast } from './Toast/ToastContext'
import { useLicensing } from './LicensingContext'
import { useTheme, PALETTES } from './ThemeContext'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { Capacitor } from '@capacitor/core'
import html2pdf from 'html2pdf.js'

const ViewOrderModal = ({ order, customerOrderCount = 1, onClose, onSave, onRequestTrackingNumber, onRequestDispatch }) => {
  const { addToast } = useToast()
  const { isFreeUser } = useLicensing()
  const { paletteId, fontFamily } = useTheme()
  const activePalette = PALETTES[paletteId] || PALETTES.signature
  const [products, setProducts] = useState({ categories: [] })
  const [localOrder, setLocalOrder] = useState(order)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [pendingStatus, setPendingStatus] = useState('Packed')
  const [settings, setSettings] = useState(null)


  const [trackingHistory, setTrackingHistory] = useState([])
  const [loadingTracking, setLoadingTracking] = useState(false)
  const [financeData, setFinanceData] = useState(null)
  const [financeLoading, setFinanceLoading] = useState(false)

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'default',
    title: '',
    message: '',
    onConfirm: null,
    isAlert: false,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    extraButtonText: null,
    onExtraButtonClick: null,
    extraButtonDisabled: false,
    confirmDisabled: false
  })

  const showConfirm = (title, message, onConfirm, type = 'default', confirmText = 'Confirm', options = {}) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      isAlert: false,
      confirmText,
      cancelText: options.cancelText || 'Cancel',
      extraButtonText: options.extraButtonText,
      onExtraButtonClick: options.onExtraButtonClick,
      extraButtonDisabled: options.extraButtonDisabled,
      confirmDisabled: options.confirmDisabled
    })
  }

  const showAlert = (title, message, type = 'default') => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: null,
      isAlert: true
    })
  }

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }))
  }

  useEffect(() => {
    const loadData = async () => {
      const [productsData, settingsData] = await Promise.all([
        getProducts(),
        getSettings()
      ])
      setProducts(productsData)
      setSettings(settingsData)
    }
    loadData()
  }, [])

  // Handle Esc key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Update local order when prop changes

  useEffect(() => {
    if (order) {
      setLocalOrder(order)
      setTrackingHistory([]) // Reset on new order
    }
  }, [order])

  // Load Tracking & Finance Data
  useEffect(() => {
    const fetchTrackingAndFinance = async () => {
      if (localOrder?.trackingNumber && settings?.curfox?.enabled) {
        setLoadingTracking(true)
        setFinanceLoading(true)
        try {
          const authData = {
            tenant: settings.curfox.tenant,
            token: (await curfoxService.login(settings.curfox.email, settings.curfox.password, settings.curfox.tenant))?.token
          }
          if (!authData.token) throw new Error("Could not authenticate with Curfox")

          let hasChanges = false
          let updatedOrder = { ...localOrder }

          // Fetch tracking
          const history = await curfoxService.getTracking(localOrder.trackingNumber, authData)
          if (Array.isArray(history)) {
            setTrackingHistory(history)
            if (history.length > 0) {
              const latest = history[0]
              const courierStatus = (latest.status?.name || latest.status || '').toUpperCase()
              let mappedStatus = null

              if (courierStatus === 'DELIVERED') mappedStatus = 'Delivered'
              else if (courierStatus === 'CANCELLED' || courierStatus === 'RETURNED') mappedStatus = 'Cancelled'

              if (mappedStatus && mappedStatus !== updatedOrder.status) {
                updatedOrder.status = mappedStatus
                hasChanges = true
              }
            }
          }

          // Fetch finance
          const fData = await curfoxService.getFinanceStatus(localOrder.trackingNumber, authData)
          setFinanceData(fData)
          if (fData) {
            const hasStatusChange = fData.finance_status !== updatedOrder.courierFinanceStatus
            const hasInvoiceChange = fData.invoice_no !== updatedOrder.courierInvoiceNo || fData.invoice_ref_no !== updatedOrder.courierInvoiceRef
            const depositedDate = fData.finance_deposited_date || fData.deposited_date || fData.deposited_at
            const hasDepositDateChange = depositedDate && depositedDate !== updatedOrder.courierDepositedDate

            if (hasStatusChange || hasInvoiceChange || hasDepositDateChange) {
              updatedOrder = {
                ...updatedOrder,
                courierFinanceStatus: fData.finance_status,
                courierInvoiceNo: fData.invoice_no,
                courierInvoiceRef: fData.invoice_ref_no,
                courierDepositedDate: depositedDate
              }

              if (fData.finance_status === 'Deposited' || fData.finance_status === 'Approved') {
                updatedOrder.paymentStatus = 'Paid'
              }
              hasChanges = true
            }
          }

          // Auto-set delivered date if courier says delivered
          if (mappedStatus === 'Delivered' && !updatedOrder.deliveredDate) {
            const events = Array.isArray(trackingData) ? trackingData : (trackingData.events || [])
            const deliveredEvent = events.find(e => {
              const s = (e.status_name || e.status || '').toUpperCase()
              return s.includes('DELIVERED')
            })
            if (deliveredEvent) {
              updatedOrder.deliveredDate = deliveredEvent.created_at || deliveredEvent.time || deliveredEvent.date
              hasChanges = true
            } else {
              // Fallback to today if courier says delivered but no event date found
              updatedOrder.deliveredDate = new Date().toISOString().split('T')[0]
              hasChanges = true
            }
          }

          if (hasChanges) {
            setLocalOrder(updatedOrder)
            if (onSave) await onSave(updatedOrder)
            addToast('Order details auto-synced with Courier', 'info')
          }
        } catch (error) {
          console.error("Error fetching tracking/finance:", error)
        } finally {
          setLoadingTracking(false)
          setFinanceLoading(false)
        }
      }
    }
    fetchTrackingAndFinance()
  }, [localOrder?.trackingNumber, settings])



  // Safety check
  if (!localOrder) {
    return null
  }

  // Helper to safely extract name string from potential object values
  const getSafeName = (val) => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (typeof val === 'object' && val.name) return val.name
    return String(val)
  }

  // Helper to safely format dates
  const formatSafeDate = (dateVal) => {
    if (!dateVal) return 'N/A'
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return 'N/A'
      return d.toLocaleString()
    } catch {
      return 'N/A'
    }
  }

  // Get category and item names with safety checks
  const category = localOrder.categoryId ? products.categories.find(cat => cat.id === localOrder.categoryId) : null
  const item = category && localOrder.itemId ? category.items.find(item => item.id === localOrder.itemId) : null
  const categoryName = getSafeName(category?.name) || 'N/A'
  const itemName = getSafeName(localOrder.customItemName || item?.name) || 'N/A'

  // Get values - handle both camelCase (from form) and transformed (from DB) formats
  const orderItems = Array.isArray(localOrder.orderItems) && localOrder.orderItems.length > 0
    ? localOrder.orderItems
    : [{
      categoryId: localOrder.categoryId || null,
      itemId: localOrder.itemId || null,
      customItemName: localOrder.customItemName || '',
      quantity: localOrder.quantity || 1,
      unitPrice: localOrder.unitPrice || 0,
      notes: ''
    }]

  const getCategoryName = (categoryId) => {
    const c = products.categories.find(cat => cat.id === categoryId)
    return getSafeName(c?.name) || 'N/A'
  }

  const getItemName = (item) => {
    if (item.name || item.itemName) return getSafeName(item.name || item.itemName)
    if (item.customItemName) return getSafeName(item.customItemName)
    const c = products.categories.find(cat => cat.id === item.categoryId)
    const it = c?.items?.find(x => x.id === item.itemId)
    return getSafeName(it?.name) || 'N/A'
  }

  const subtotal = orderItems.reduce((sum, it) => {
    const qty = Number(it.quantity) || 0
    const price = Number(it.unitPrice) || 0
    return sum + qty * price
  }, 0)

  const deliveryCharge = Number(localOrder.deliveryCharge ?? 400) || 0

  // Keep compatibility if older orders stored only totalPrice/totalAmount
  const totalPrice = (localOrder.totalPrice || localOrder.totalAmount || 0) || subtotal
  const discountType = localOrder.discountType || 'Rs'
  const discount = localOrder.discount || localOrder.discountValue || 0

  // Safe defaults for all order properties
  const safeOrder = {
    id: localOrder.id || 'N/A',
    customerName: localOrder.customerName || localOrder.customer_name || 'N/A',
    address: localOrder.address || localOrder.customer_address || '',
    phone: localOrder.phone || localOrder.customer_phone || '',
    whatsapp: localOrder.whatsapp || localOrder.customer_whatsapp || '',
    nearestCity: localOrder.nearestCity || localOrder.nearest_city || localOrder.destination_city_name || '',
    district: localOrder.district || localOrder.district_name || localOrder.destination_state_name || '',
    status: localOrder.status || 'Pending',
    paymentStatus: localOrder.paymentStatus || localOrder.payment_status || 'Pending',
    orderDate: localOrder.orderDate || localOrder.order_date || localOrder.createdDate || localOrder.created_date || new Date().toLocaleDateString(),
    createdDate: localOrder.createdDate || localOrder.created_date || localOrder.orderDate || '',
    dispatchDate: localOrder.dispatchDate || localOrder.dispatch_date || '',
    trackingNumber: localOrder.trackingNumber || localOrder.tracking_number || localOrder.waybill_number || '',
    notes: localOrder.notes || localOrder.remark || '',
    scheduledDeliveryDate: localOrder.scheduledDeliveryDate || localOrder.deliveryDate || localOrder.delivery_date || '',
    paymentMethod: localOrder.paymentMethod || localOrder.payment_method || 'COD'
  }

  // Handle status changes
  const handleStatusChange = async (field, newValue) => {
    // If status changes to Packed and there's no tracking number, prompt for tracking number
    if (field === 'status' && newValue === 'Packed' && !localOrder?.trackingNumber) {
      if (onRequestTrackingNumber) {
        onRequestTrackingNumber({ ...localOrder, status: 'Packed' }, 'Packed')
        return
      }
      setPendingStatus('Packed')
      setShowTrackingModal(true)
      return
    }

    // If status changes to Dispatched and Curfox is enabled, trigger choice modal
    if (field === 'status' && newValue === 'Dispatched' && settings?.curfox?.enabled) {
      const isCurfoxConnected = settings.curfox.email && settings.curfox.password && settings.curfox.tenant;
      const today = new Date().toISOString().split('T')[0]

      showConfirm(
        'Dispatch Order',
        'How would you like to handle this dispatch?',
        async () => { // Confirm = Send to Courier
          // Logic to handle Curfox dispatch (similar to OrderManagement but locally managed or via prop)
          // For simplicity, within ViewOrderModal, we can just call handleCurfoxDispatch logic if we had it, 
          // or reuse the same logic pattern.
          try {
            const authResponse = await curfoxService.login(settings.curfox.email, settings.curfox.password, settings.curfox.tenant)
            const authPayload = { ...settings.curfox, token: authResponse.token, businessId: settings.curfox.businessId || authResponse.businessId }
            await curfoxService.createOrder(localOrder, localOrder.trackingNumber, authPayload)

            const updatedOrder = { ...localOrder, status: 'Dispatched', dispatchDate: today }
            setLocalOrder(updatedOrder)
            if (onSave) await onSave(updatedOrder)
            addToast('Order dispatched to Curfox successfully', 'success')
          } catch (error) {
            addToast('Curfox Dispatch Failed: ' + error.message, 'error')
          }
        },
        'default',
        'Send to Courier',
        {
          cancelText: 'Cancel',
          extraButtonText: 'Dispatch Locally',
          onExtraButtonClick: async () => {
            const updatedOrder = { ...localOrder, status: 'Dispatched', dispatchDate: today }
            setLocalOrder(updatedOrder)
            if (onSave) await onSave(updatedOrder)
            addToast('Order marked as Dispatched locally', 'success')
          },
          confirmDisabled: !isCurfoxConnected || !localOrder?.trackingNumber
        }
      )
      return
    }

    // If status changes to Dispatched and there's no tracking number (and NOT handled by Curfox above)
    if (field === 'status' && newValue === 'Dispatched' && !localOrder?.trackingNumber) {
      if (onRequestDispatch) {
        onRequestDispatch({ ...localOrder, status: 'Dispatched' })
        return
      }
      setPendingStatus('Dispatched')
      setShowDispatchModal(true)
      return
    }

    const updatedOrder = { ...localOrder, [field]: newValue }
    if (field === 'status' && newValue === 'Dispatched' && !updatedOrder.dispatchDate) {
      updatedOrder.dispatchDate = new Date().toISOString().split('T')[0]
    }
    setLocalOrder(updatedOrder)
    if (onSave) {
      await onSave(updatedOrder)
    }
  }

  // Sync Finance Data to Order
  const handleSyncFinance = async () => {
    if (!financeData || !onSave) return
    try {
      setFinanceLoading(true)
      const updatedOrder = {
        ...localOrder,
        courierFinanceStatus: financeData.finance_status,
        courierInvoiceNo: financeData.invoice_no,
        courierInvoiceRef: financeData.invoice_ref_no,
        courierDepositedDate: financeData.finance_deposited_date || financeData.deposited_date || financeData.deposited_at
      }

      // Auto-mark as paid if deposited or approved
      if (financeData.finance_status === 'Deposited' || financeData.finance_status === 'Approved') {
        updatedOrder.paymentStatus = 'Paid'
      }

      setLocalOrder(updatedOrder)
      await onSave(updatedOrder)
      addToast('Finance data synced to order', 'success')
    } catch (err) {
      console.error("Sync Finance Error:", err)
      addToast('Failed to sync finance data', 'error')
    } finally {
      setFinanceLoading(false)
    }
  }

  // Calculate discount amount based on subtotal (base price before order-level discount)
  let discountAmount = 0
  if (discountType === '%') {
    discountAmount = (subtotal * discount) / 100
  } else {
    discountAmount = discount || 0
  }

  const finalPrice = Math.max(0, subtotal - discountAmount)
  const advancePayment = Number(localOrder.advancePayment) || 0
  const codAmount = localOrder.codAmount || Math.max(0, finalPrice + deliveryCharge - advancePayment)

  const handleDownloadInvoice = async () => {
    // Basic HTML escaping
    const escapeHtml = (unsafe) => {
      if (unsafe === null || unsafe === undefined) return ''
      return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    }

    // Business Info Logic - Fetch latest to be sure
    const latestSettings = await getSettings() || settings
    const bizName = latestSettings?.businessName || 'AllSet'
    const bizTagline = latestSettings?.businessTagline || 'From Chaos to Clarity'
    const bizLogo = latestSettings?.businessLogo || './Logos/Logo File light mode.png'
    const bizAddress = latestSettings?.businessAddress || ''
    const bizPhone = latestSettings?.businessPhone || ''
    const bizWhatsapp = latestSettings?.businessWhatsapp || ''
    const bizEmail = latestSettings?.businessEmail || ''
    const bizWebsite = latestSettings?.businessWebsite || ''

    // Contact Info HTML
    let contactHtml = ''
    if (!isFreeUser) {
      if (settings?.businessAddress) contactHtml += `<p>${escapeHtml(settings.businessAddress)}</p>`
      if (settings?.businessPhone) contactHtml += `<p><strong>Tel:</strong> ${escapeHtml(settings.businessPhone)}</p>`
      if (settings?.businessEmail) contactHtml += `<p><strong>Email:</strong> ${escapeHtml(settings.businessEmail)}</p>`
      if (settings?.businessWebsite) contactHtml += `<p><strong>Web:</strong> ${escapeHtml(settings.businessWebsite)}</p>`
    }

    const invoiceRows = orderItems.map((it, idx) => {
      const catName = escapeHtml(getCategoryName(it.categoryId))
      const itName = escapeHtml(getItemName(it))
      const qty = Number(it.quantity) || 0
      const price = Number(it.unitPrice) || 0
      return `
        <tr>
          <td style="color: #888; text-align: center;">${idx + 1}</td>
          <td>
            <strong>${catName} - ${itName}</strong>
            ${it.notes ? `<div style="margin-top:4px; color: #444; font-size: 0.9em; font-style: italic;">${escapeHtml(it.notes)}</div>` : ''}
          </td>
          <td class="text-right">${qty}</td>
          <td class="text-right">Rs. ${price.toFixed(2)}</td>
          <td class="text-right">Rs. ${(qty * price).toFixed(2)}</td>
        </tr>`
    }).join('')

    const pageSize = settings?.general?.defaultPageSize || 'A4'

    const brandColor = activePalette.color
    const fontStack = fontFamily === 'modern' ? "'Inter', sans-serif" :
      fontFamily === 'professional' ? "'Poppins', sans-serif" :
        fontFamily === 'elegant' ? "'Playfair Display', serif" :
          "system-ui, -apple-system, sans-serif"

    const invoiceHTML = `
      <div class="pdf-container" style="padding: 40px; font-family: ${fontStack}; color: #333; line-height: 1.5;">
        <style>
          .text-right { text-align: right; }
          .brand-color { color: ${brandColor}; }
          .brand-bg { background-color: ${brandColor}; }
        </style>

        <!-- Header -->
        <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
          <div class="biz-info" style="display: flex; align-items: center; gap: 20px;">
            <div class="logo">
              <img src="${bizLogo}" style="max-width: 90px; max-height: 90px; object-fit: contain;">
            </div>
            <div>
              <h1 style="margin: 0; color: ${brandColor}; font-size: 28px; font-weight: 800; text-transform: uppercase; line-height: 1.1;">${escapeHtml(bizName)}</h1>
              <p style="margin: 4px 0 0 0; color: #333; font-size: 15px; font-weight: 500;">${escapeHtml(bizTagline)}</p>
            </div>
          </div>
          <div class="contact-details" style="text-align: right; color: #000; font-size: 12px; line-height: 1.6;">
            ${bizAddress ? `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 2px;">
              <span>${escapeHtml(bizAddress)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>` : ''}
            ${bizPhone ? `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 2px;">
              <span>${escapeHtml(bizPhone)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.3-2.3a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </div>` : ''}
            ${bizWhatsapp ? `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 2px;">
              <span>${escapeHtml(bizWhatsapp)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${brandColor}"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.24-.579-.48-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.12.556 4.188 1.61 6.006L0 24l6.117-1.605a11.787 11.787 0 005.925 1.597h.005c6.637 0 12.032-5.396 12.035-12.032a11.763 11.763 0 00-3.535-8.503"/></svg>
            </div>` : ''}
            ${bizEmail ? `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 2px;">
              <span>${escapeHtml(bizEmail)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>` : ''}
            ${bizWebsite ? `<div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 2px;">
              <span>${escapeHtml(bizWebsite)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </div>` : ''}
          </div>
        </div>

        <!-- Separator -->
        <div style="height: 3px; background-color: ${brandColor}; margin-bottom: 30px;"></div>

        <!-- Title -->
        <h2 style="text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 8px; margin-bottom: 45px; color: ${brandColor};">INVOICE</h2>

        <!-- Details Grid -->
        <div class="details-grid" style="display: flex; justify-content: space-between; margin-bottom: 35px; border-top: 1px solid #eee; padding-top: 20px;">
          <div class="details-col" style="width: 48%;">
            <div style="font-size: 11px; font-weight: 800; color: #000; text-transform: uppercase; margin-bottom: 10px; border-bottom: 2px solid ${brandColor}; display: inline-block; padding-bottom: 2px;">Bill To</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 80px; display: inline-block; color: #777;">Name</span>: <strong>${escapeHtml(safeOrder.customerName)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 80px; display: inline-block; color: #777;">Address</span>: <span style="font-weight: 600;">${escapeHtml(safeOrder.address)}</span></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 80px; display: inline-block; color: #777;">WhatsApp</span>: <strong>${escapeHtml(safeOrder.whatsapp || safeOrder.phone)}</strong></div>
          </div>
          <div class="details-col" style="width: 40%;">
            <div style="font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #efefef; padding-bottom: 4px;">Invoice Details</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Invoice No.</span>: <strong>#${escapeHtml(safeOrder.id)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Date</span>: <strong>${escapeHtml(safeOrder.orderDate)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Status</span>: <strong>${escapeHtml(safeOrder.status)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Payment</span>: <strong>Pending</strong></div>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; border-bottom: 2px solid #efefef; width: 30px;">#</th>
              <th style="padding: 12px 10px; text-align: left; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; border-bottom: 2px solid #efefef;">Description</th>
              <th style="padding: 12px 10px; text-align: center; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; border-bottom: 2px solid #efefef; width: 60px;">QTY</th>
              <th style="padding: 12px 10px; text-align: right; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; border-bottom: 2px solid #efefef; width: 100px;">Unit Price</th>
              <th style="padding: 12px 10px; text-align: right; font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; border-bottom: 2px solid #efefef; width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map((it, idx) => `
              <tr>
                <td style="padding: 15px 10px; border-bottom: 1px solid #efefef; font-size: 13px; color: #999;">${idx + 1}</td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #efefef;">
                  <div style="font-size: 14px; font-weight: 700; color: #111;">${escapeHtml(getCategoryName(it.categoryId))} - ${escapeHtml(getItemName(it))}</div>
                  ${it.notes ? `<div style="font-size: 11px; color: #666; font-style: italic; margin-top: 4px;">${escapeHtml(it.notes)}</div>` : ''}
                </td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #efefef; font-size: 13px; text-align: center; font-weight: 600;">${it.quantity}</td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #efefef; font-size: 13px; text-align: right; font-weight: 600;">Rs. ${Number(it.unitPrice).toFixed(2)}</td>
                <td style="padding: 15px 10px; border-bottom: 1px solid #efefef; font-size: 13px; text-align: right; font-weight: 600;">Rs. ${(it.quantity * it.unitPrice).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Summary -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
          <div style="width: 280px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
              <span style="color: #666;">Subtotal</span>
              <span style="font-weight: 700;">Rs. ${totalPrice.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
              <span style="color: #666;">Delivery Charge</span>
              <span style="font-weight: 700;">Rs. ${deliveryCharge.toFixed(2)}</span>
            </div>
            ${discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
                <span style="color: #666;">Discount</span>
                <span style="font-weight: 700; color: ${brandColor};">- Rs. ${discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
              <span style="color: #666;">Advance Payment</span>
              <span style="font-weight: 700; color: ${brandColor};">- Rs. ${advancePayment.toFixed(2)}</span>
            </div>
            <div style="height: 1px; background-color: #efefef; margin: 10px 0;"></div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: 800; color: ${brandColor};">
              <span>Amount Due (COD)</span>
              <span>Rs. ${codAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${safeOrder.notes ? `
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 40px;">
            <div style="font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 6px;">Notes</div>
            <div style="font-size: 12px; color: #444; line-height: 1.6;">${escapeHtml(safeOrder.notes)}</div>
          </div>
        ` : ''}

        <div style="border-top: 1px solid #efefef; margin-top: 50px; padding-top: 30px; text-align: center;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #444; margin-bottom: 8px;">Thank you for your business!</p>
          <p style="margin: 5px 0 0 0; font-size: 11px; color: #aaa; font-weight: 500;">Powered by AllSet Business Management App</p>
        </div>
      </div>
    `

    const fileName = `Order_${safeOrder.id}_Invoice.pdf`
    const opt = {
      margin: 0,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: pageSize.toLowerCase(), orientation: 'portrait' }
    }

    try {
      addToast('Generating PDF...', 'info')

      // Use 'datauristring' which returns the base64 encoded PDF with a header
      const pdfDataUri = await html2pdf().from(invoiceHTML).set(opt).outputPdf('datauristring')
      // Extract only the base64 part
      const pdfBase64 = pdfDataUri.split('base64,')[1]

      if (Capacitor.isNativePlatform()) {
        const path = fileName
        await Filesystem.writeFile({
          path,
          data: pdfBase64,
          directory: Directory.Documents,
        })

        const fileUri = await Filesystem.getUri({
          directory: Directory.Documents,
          path,
        })

        await FileOpener.open({
          fileUri: fileUri.uri,
        })
        addToast('Invoice saved and opened', 'success')

      } else if (window.electronAPI) {
        const result = await window.electronAPI.savePdfToTemp(pdfBase64, fileName)
        if (result.success) {
          addToast('Opening in external viewer...', 'success')
        } else {
          throw new Error(result.error)
        }
      } else {
        // Fallback for web (though opt.save() is usually handled by html2pdf directly)
        await html2pdf().from(invoiceHTML).set(opt).save()
        addToast('Invoice downloaded', 'success')
      }
    } catch (error) {
      console.error('PDF Generation Error:', error)
      addToast('Failed to generate PDF: ' + error.message, 'error')
    }
  }

  const handleSendInvoiceWhatsApp = () => {
    if (!safeOrder.whatsapp) {
      showAlert('Missing Information', 'No WhatsApp number available for this order', 'warning')
      return
    }

    const formattedNumber = formatWhatsAppNumber(safeOrder.whatsapp)
    if (!formattedNumber) {
      showAlert('Invalid Format', 'Invalid WhatsApp number format', 'warning')
      return
    }

    // Build item details string for template
    const itemDetailsString = orderItems.map(it => {
      const cName = getCategoryName(it.categoryId)
      const iName = getItemName(it)
      const qty = Number(it.quantity) || 0
      const price = Number(it.unitPrice) || 0
      return `🔸ITEM: ${cName} - ${iName}\n🔸 QTY: ${qty}\n🔸PRICE: Rs. ${price.toFixed(2)}`
    }).join('\n\n')

    // Use template from settings or fallback to default
    const template = settings?.whatsappTemplates?.viewOrder || ''

    const totalQuantity = orderItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
    const invoiceMessage = generateWhatsAppMessage(template, safeOrder, {
      itemDetailsString,
      subtotal,
      discountAmount,
      finalPrice,
      deliveryCharge,
      codAmount,
      totalQuantity,
      totalItems: orderItems.length
    })

    if (!invoiceMessage) {
      showAlert('Template Error', 'Template error: Message is empty', 'danger')
      return
    }

    const encodedMessage = encodeURIComponent(invoiceMessage)
    const numberForUrl = formattedNumber.replace('+', '')
    window.open(`https://wa.me/${numberForUrl}?text=${encodedMessage}`, '_blank')
  }


  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      {/* Confirmation Modal Rendered on top of this if needed */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        isAlert={modalConfig.isAlert}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        extraButtonText={modalConfig.extraButtonText}
        onExtraButtonClick={modalConfig.onExtraButtonClick}
        extraButtonDisabled={modalConfig.extraButtonDisabled}
        confirmDisabled={modalConfig.confirmDisabled}
      />

      <div
        className="modal-content view-order-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1200px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {/* Modal Header / Action Bar */}
        <div className="modal-header" style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Order #{safeOrder.id}</h2>
            <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {safeOrder.orderDate}
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleDownloadInvoice}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              title="Download PDF Invoice"
            >
              <Download size={18} />
              <span className="hidden-mobile">PDF</span>
            </button>
            <button
              onClick={handleSendInvoiceWhatsApp}
              className="btn btn-whatsapp"
              disabled={isFreeUser}
              title={isFreeUser ? "WhatsApp is a Pro feature" : "Share Invoice via WhatsApp"}
            >
              <MessageCircle size={18} />
              <span className="hidden-mobile">WhatsApp</span>
              {isFreeUser && <Crown size={14} color="var(--danger)" />}
            </button>
            <button className="modal-close" onClick={onClose} style={{ marginLeft: '0.5rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body - Split Layout */}
        <div className="modal-body-scroll view-order-split-layout">
          {/* LEFT COLUMN - Order Details */}
          <div className="view-order-left-column">
            {/* Invoice Header (Only visible in Print) */}
            <div className="print-only" style={{
              textAlign: 'center',
              borderBottom: '2px solid var(--accent-primary)',
              paddingBottom: '1.5rem',
              marginBottom: '2rem',
              display: 'none'
            }}>
              <h1 style={{ color: 'var(--accent-primary)', fontSize: '2rem', marginBottom: '0.5rem' }}>AllSet</h1>
              <p style={{ color: 'var(--text-muted)' }}>From Chaos to Clarity.</p>
            </div>


            {/* Unified Order & Customer Card */}
            <div className="glass-card" style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}>
              {/* Header Row: Customer Name + Order Status Badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {safeOrder.customerName}
                    {customerOrderCount > 1 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          padding: '0.15rem 0.5rem',
                          backgroundColor: 'var(--accent-primary)',
                          color: '#fff',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}
                        title={`${customerOrderCount} orders placed`}
                      >
                        <Star size={10} fill="currentColor" /> {customerOrderCount}
                      </span>
                    )}
                  </div>
                  {safeOrder.whatsapp && (
                    <a href={`https://wa.me/${safeOrder.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#25D366', fontSize: '0.85rem', marginTop: '0.25rem', textDecoration: 'none' }}>
                      <MessageCircle size={14} />
                      {formatWhatsAppNumber(safeOrder.whatsapp)}
                    </a>
                  )}
                  {safeOrder.phone && safeOrder.phone !== safeOrder.whatsapp && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                      📞 {safeOrder.phone}
                    </div>
                  )}
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <CustomDropdown
                    options={[
                      { value: 'New Order', label: 'New Order' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Packed', label: 'Packed' },
                      { value: 'Dispatched', label: 'Dispatched' },
                      { value: 'Delivered', label: 'Delivered' },
                      { value: 'Cancelled', label: 'Cancelled' }
                    ]}
                    value={safeOrder.status}
                    onChange={(val) => handleStatusChange('status', val)}
                    style={{ minWidth: '120px' }}
                  />
                  {!isFreeUser && (
                    <CustomDropdown
                      options={[
                        { value: 'Pending', label: 'Pending' },
                        { value: 'Paid', label: 'Paid' }
                      ]}
                      value={safeOrder.paymentStatus}
                      onChange={(val) => handleStatusChange('paymentStatus', val)}
                      style={{ minWidth: '100px' }}
                    />
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '1rem 0' }}></div>

              {/* Info Grid: 2 columns on Desktop, 1 on Mobile */}
              <div className="order-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {/* Delivery Info */}
                <div>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    📍 Delivery Address
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {safeOrder.address || 'No address provided'}
                  </div>
                  {(safeOrder.nearestCity || safeOrder.district) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {safeOrder.nearestCity}{safeOrder.nearestCity && safeOrder.district ? ', ' : ''}{safeOrder.district}
                    </div>
                  )}
                </div>

                {/* Dates & Tracking */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {safeOrder.scheduledDeliveryDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scheduled:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{safeOrder.scheduledDeliveryDate}</span>
                    </div>
                  )}
                  {safeOrder.dispatchDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dispatched:</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{safeOrder.dispatchDate.includes('T') ? safeOrder.dispatchDate.split('T')[0] : safeOrder.dispatchDate}</span>
                    </div>
                  )}
                  {!isFreeUser && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tracking:</span>
                      <input
                        type="text"
                        value={safeOrder.trackingNumber || ''}
                        onChange={(e) => setLocalOrder(prev => ({ ...prev, trackingNumber: e.target.value }))}
                        placeholder="—"
                        style={{
                          textAlign: 'right',
                          width: '140px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                          fontFamily: 'monospace',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border-color)'
                          if (onSave) onSave(localOrder)
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            {/* Items Table */}
            {/* Items Table - Desktop */}
            <div className="items-table-desktop" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '2px solid var(--border-color)',
                    color: 'var(--text-muted)'
                  }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>DESCRIPTION</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>QTY</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>UNIT PRICE</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((it, idx) => {
                    const catName = getCategoryName(it.categoryId)
                    const itName = getItemName(it)
                    const qty = Number(it.quantity) || 0
                    const price = Number(it.unitPrice) || 0
                    const amount = qty * price
                    const notes = (it.notes || '').toString().trim()
                    return (
                      <tr key={`${idx}-${it.itemId || it.customItemName || 'item'}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                          <div style={{ fontWeight: 500 }}>{catName} - {itName}</div>
                          {it.image && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a href={it.image} target="_blank" rel="noopener noreferrer">
                                <img src={it.image} alt="Ref" style={{ height: '50px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                              </a>
                            </div>
                          )}
                          {notes && (
                            <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              {notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{qty}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Rs. {price.toFixed(2)}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>Rs. {amount.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Items List - Mobile */}
            <div className="items-card-mobile">
              {orderItems.map((it, idx) => {
                const catName = getCategoryName(it.categoryId)
                const itName = getItemName(it)
                const qty = Number(it.quantity) || 0
                const price = Number(it.unitPrice) || 0
                const amount = qty * price
                const notes = (it.notes || '').toString().trim()
                return (
                  <div key={`${idx}-mobile`} className="item-mobile-row">
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                      {catName} - {itName}
                    </div>

                    {it.image && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <img src={it.image} alt="Ref" style={{ width: '100%', maxWidth: '200px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Quantity:</span>
                      <span>{qty}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      <span>Unit Price:</span>
                      <span>Rs. {price.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>Total:</span>
                      <span>Rs. {amount.toFixed(2)}</span>
                    </div>

                    {notes && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <strong>Notes:</strong> {notes}
                      </div>
                    )}


                  </div>
                )
              })}
            </div>



            {/* Totals Section */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: '2rem'
            }}>
              <div className="totals-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {totalPrice.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--success)' }}>
                    <span>Discount ({discountType === '%' ? discount + '%' : 'Rs. ' + discount.toFixed(2)}):</span>
                    <span>- Rs. {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Delivery Charge:</span>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {deliveryCharge.toFixed(2)}</span>
                </div>
                {advancePayment > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--success)' }}>
                    <span>Advance Payment:</span>
                    <span style={{ fontWeight: 500 }}>- Rs. {advancePayment.toFixed(2)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--accent-primary)'
                }}>
                  <span>{isFreeUser ? 'Total:' : 'Total (COD):'}</span>
                  <span>Rs. {codAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {safeOrder.notes && (
              <div style={{
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius)',
                borderLeft: '4px solid var(--accent-primary)'
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Order Notes
                </h4>
                <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem' }}>
                  {safeOrder.notes}
                </p>
              </div>
            )}

          </div>
          {/* END LEFT COLUMN */}

          {/* RIGHT COLUMN - Tracking & Finance */}
          <div className="view-order-right-column">
            {/* Tracking Section */}
            <div className="tracking-finance-panel glass-card" style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'sticky',
              top: '0',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '0.5rem',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(var(--accent-rgb), 0.1)',
                  color: 'var(--accent-primary)'
                }}>
                  <Truck size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Shipment Status</h3>
                  {safeOrder.trackingNumber && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Waybill: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{safeOrder.trackingNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {!safeOrder.trackingNumber ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <Truck size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ margin: 0 }}>No tracking number assigned yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Mark order as "Packed" to generate a waybill.</p>
                </div>
              ) : loadingTracking ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
                  <p>Fetching updates...</p>
                </div>
              ) : (
                <>
                  {/* Current Status Hero */}
                  <div style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.1) 0%, rgba(var(--accent-rgb), 0.05) 100%)',
                    border: '1px solid rgba(var(--accent-rgb), 0.2)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        Current Status
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {(() => {
                          if (trackingHistory.length === 0) return 'Awaiting Update'
                          const latest = trackingHistory[0]
                          return getSafeName(latest.status) || getSafeName(latest.status_code) || 'Update'
                        })()}
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(var(--accent-rgb), 0.2)', borderRadius: '50%', color: 'var(--accent-primary)' }}>
                      <Truck size={24} />
                    </div>
                  </div>

                  {/* Timeline */}
                  {trackingHistory.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Shipment History</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {trackingHistory.slice(0, 5).map((event, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.75rem', position: 'relative', paddingBottom: idx === Math.min(4, trackingHistory.length - 1) ? 0 : '1rem' }}>
                            {idx !== Math.min(4, trackingHistory.length - 1) && (
                              <div style={{ position: 'absolute', left: '5px', top: '18px', bottom: '0', width: '2px', backgroundColor: 'var(--border-color)' }}></div>
                            )}
                            <div style={{
                              width: '12px', height: '12px', borderRadius: '50%',
                              backgroundColor: idx === 0 ? 'var(--accent-primary)' : 'var(--bg-card)',
                              border: idx === 0 ? '3px solid rgba(var(--accent-rgb), 0.3)' : '2px solid var(--text-muted)',
                              flexShrink: 0, marginTop: '3px', zIndex: 1
                            }}></div>
                            <div>
                              <div style={{ fontWeight: idx === 0 ? 600 : 400, color: idx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {getSafeName(event.status) || getSafeName(event.status_code) || 'Update'}
                              </div>
                            </div>
                          </div>
                        ))}
                        {trackingHistory.length > 5 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>
                            +{trackingHistory.length - 5} more updates
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Finance Section */}
              {safeOrder.trackingNumber && settings?.curfox?.enabled && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>Finance Status</h4>

                  {financeLoading ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                      <RefreshCw className="animate-spin" size={20} />
                    </div>
                  ) : financeData ? (
                    <>
                      <div style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        background: financeData.finance_status === 'Deposited'
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                          : 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%)',
                        border: `1px solid ${financeData.finance_status === 'Deposited' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
                        textAlign: 'center',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}>
                          {financeData.finance_status || 'Pending'}
                          {financeData.finance_status === 'Deposited' && <CheckCircle size={20} fill="#10b981" color="black" />}
                        </div>
                      </div>

                      {/* Invoice details */}
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {financeData.invoice_ref_no && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Invoice Ref:</span>
                            <span style={{ fontWeight: 500 }}>{financeData.invoice_ref_no}</span>
                          </div>
                        )}
                        {financeData.invoice_no && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Invoice No:</span>
                            <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{financeData.invoice_no}</span>
                          </div>
                        )}
                        {(financeData.finance_deposited_date || financeData.deposited_date || financeData.deposited_at) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Deposited Date:</span>
                            <span style={{ fontWeight: 500 }}>{financeData.finance_deposited_date || financeData.deposited_date || financeData.deposited_at}</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleSyncFinance}
                        disabled={financeLoading}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                      >
                        {financeLoading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                        Sync to Order
                      </button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <p>No finance record yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* END RIGHT COLUMN */}

          <style>{`
            .view-order-split-layout {
              display: grid;
              grid-template-columns: 1.6fr 1fr;
              gap: 2rem;
              overflow-y: auto;
              padding: 2rem;
              flex: 1;
            }
            .view-order-left-column {
              min-width: 0;
            }
            .view-order-right-column {
              min-width: 0;
            }
            .tracking-finance-panel {
              position: sticky;
              top: 0;
            }

            .items-card-mobile {
              display: none;
              flex-direction: column;
              gap: 1rem;
              margin-bottom: 2rem;
            }

            .item-mobile-row {
              background: var(--bg-secondary);
              padding: 1rem;
              border-radius: 8px;
              border: 1px solid var(--border-color);
            }

            .totals-container {
              width: 300px;
              padding: 1rem;
              background-color: var(--bg-secondary);
              border-radius: var(--radius);
            }

            @media (max-width: 1024px) {
              .view-order-split-layout {
                grid-template-columns: 1fr;
                padding: 1rem;
              }
              .view-order-right-column {
                order: 2;
              }
              .tracking-finance-panel {
                position: static;
              }
            }

            @media (max-width: 600px) {
              .view-order-split-layout {
                padding: 1rem;
                gap: 1rem;
              }
              .items-table-desktop {
                display: none !important;
              }
              .items-card-mobile {
                display: flex !important;
              }
              .totals-container {
                width: 100% !important;
              }
              .modal-header {
                padding: 1rem !important;
              }
              .modal-header h2 {
                font-size: 1.1rem !important;
              }
            }

            @media print {
              .modal-overlay {
                position: absolute;
                background: white !important;
                padding: 0 !important;
                display: block !important;
              }
              .view-order-modal {
                box-shadow: none !important;
                border-radius: 0 !important;
                max-height: none !important;
                max-width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 0 !important;
                overflow: visible !important;
                display: block !important;
              }
              .view-order-split-layout {
                display: block !important;
              }
              .view-order-right-column {
                display: none !important;
              }
              .no-print {
                display: none !important;
              }
              .print-only {
                display: block !important;
              }
              .view-order-modal * {
                color: #000 !important;
                background-color: transparent !important;
                border-color: #ddd !important;
              }
              .view-order-modal table th {
                background-color: #f3f4f6 !important;
                font-weight: bold !important;
              }
              .card {
                border: 1px solid #ddd !important;
                padding: 10px !important;
                background: none !important;
              }
              .items-table-desktop {
                display: table !important;
              }
              .items-card-mobile {
                display: none !important;
              }
            }
          `}</style>

          {/* Local fallbacks if parent doesn't provide handlers */}
          {showTrackingModal && (
            <TrackingNumberModal
              order={{ ...localOrder, status: pendingStatus }}
              targetStatus={pendingStatus}
              onClose={() => {
                setShowTrackingModal(false)
                setPendingStatus('Packed')
              }}
              onSave={async (updatedOrder) => {
                setLocalOrder(updatedOrder)
                if (onSave) {
                  await onSave(updatedOrder)
                }
              }}
            />
          )}

          {showDispatchModal && (
            <DispatchModal
              order={{ ...localOrder, status: 'Dispatched' }}
              onClose={() => {
                setShowDispatchModal(false)
                setPendingStatus('Packed')
              }}
              onSave={async (updatedOrder) => {
                setLocalOrder(updatedOrder)
                if (onSave) {
                  await onSave(updatedOrder)
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default ViewOrderModal
