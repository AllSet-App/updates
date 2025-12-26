import { useState, useEffect } from 'react'
import { X, Loader, Truck, RefreshCw } from 'lucide-react'
import { markTrackingNumberAsUsed, getSettings } from '../utils/storage'
import TrackingNumberInput from './TrackingNumberInput'
import { useToast } from './Toast/ToastContext'
import { curfoxService } from '../utils/curfox'

const DispatchModal = ({ order, onClose, onSave }) => {
  const { addToast } = useToast()
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
  const [formData, setFormData] = useState({
    status: order?.status || 'Dispatched',
    dispatchDate: order?.dispatchDate || new Date().toISOString().split('T')[0],
    trackingNumber: order?.trackingNumber || ''
  })

  const [isCurfoxEnabled, setIsCurfoxEnabled] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    getSettings().then(settings => {
      if (settings?.curfox?.enabled) {
        setIsCurfoxEnabled(true)
      }
    })
  }, [])

  const handleGenerateWaybill = async () => {
    setIsGenerating(true)
    try {
      const waybill = await curfoxService.createOrder(order)
      if (waybill) {
        setFormData(prev => ({ ...prev, trackingNumber: waybill }))
        addToast('Waybill generated successfully!', 'success')
      } else {
        addToast('Failed to generate waybill details', 'error')
      }
    } catch (error) {
      addToast('Error generating waybill: ' + error.message, 'error')
    }
    setIsGenerating(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const updatedOrder = {
      ...order,
      ...formData,
      status: 'Dispatched'
    }

    // 1. Save order first
    const success = await onSave(updatedOrder)

    if (success) {
      try {
        // 2. Only mark as used if save was successful
        if (updatedOrder.trackingNumber && (!order?.trackingNumber || order.trackingNumber !== updatedOrder.trackingNumber)) {
          await markTrackingNumberAsUsed(updatedOrder.trackingNumber)
        }
      } catch (error) {
        console.error('Error marking tracking number as used:', error)
        addToast('Error marking tracking number as used', 'error')
      }

      addToast('Order dispatched successfully', 'success')
      onClose()
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Update Dispatch & Tracking</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Customer</label>
            <input
              type="text"
              className="form-input"
              value={order?.customerName || ''}
              readOnly
              style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Order ID</label>
            <input
              type="text"
              className="form-input"
              value={order?.id || ''}
              readOnly
              style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dispatch Date *</label>
            <input
              type="date"
              name="dispatchDate"
              className="form-input"
              value={formData.dispatchDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tracking Number *</label>
            {isCurfoxEnabled ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={formData.trackingNumber}
                  onChange={handleChange}
                  name="trackingNumber"
                  placeholder="Generated Waybill Number"
                  readOnly={!!formData.trackingNumber} // Lock if generated, but allow manual if empty/error
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleGenerateWaybill}
                  disabled={isGenerating || !!formData.trackingNumber}
                  title="Generate Waybill via Curfox"
                >
                  {isGenerating ? <Loader size={18} className="spin" /> : <Truck size={18} />}
                </button>
                {formData.trackingNumber && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setFormData(prev => ({ ...prev, trackingNumber: '' }))}
                    title="Clear"
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
              </div>
            ) : (
              <TrackingNumberInput
                value={formData.trackingNumber}
                onChange={handleChange}
                required
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Update Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DispatchModal
