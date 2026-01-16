import { useState, useEffect } from 'react'
import { X, Download, MessageCircle, Star, Crown, Repeat } from 'lucide-react'
import CustomDropdown from './Common/CustomDropdown'
import { getProducts, getSettings } from '../utils/storage'
import { formatWhatsAppNumber, generateWhatsAppMessage } from '../utils/whatsapp'
import ConfirmationModal from './ConfirmationModal'
import { useToast } from './Toast/ToastContext'
import { useLicensing } from './LicensingContext'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { Capacitor } from '@capacitor/core'
import { useTheme, PALETTES } from './ThemeContext'
import html2pdf from 'html2pdf.js'

const ViewQuotationModal = ({ quotation, onClose, onSave, onConvertToOrder }) => {
  const { addToast } = useToast()
  const { isFreeUser } = useLicensing()
  const { paletteId, fontFamily } = useTheme()
  const activePalette = PALETTES[paletteId] || PALETTES.signature
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

  const handleDownloadPDF = async () => {
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

    let contactHtml = ''
    if (settings?.businessAddress) contactHtml += `<p>${escapeHtml(settings.businessAddress)}</p>`
    if (settings?.businessPhone) contactHtml += `<p><strong>Tel:</strong> ${escapeHtml(settings.businessPhone)}</p>`
    if (settings?.businessEmail) contactHtml += `<p><strong>Email:</strong> ${escapeHtml(settings.businessEmail)}</p>`

    const rows = orderItems.map((it, idx) => {
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

    const expiryDays = settings?.general?.quotationExpiryDays || 7
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
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${brandColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79(19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.3-2.3a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
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
        <h2 style="text-align: center; font-size: 30px; font-weight: 700; letter-spacing: 8px; margin-bottom: 45px; color: ${brandColor};">QUOTATION</h2>

        <!-- Details Grid -->
        <div class="details-grid" style="display: flex; justify-content: space-between; margin-bottom: 35px; border-top: 1px solid #eee; padding-top: 20px;">
          <div class="details-col" style="width: 48%;">
            <div style="font-size: 11px; font-weight: 800; color: #000; text-transform: uppercase; margin-bottom: 10px; border-bottom: 2px solid ${brandColor}; display: inline-block; padding-bottom: 2px;">To</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 80px; display: inline-block; color: #777;">Name</span>: <strong>${escapeHtml(safeQuotation.customerName)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 80px; display: inline-block; color: #777;">Address</span>: <span style="font-weight: 600;">${escapeHtml(safeQuotation.address)}</span></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 80px; display: inline-block; color: #777;">WhatsApp</span>: <strong>${escapeHtml(safeQuotation.whatsapp || safeQuotation.phone)}</strong></div>
          </div>
          <div class="details-col" style="width: 40%;">
            <div style="font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #efefef; padding-bottom: 4px;">Quotation Details</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Quotation No.</span>: <strong>#${escapeHtml(safeQuotation.id)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Date</span>: <strong>${escapeHtml(safeQuotation.createdDate)}</strong></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><span style="width: 100px; display: inline-block; color: #777;">Valid Until</span>: <strong>${escapeHtml(safeQuotation.expiryDate)}</strong></div>
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
              <span style="font-weight: 700;">Rs. ${subtotal.toFixed(2)}</span>
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
            <div style="height: 1px; background-color: #efefef; margin: 10px 0;"></div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: 800; color: ${brandColor};">
              <span>Total Quotation</span>
              <span>Rs. ${finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <!-- Notice -->
        <div style="background-color: #fff9eb; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 40px;">
          <div style="font-size: 13px; color: #92400e; font-weight: 600;">Notice:</div>
          <div style="font-size: 12px; color: #92400e; margin-top: 2px;">This quotation is valid for ${expiryDays} days from the generated date.</div>
        </div>

        <div style="border-top: 1px solid #efefef; margin-top: 50px; padding-top: 30px; text-align: center;">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #444; margin-bottom: 8px;">Thank you for your business!</p>
          <p style="margin: 5px 0 0 0; font-size: 11px; color: #aaa; font-weight: 500;">Powered by AllSet Business Management App</p>
        </div>
      </div>
    `

    const fileName = `Quotation_${safeQuotation.id}.pdf`
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
        await Filesystem.writeFile({ path, data: pdfBase64, directory: Directory.Documents })
        const fileUri = await Filesystem.getUri({ directory: Directory.Documents, path })
        await FileOpener.open({ fileUri: fileUri.uri })
        addToast('Quotation saved and opened', 'success')
      } else if (window.electronAPI) {
        const result = await window.electronAPI.savePdfToTemp(pdfBase64, fileName)
        if (result.success) {
          addToast('Opening in external viewer...', 'success')
        } else {
          throw new Error(result.error)
        }
      } else {
        await html2pdf().from(invoiceHTML).set(opt).save()
        addToast('Quotation downloaded', 'success')
      }
    } catch (error) {
      console.error('PDF Generation Error:', error)
      addToast('Failed to generate PDF: ' + error.message, 'error')
    }
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
