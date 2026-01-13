import React, { useState } from 'react'
import { AlertTriangle, Download, Zap, Smartphone, Monitor, Info, ShieldCheck, CheckCircle } from 'lucide-react'

const MandatoryUpdateModal = ({ info, onUpdate, progress, downloadStats }) => {
    if (!info) return null
    const [status, setStatus] = useState('available') // available, downloading, ready

    // Mock internal status logic (since hook controls actual download)
    // This component is purely presentation of the blocking state, 
    // relying on props for progress. If progress > 0, we can assume 'downloading'

    // Derived status based on props
    const isDownloading = progress > 0 && progress < 100
    const isReady = progress === 100

    const currentStatus = isReady ? 'ready' : (isDownloading ? 'downloading' : 'available')

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatSpeed = (bytesPerSec) => {
        return formatBytes(bytesPerSec) + '/s'
    }

    const handleAction = (platform = null) => {
        onUpdate(platform)
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '2rem'
        }}>
            <div className="updates-container animate-fade-in" style={{
                background: 'var(--bg-card)',
                borderRadius: '1.25rem',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                width: '100%',
                maxWidth: '550px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}>
                {/* Header */}
                <div className="updates-header" style={{
                    padding: '2rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.05) 0%, transparent 100%)',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 1.5rem',
                        background: 'rgba(255, 46, 54, 0.1)', // Red tint for mandatory
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 46, 54, 0.2)'
                    }}>
                        <AlertTriangle
                            size={32}
                            style={{ color: '#ef4444' }}
                        />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Mandatory Update Required</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '400px', margin: '0.5rem auto 0' }}>
                        The grace period for this update has expired. You must update to continue using AOF Biz.
                    </p>
                </div>

                {/* Content Area */}
                <div className="updates-content" style={{ padding: '2rem' }}>

                    {currentStatus === 'available' && (
                        <div className="update-info-card" style={{
                            border: '1px solid var(--accent-primary)',
                            padding: '1.5rem',
                            borderRadius: '1rem',
                            marginBottom: '1.5rem',
                            background: 'rgba(var(--accent-rgb), 0.02)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: 'var(--accent-primary)',
                                        color: '#fff'
                                    }}>
                                        <Zap size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>New Version Available</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Found version v{info.version}</p>
                                    </div>
                                </div>
                                <span style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '4px 12px',
                                    borderRadius: '100px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    Required
                                </span>
                            </div>

                            {info.release_notes && (
                                <div className="release-notes" style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    background: 'var(--bg-secondary)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border-color)',
                                    maxHeight: '120px',
                                    overflowY: 'auto'
                                }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                        <Info size={14} /> Release Notes
                                    </h4>
                                    <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                                        {info.release_notes}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(currentStatus === 'downloading' || currentStatus === 'ready') && (
                        <div className="download-status" style={{
                            padding: '1.5rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '1rem',
                            border: '1px solid var(--border-color)',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                    {currentStatus === 'downloading' ? 'Downloading Update...' : 'Ready to Install'}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {Math.round(progress)}%
                                </span>
                            </div>

                            {currentStatus === 'downloading' && downloadStats && (downloadStats.transferred > 0 || progress > 0) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <span>{formatBytes(downloadStats.transferred)} / {formatBytes(downloadStats.total)}</span>
                                    <span>{formatSpeed(downloadStats.speed)}</span>
                                </div>
                            )}

                            <div style={{
                                height: '10px',
                                background: 'var(--border-color)',
                                borderRadius: '5px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <div style={{
                                    height: '100%',
                                    background: 'var(--accent-primary)',
                                    width: `${progress}%`,
                                    transition: 'width 0.3s ease',
                                    boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.5)'
                                }}></div>
                            </div>
                            {currentStatus === 'ready' && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldCheck size={14} style={{ color: '#10b981' }} />
                                    Verification complete. App will restart automatically.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Main Action Buttons */}
                    <div className="update-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {currentStatus === 'available' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    onClick={() => handleAction('apk')}
                                    className="btn-hover-effect"
                                    style={{
                                        padding: '1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.75rem',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Smartphone size={24} />
                                    Update Mobile
                                </button>
                                <button
                                    onClick={() => handleAction('exe')}
                                    className="btn-hover-effect"
                                    style={{
                                        padding: '1rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.9rem',
                                        fontWeight: 700,
                                        background: 'var(--accent-primary)',
                                        border: 'none',
                                        borderRadius: '0.75rem',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Monitor size={24} />
                                    Update Desktop
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                {currentStatus === 'downloading' ? 'Please wait, do not close the application.' : 'Installing...'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .btn-hover-effect { transition: transform 0.2s, filter 0.2s; }
                .btn-hover-effect:hover { transform: translateY(-2px); filter: brightness(1.1); }
                .btn-hover-effect:active { transform: translateY(0); }
            `}</style>
        </div>
    )
}

export default MandatoryUpdateModal
