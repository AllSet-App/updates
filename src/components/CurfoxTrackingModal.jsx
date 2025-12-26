import { useState, useEffect } from 'react'
import { X, RefreshCw, Truck, Calendar, MapPin, User, CheckCircle } from 'lucide-react'
import { curfoxService } from '../utils/curfox'
import { getSettings } from '../utils/storage'

const CurfoxTrackingModal = ({ order, onClose }) => {
    const [trackingData, setTrackingData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchTracking = async () => {
            try {
                setLoading(true)
                const settings = await getSettings()
                const authData = {
                    tenant: settings.curfox.tenant,
                    token: (await curfoxService.login(settings.curfox.email, settings.curfox.password, settings.curfox.tenant))?.token
                }

                if (!authData.token) throw new Error("Could not authenticate with Curfox")

                const data = await curfoxService.getTracking(order.trackingNumber, authData)
                console.log('Curfox Tracking Data Received:', data)
                setTrackingData(data)
            } catch (err) {
                console.error(err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (order?.trackingNumber) {
            fetchTracking()
        } else {
            setError("No tracking number found for this order")
            setLoading(false)
        }
    }, [order])

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={20} />
                        Tracking Info
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1rem 0' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                            <p>Fetching real-time status...</p>
                        </div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--danger)' }}>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Status</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.25rem' }}>
                                    {(() => {
                                        if (!trackingData) return 'Unknown'

                                        const getStatusText = (s) => {
                                            if (!s) return null
                                            if (typeof s === 'string') return s
                                            if (typeof s === 'object') return s.name || s.status_name || 'Update'
                                            return String(s)
                                        }

                                        // Case 1: trackingData is the array of events directly
                                        if (Array.isArray(trackingData)) {
                                            if (trackingData.length === 0) return 'No Status'
                                            const latest = trackingData[0]
                                            return getStatusText(latest.status_name) || getStatusText(latest.status) || 'Data Pending'
                                        }

                                        // Case 2: trackingData is an object
                                        return getStatusText(trackingData.current_status?.name) ||
                                            getStatusText(trackingData.status) ||
                                            (trackingData.events && getStatusText(trackingData.events[0]?.status_name)) ||
                                            'Unknown'
                                    })()}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                                    <span><strong>Waybill:</strong> {order.trackingNumber}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <User size={16} style={{ color: 'var(--text-muted)' }} />
                                    <span><strong>Customer:</strong> {order.customerName}</span>
                                </div>
                                {(() => {
                                    const city = trackingData?.destination_city ||
                                        (Array.isArray(trackingData) && trackingData[0]?.city) ||
                                        (trackingData?.events && trackingData.events[0]?.city)
                                    if (!city) return null
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                                            <span><strong>Destination:</strong> {city}</span>
                                        </div>
                                    )
                                })()}
                            </div>

                            {(() => {
                                const events = Array.isArray(trackingData) ? trackingData : trackingData?.events
                                if (!events || events.length === 0) return null

                                return (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>History</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                            {events.map((event, idx) => (
                                                <div key={idx} style={{ padding: '0.5rem', borderLeft: '2px solid var(--primary-light)', paddingLeft: '1rem', position: 'relative' }}>
                                                    <div style={{ position: 'absolute', left: '-5px', top: '10px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                                                    <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                                                        {(() => {
                                                            const s = event.status_name || event.status
                                                            if (typeof s === 'object') return s.name || s.status_name || 'Update'
                                                            return s
                                                        })()}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{event.created_at || event.time || event.date}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button className="btn btn-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CurfoxTrackingModal
