import React, { useState, useEffect } from 'react'
import { AlertTriangle, Clock, ArrowRight, X } from 'lucide-react'

const MandatoryUpdateGracePopup = ({ info, timeRemaining, onUpdate, onClose }) => {
    if (!info || !timeRemaining || timeRemaining <= 0) return null

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999, // High but below Blocking Modal
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: 'var(--bg-card)',
                width: '100%',
                maxWidth: '450px',
                borderRadius: '1.5rem',
                border: '1px solid var(--border-color)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(255, 171, 0, 0.1) 0%, transparent 100%)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'rgba(255, 171, 0, 0.15)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--warning)'
                    }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Mandatory Update</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Action Required</p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem' }}>
                    <p style={{ margin: '0 0 1.5rem', lineHeight: '1.6', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        A mandatory update (v{info.version}) is available. To ensure the security and stability of your data, you must update soon.
                    </p>

                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '1rem',
                        borderRadius: '1rem',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <Clock size={20} style={{ color: 'var(--warning)' }} />
                        <div>
                            <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>TIME REMAINING</p>
                            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                                {hours}h {minutes}m
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.875rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.75rem',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="btn-hover-subtle"
                        >
                            Remind Later
                        </button>
                        <button
                            onClick={onUpdate}
                            style={{
                                padding: '0.875rem',
                                background: 'var(--accent-primary)',
                                border: 'none',
                                borderRadius: '0.75rem',
                                color: '#fff',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.3)'
                            }}
                            className="btn-hover-primary"
                        >
                            Update Now <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .btn-hover-subtle:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }
                .btn-hover-primary:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    )
}

export default MandatoryUpdateGracePopup
