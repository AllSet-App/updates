import { Info, ShieldCheck, Heart, Globe, Github, Mail, Zap, ExternalLink } from 'lucide-react'
import { useLicensing } from './LicensingContext'
import { useTheme } from './ThemeContext'

const About = () => {
    const { isProUser, isTrialActive, timeLeft } = useLicensing()
    const { effectiveTheme } = useTheme()

    // Version should match package.json (usually v1.0.7 based on previous context)
    const APP_VERSION = 'v1.0.7'
    const RELEASE_DATE = 'January 2026'

    const openExternal = (url) => {
        if (window.electronAPI) {
            window.electronAPI.openExternal(url)
        } else {
            window.open(url, '_blank')
        }
    }

    const trialDaysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000))

    return (
        <div className="animate-scale-in" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '3rem 2rem',
                textAlign: 'center',
                boxShadow: 'var(--card-shadow)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative background blobs */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.1), transparent 70%)',
                    zIndex: 0
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <img
                        src={effectiveTheme === 'dark' ? './logo-dark.svg' : './logo.svg'}
                        alt="AOF Biz Logo"
                        style={{ width: '120px', height: '120px', marginBottom: '1.5rem' }}
                    />

                    <h1 style={{ marginBottom: '0.5rem', fontSize: '2.5rem' }}>AOF Biz</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem', fontStyle: 'italic' }}>
                        "From Chaos To Clarity"
                    </p>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginBottom: '3rem',
                        flexWrap: 'wrap'
                    }}>
                        <div style={capsuleStyle}>
                            <Info size={16} />
                            Version {APP_VERSION}
                        </div>
                        <div style={{
                            ...capsuleStyle,
                            backgroundColor: isProUser || isTrialActive ? 'rgba(var(--accent-rgb), 0.1)' : 'var(--bg-secondary)',
                            color: isProUser || isTrialActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                            borderColor: isProUser || isTrialActive ? 'var(--accent-primary)' : 'var(--border-color)'
                        }}>
                            {isProUser ? (
                                <><ShieldCheck size={16} /> Pro Active</>
                            ) : isTrialActive ? (
                                <><Zap size={16} /> Trial: {trialDaysLeft}d left</>
                            ) : (
                                <><Info size={16} /> Free Version</>
                            )}
                        </div>
                    </div>

                    <div style={{ textAlign: 'left', marginBottom: '3rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={20} color="var(--accent-primary)" />
                            The Mission
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            AOF Biz (Art of Frames Business Management) is designed to empower small to medium-sized creative businesses.
                            Our goal is to simplify order tracking, inventory management, and financial reporting so you can focus
                            on what truly matters: your craft.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '3rem'
                    }}>
                        <div style={statCardStyle}>
                            <Heart size={24} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
                            <h4 style={{ margin: '0.25rem 0' }}>Crafted with Love</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>For the makers & creators</p>
                        </div>
                        <div style={statCardStyle}>
                            <Globe size={24} color="var(--info)" style={{ marginBottom: '0.5rem' }} />
                            <h4 style={{ margin: '0.25rem 0' }}>Cloud Ready</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sync across all devices</p>
                        </div>
                        <div style={statCardStyle}>
                            <ShieldCheck size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
                            <h4 style={{ margin: '0.25rem 0' }}>Data Sovereignty</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your data, your control</p>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Stay connected with our development team
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                            <button onClick={() => openExternal('https://loojabrandings.com')} style={socialButtonStyle}>
                                <Globe size={20} />
                                <span>Website</span>
                            </button>
                            <button onClick={() => openExternal('https://github.com/loojabrandings')} style={socialButtonStyle}>
                                <Github size={20} />
                                <span>GitHub</span>
                            </button>
                            <button onClick={() => openExternal('mailto:loojabrandings@gmail.com')} style={socialButtonStyle}>
                                <Mail size={20} />
                                <span>Email</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <p style={{
                textAlign: 'center',
                marginTop: '2rem',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
            }}>
                Powered by AOF Biz © 2026
            </p>
        </div>
    )
}

const capsuleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1.25rem',
    borderRadius: '100px',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
}

const statCardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'transform 0.2s ease',
    cursor: 'default'
}

const socialButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    padding: '0.5rem',
    borderRadius: '10px'
}

export default About
