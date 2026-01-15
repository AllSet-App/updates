import React from 'react'
import { Phone, Mail, MessageCircle, MapPin, Globe, Clock, Shield } from 'lucide-react'
import { useTheme } from './ThemeContext'

const Contact = () => {
    const { theme } = useTheme()

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Contact Support</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Need help? We're here for you. Reach out to us for any issues or to upgrade your plan.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                {/* Contact Card */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MessageCircle size={24} color="var(--accent-primary)" />
                        Get in Touch
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', height: 'fit-content' }}>
                                <Phone size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>WhatsApp & Phone</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Everyday from 8am to 5pm</p>
                                <a href="https://wa.me/94750350109" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 500, textDecoration: 'none' }}>
                                    +94 75 035 0109
                                </a>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', height: 'fit-content' }}>
                                <Mail size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>Email Support</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>We'll get back to you within 24 hours</p>
                                <a href="mailto:AllSethelp@gmail.com
" style={{ color: 'var(--accent-primary)', fontWeight: 500, textDecoration: 'none' }}>
                                    AllSethelp@gmail.com

                                </a>
                            </div>
                        </div>


                    </div>
                </div>

                {/* Pro / Help Card */}
                <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Shield size={24} color="var(--accent-primary)" />
                            Pro Support
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                            Pro users get priority support and access to advanced feature setup assistance. If you are facing issues with Curfox integration or advanced reporting, let us know directly.
                        </p>

                        <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Response Times</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Pro Users</span>
                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>&lt; 4 Hours</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Free Users</span>
                                <span style={{ fontWeight: 600 }}>24-48 Hours</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => window.open('https://wa.me/94750350109?text=I%20need%20priority%20support', '_blank')}>
                        Request Priority Support
                    </button>
                </div>

            </div>
        </div>
    )
}

export default Contact
