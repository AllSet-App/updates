import { useState, useEffect } from 'react'
import { X, Download, MessageCircle, Star, Crown, Repeat } from 'lucide-react'
import CustomDropdown from './Common/CustomDropdown'
import { getProducts, getSettings } from '../utils/storage'
import { formatWhatsAppNumber, generateWhatsAppMessage } from '../utils/whatsapp'
import ConfirmationModal from './ConfirmationModal'
import { useToast } from './Toast/ToastContext'
import { useLicensing } from './LicensingContext'

const ViewQuotationModal = ({ quotation, onClose, onSave, onConvertToOrder }) => {
  const { addToast } = useToast()
  const { isFreeUser } = useLicensing()
  const [products, setProducts] = useState({ categories: [] })
  const [localQuotation, setLocalQuotation] = useState(quotation)
  const [settings, setSettings] = useState(null)

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'default',
    title: '',
    message: '',
    onConfirm: null,
    isAlert: false
  })

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

  // Update local quotation when prop changes
  useEffect(() => {
    if (quotation) {
      setLocalQuotation(quotation)
    }
  }, [quotation])

  // Safety check
  if (!localQuotation) {
    return null
  }

  // Helper to safely extract name string
  const getSafeName = (val) => {
    if (!val) return null
    if (typeof val === 'string') return val
    if (typeof val === 'object' && val.name) return val.name
    return String(val)
  }

  const orderItems = Array.isArray(localQuotation.orderItems) && localQuotation.orderItems.length > 0
    ? localQuotation.orderItems
    : []

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

  const deliveryCharge = Number(localQuotation.deliveryCharge) || 0
  const discountType = localQuotation.discountType || 'Rs'
  const discount = Number(localQuotation.discount) || 0

  const safeQuotation = {
    id: localQuotation.id || 'N/A',
    customerName: localQuotation.customerName || 'N/A',
    address: localQuotation.address || '',
    phone: localQuotation.phone || '',
    whatsapp: localQuotation.whatsapp || '',
    createdDate: localQuotation.createdDate || '',
    expiryDate: localQuotation.expiryDate || '',
    status: localQuotation.status || 'Draft',
    notes: localQuotation.notes || ''
  }

  const handleStatusChange = async (field, newValue) => {
    const updatedQuotation = { ...localQuotation, [field]: newValue }
    setLocalQuotation(updatedQuotation)
    if (onSave) {
      await onSave(updatedQuotation)
    }
  }

  let discountAmount = 0
  if (discountType === '%') {
    discountAmount = (subtotal * discount) / 100
  } else {
    discountAmount = discount || 0
  }

  const finalPrice = Math.max(0, subtotal - discountAmount + deliveryCharge)

  const handleDownloadPDF = () => {
    const escapeHtml = (unsafe) => {
      if (unsafe === null || unsafe === undefined) return ''
      return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    }
    // Default logo as inline SVG (works in Blob URL context)
    const defaultLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" width="90" height="90">
      <style>.st0{fill:#FF2E36;}</style>
      <g><g><path class="st0" d="M445.85,161l22.29,22.29h66.21v66.2l22.29,22.29V161H445.85z M534.35,450.78v66.19h-66.2l-22.29,22.29h110.77V428.49L534.35,450.78z M200.66,516.97v-66.19l-22.29-22.29v110.77h110.77l-22.29-22.29H200.66z M178.38,161v110.77l22.29-22.29v-66.2h66.21L289.17,161H178.38z"/></g><path class="st0" d="M414.24,422.57c22.15,0,43.63,16.02,43.63,51.88c0,58.77-90.35,107.57-90.35,107.57s-90.35-48.8-90.35-107.57c0-35.87,21.47-51.89,43.63-51.88c20.45,0,41.48,13.65,46.73,37.94C372.75,436.22,393.78,422.57,414.24,422.57"/></g><g><path d="M257.13,290.04h21.23l42.29,109.97H298.9l-8.6-22.65h-44.87l-8.95,22.65h-21.75L257.13,290.04z M267.88,319.2l-14.75,37.75h29.42L267.88,319.2z"/><path d="M388.76,287.28c15.56,0,28.94,5.63,40.13,16.89c11.2,11.26,16.79,24.99,16.79,41.19c0,16.05-5.52,29.63-16.57,40.74c-11.05,11.11-24.45,16.67-40.21,16.67c-16.51,0-30.22-5.71-41.14-17.12c-10.92-11.41-16.38-24.97-16.38-40.67c0-10.51,2.54-20.18,7.63-29.01c5.09-8.82,12.08-15.81,20.98-20.97C368.9,289.86,378.48,287.28,388.76,287.28z M388.53,307.76c-10.18,0-18.74,3.54-25.67,10.62c-6.93,7.08-10.4,16.07-10.4,26.99c0,12.16,4.36,21.78,13.1,28.86c6.78,5.53,14.57,8.3,23.35,8.3c9.93,0,18.38-3.59,25.37-10.76c6.98-7.18,10.48-16.02,10.48-26.54c0-10.47-3.52-19.32-10.55-26.58C407.17,311.39,398.61,307.76,388.53,307.76z"/><path d="M465.72,290.04h54.57v20.41H486.5v19.96h33.79v20.11H486.5v49.49h-20.78V290.04z"/></g><g><path d="M307.91,186.2h15.23c6.13,0,10.84,0.73,14.13,2.18c3.29,1.45,5.89,3.69,7.8,6.7c1.91,3.01,2.86,6.36,2.86,10.03c0,3.43-0.84,6.56-2.51,9.38c-1.67,2.82-4.13,5.1-7.37,6.86c4.02,1.37,7.11,2.97,9.27,4.81c2.16,1.84,3.85,4.06,5.05,6.67c1.21,2.61,1.81,5.44,1.81,8.48c0,6.2-2.27,11.44-6.8,15.73c-4.54,4.29-10.62,6.44-18.26,6.44h-21.22V186.2z M315.47,193.76v24.74h4.42c5.37,0,9.32-0.5,11.85-1.5c2.53-1,4.53-2.57,6-4.73c1.47-2.15,2.21-4.54,2.21-7.17c0-3.54-1.24-6.31-3.71-8.33c-2.47-2.01-6.41-3.02-11.82-3.02H315.47z M315.47,226.28v29.63h9.58c5.65,0,9.79-0.55,12.42-1.65c2.63-1.1,4.74-2.83,6.34-5.17c1.6-2.35,2.39-4.89,2.39-7.62c0-3.43-1.12-6.43-3.37-8.98c-2.24-2.56-5.33-4.31-9.26-5.25c-2.63-0.63-7.21-0.95-13.74-0.95H315.47z"/><path d="M370.82,182.78c1.67,0,3.1,0.6,4.29,1.79c1.19,1.19,1.78,2.63,1.78,4.31c0,1.65-0.59,3.06-1.78,4.26c-1.19,1.19-2.62,1.79-4.29,1.79c-1.64,0-3.05-0.6-4.24-1.79c-1.19-1.19-1.78-2.61-1.78-4.26c0-1.68,0.59-3.12,1.78-4.31C367.77,183.38,369.18,182.78,370.82,182.78z M367.17,206.32h7.36v57.16h-7.36V206.32z"/><path d="M385.13,206.32h41.98l-32.36,50.64h31.31v6.51h-43.97l32.33-50.7h-29.29V206.32z"/></g>
    </svg>`

    const bizName = settings?.businessName || 'AllSet'
    const bizTagline = settings?.businessTagline || 'From Chaos to Clarity'
    const bizLogo = settings?.businessLogo || null

    let contactHtml = ''
    if (settings?.businessAddress) contactHtml += `<p>${escapeHtml(settings.businessAddress)}</p>`
    if (settings?.businessPhone) contactHtml += `<p><strong>Tel:</strong> ${escapeHtml(settings.businessPhone)}</p>`
    if (settings?.businessEmail) contactHtml += `<p><strong>Email:</strong> ${escapeHtml(settings.businessEmail)}</p>`

    const rows = orderItems.map((it, idx) => {
      const catName = escapeHtml(getCategoryName(it.categoryId))
      const itName = escapeHtml(getItemName(it))
      const qty = Number(it.quantity) || 0
      const price = Number(it.unitPrice) || 0
      const amount = qty * price
      const notes = (it.notes || '').toString().trim()

      return `
        <tr>
          <td style="color: #888; text-align: center;">${idx + 1}</td>
          <td>
            <strong>${catName} - ${itName}</strong>
            ${notes ? `<div style="margin-top:4px; color: #444; font-size: 0.9em; font-style: italic;">${escapeHtml(notes)}</div>` : ''}
          </td>
          <td class="text-right">${qty}</td>
          <td class="text-right">Rs. ${price.toFixed(2)}</td>
          <td class="text-right">Rs. ${amount.toFixed(2)}</td>
        </tr>
      `
    }).join('')

    const expiryDays = settings?.general?.quotationExpiryDays || 7

    const pageSize = settings?.general?.defaultPageSize || 'A4'
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Quotation - #${escapeHtml(safeQuotation.id)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; color: #333; font-size: 14px; line-height: 1.5; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #FF2E36; padding-bottom: 20px; }
    .brand-section { display: flex; align-items: center; gap: 15px; }
    .logo img { width: 90px; height: 90px; object-fit: contain; }
    .company-info h1 { margin: 0; font-size: 24px; color: #FF2E36; text-transform: uppercase; }
    .company-info p { margin: 0; color: #666; font-size: 14px; }
    .contact-info { text-align: right; font-size: 13px; color: #555; }
    .contact-info p { margin: 2px 0; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
    .info-column { flex: 1; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .details-table { width: 100%; border-collapse: collapse; }
    .details-table td { padding: 4px 0; vertical-align: top; }
    .label-col { width: 110px; color: #666; font-size: 13px; }
    .value-col { font-weight: 600; color: #111; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #f9f9f9; padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; font-size: 12px; color: #666; text-transform: uppercase; }
    .items-table td { padding: 12px 15px; border-bottom: 1px solid #eee; }
    .text-right { text-align: right; }
    .totals-container { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-box { width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-row.final { border-top: 2px solid #eee; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: 700; color: #FF2E36; }
    .important-notice { margin-top: 40px; padding: 20px; background: #fffcf0; border: 1px solid #ffecb3; border-radius: 8px; color: #856404; font-size: 13px; }
    .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }
    @page { size: ${pageSize}; margin: 15mm; }
    @media print { 
      .no-print { display: none; } 
      .container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-section">
        <div class="logo">${bizLogo ? `<img src="${bizLogo}">` : defaultLogoSvg}</div>
        <div class="company-info"><h1>${escapeHtml(bizName)}</h1><p>${escapeHtml(bizTagline)}</p></div>
      </div>
      <div class="contact-info">${contactHtml}</div>
    </div>

    <div style="text-align: center; margin-bottom: 40px;">
      <h2 style="margin: 0; font-size: 28px; letter-spacing: 2px; color: #333; font-weight: 800;">QUOTATION</h2>
    </div>

    <div class="info-grid">
      <div class="info-column">
        <div class="section-title">Valued Customer</div>
        <table class="details-table">
          <tr><td class="label-col">Name</td><td class="value-col">${escapeHtml(safeQuotation.customerName)}</td></tr>
          <tr><td class="label-col">Address</td><td class="value-col">${escapeHtml(safeQuotation.address || 'N/A')}</td></tr>
          ${safeQuotation.phone ? `<tr><td class="label-col">Phone</td><td class="value-col">${escapeHtml(safeQuotation.phone)}</td></tr>` : ''}
          ${safeQuotation.whatsapp ? `<tr><td class="label-col">WhatsApp</td><td class="value-col">${escapeHtml(safeQuotation.whatsapp)}</td></tr>` : ''}
        </table>
      </div>
      <div class="info-column">
        <div class="section-title">Quotation Details</div>
        <table class="details-table">
          <tr><td class="label-col">Quote No.</td><td class="value-col">#${escapeHtml(safeQuotation.id)}</td></tr>
          <tr><td class="label-col">Created Date</td><td class="value-col">${escapeHtml(safeQuotation.createdDate)}</td></tr>
          <tr><td class="label-col">Expiry Date</td><td class="value-col">${escapeHtml(safeQuotation.expiryDate || 'N/A')}</td></tr>
          <tr><td class="label-col">Status</td><td class="value-col">${escapeHtml(safeQuotation.status)}</td></tr>
          ${safeQuotation.notes ? `<tr><td class="label-col">Notes</td><td class="value-col">${escapeHtml(safeQuotation.notes)}</td></tr>` : ''}
        </table>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">#</th>
          <th>Description</th>
          <th class="text-right" style="width: 80px;">Qty</th>
          <th class="text-right" style="width: 120px;">Unit Price</th>
          <th class="text-right" style="width: 120px;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals-container">
      <div class="totals-box">
        <div class="total-row"><span>Subtotal</span><span>Rs. ${subtotal.toFixed(2)}</span></div>
        ${discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span style="color:#FF2E36">- Rs. ${discountAmount.toFixed(2)}</span></div>` : ''}
        <div class="total-row"><span>Delivery Charge</span><span>Rs. ${deliveryCharge.toFixed(2)}</span></div>
        <div class="total-row final"><span>Final Quote</span><span>Rs. ${finalPrice.toFixed(2)}</span></div>
      </div>
    </div>

    <div class="important-notice">
      <strong>Important Notice:</strong> This quotation is valid for <strong>${expiryDays} days</strong> and will expire on <strong>${escapeHtml(safeQuotation.expiryDate || 'N/A')}</strong>. Please confirm your order within this period.
    </div>

    </div>

    <div class="footer">
      <p>${isFreeUser ? 'Generated by AllSet – Professional Business Management App (Free Edition)' : 'Generated by AllSet – Professional Business Management App'}</p>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},500);};</script>
</body>
</html>
`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const handleSendWhatsApp = () => {
    if (!safeQuotation.whatsapp) { showAlert('Missing Info', 'No WhatsApp number', 'warning'); return; }
    const formatted = formatWhatsAppNumber(safeQuotation.whatsapp)

    const details = orderItems.map(it => {
      const catName = getCategoryName(it.categoryId)
      const itName = getItemName(it)
      const qty = Number(it.quantity) || 0
      const price = Number(it.unitPrice) || 0
      return `🔸 ITEM: ${catName} - ${itName}\n🔸 QTY: ${qty}\n🔸 PRICE: Rs. ${price.toFixed(2)}`
    }).join('\n\n')

    const totalQuantity = orderItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
    const template = settings?.whatsappTemplates?.quotation || ''

    const msg = generateWhatsAppMessage(template, safeQuotation, {
      itemDetailsString: details,
      subtotal,
      discountAmount,
      finalPrice,
      deliveryCharge,
      totalQuantity,
      totalItems: orderItems.length
    })

    if (!msg) {
      addToast('Quotation template is empty. Please set it in Settings.', 'warning')
      return
    }

    const numberForUrl = formatted.replace('+', '')
    window.open(`https://wa.me/${numberForUrl}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <ConfirmationModal isOpen={modalConfig.isOpen} onClose={closeModal} onConfirm={modalConfig.onConfirm} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} isAlert={modalConfig.isAlert} />
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>Quotation #{safeQuotation.id}</h2>
            <div style={{ marginTop: '0.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Created on: {safeQuotation.createdDate}</div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={handleDownloadPDF} className="btn btn-secondary" title="Download PDF"><Download size={18} /><span className="hidden-mobile">PDF</span></button>
            <button onClick={handleSendWhatsApp} className="btn btn-whatsapp" disabled={isFreeUser} title={isFreeUser ? "WhatsApp is a Pro feature" : "Share Quotation via WhatsApp"}>
              <MessageCircle size={18} /><span className="hidden-mobile">WhatsApp</span>{isFreeUser && <Crown size={14} color="var(--danger)" />}
            </button>
            <button className="modal-close" onClick={onClose} style={{ marginLeft: '0.5rem' }}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Quotation Details Card */}
            <div className="card" style={{ padding: '1.5rem', height: '100%' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Quotation Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status:</span>
                  <CustomDropdown options={[{ value: 'Draft', label: 'Draft' }, { value: 'Active', label: 'Active' }, { value: 'Order Received', label: 'Order Received' }]} value={safeQuotation.status} onChange={(val) => handleStatusChange('status', val)} style={{ width: '150px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Expiry Date:</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{safeQuotation.expiryDate || 'N/A'}</span>
                </div>

                {safeQuotation.notes && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Notes:</span>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{safeQuotation.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information Card */}
            <div className="card" style={{ padding: '1.5rem', height: '100%' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Customer Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{safeQuotation.customerName}</div>
                {safeQuotation.address && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{safeQuotation.address}</div>}

                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                  {safeQuotation.whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                      <MessageCircle size={14} />
                      <span>{formatWhatsAppNumber(safeQuotation.whatsapp)}</span>
                    </div>
                  )}
                  {safeQuotation.phone && (
                    <div style={{ color: 'var(--text-muted)' }}>Phone: {safeQuotation.phone}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="items-table-desktop" style={{ overflowX: 'auto', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>DESCRIPTION</th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>QTY</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>UNIT PRICE</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: 500 }}>{getCategoryName(it.categoryId)} - {getItemName(it)}</div>
                      {it.notes && <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{it.notes}</div>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{it.quantity}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>Rs. {Number(it.unitPrice).toFixed(2)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>Rs. {(it.quantity * it.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
            <div className="totals-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--success)' }}>
                  <span>Discount:</span>
                  <span>- Rs. {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Delivery Charge:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Rs. {deliveryCharge.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                <span>Grand Total:</span>
                <span>Rs. {finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer no-print" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem', backgroundColor: 'var(--bg-secondary)', justifyContent: 'flex-start' }}>
          {onConvertToOrder && safeQuotation.status !== 'Order Received' && (
            <button onClick={() => onConvertToOrder(localQuotation)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Repeat size={18} /> Convert to Order
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-body-scroll { overflow-y: auto; padding: 2rem; flex: 1; }
        .totals-container { width: 300px; padding: 1rem; background-color: var(--bg-secondary); border-radius: var(--radius); }
        @media screen and (max-width: 600px) {
          .modal-body-scroll { padding: 1rem !important; }
          .totals-container { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

export default ViewQuotationModal
