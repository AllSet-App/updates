import { useState, useEffect } from 'react'
import { X, MessageCircle, Star, Crown, Repeat, MapPin, Phone, Mail, Globe, FileDown, Loader2 } from 'lucide-react'
import CustomDropdown from './Common/CustomDropdown'
import { getProducts, getSettings } from '../utils/storage'
import { formatWhatsAppNumber, generateWhatsAppMessage } from '../utils/whatsapp'
import ConfirmationModal from './ConfirmationModal'
import { useToast } from './Toast/ToastContext'
import { useLicensing } from './LicensingContext'

import { useTheme, PALETTES } from './ThemeContext'
import QuotationPdfDocument from './pdf/QuotationPdfDocument'
import { generateAndSavePdf } from '../utils/pdfUtils'
import { openExternalUrl } from '../utils/platform'


const ViewQuotationModal = ({ quotation, onClose, onSave, onConvertToOrder }) => {
  const { addToast } = useToast()
  const { isFreeUser } = useLicensing()
  const { paletteId, fontFamily } = useTheme()
  const activePalette = PALETTES[paletteId] || PALETTES.signature
  const [products, setProducts] = useState({ categories: [] })
  const [localQuotation, setLocalQuotation] = useState(quotation)
  const [settings, setSettings] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

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
    openExternalUrl(`https://wa.me/${numberForUrl}?text=${encodeURIComponent(msg)}`)
  }

  // PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!settings) {
      addToast('Settings not loaded yet. Please wait...', 'warning')
      return
    }
    try {
      setGeneratingPdf(true)
      const pdfDocument = (
        <QuotationPdfDocument
          quotation={localQuotation}
          businessProfile={settings}
          palette={activePalette}
          products={products}
          fontFamily={fontFamily}
        />
      )
      await generateAndSavePdf(pdfDocument, `Quotation_${safeQuotation.id}.pdf`)
      addToast('Quotation PDF downloaded successfully', 'success')
    } catch (error) {
      console.error('PDF generation error:', error)
      addToast('Failed to generate PDF: ' + error.message, 'error')
    } finally {
      setGeneratingPdf(false)
    }
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
            <button onClick={handleSendWhatsApp} className="btn btn-whatsapp" disabled={isFreeUser} title={isFreeUser ? "WhatsApp is a Pro feature" : "Share Quotation via WhatsApp"}>
              <MessageCircle size={18} /><span className="hidden-mobile">WhatsApp</span>{isFreeUser && <Crown size={14} color="var(--danger)" />}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="btn btn-secondary"
              disabled={generatingPdf || isFreeUser || !settings}
              title={isFreeUser ? "PDF Export is a Pro feature" : (!settings ? "Loading settings..." : "Download Quotation PDF")}
            >
              {generatingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
              <span className="hidden-mobile">PDF</span>
              {isFreeUser && <Crown size={14} color="var(--danger)" />}
            </button>
            <button className="modal-close" onClick={onClose} style={{ marginLeft: '0.5rem' }}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body-scroll" style={{ padding: '2rem' }}>
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
