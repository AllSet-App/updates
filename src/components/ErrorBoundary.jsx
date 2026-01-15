import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Error Fallback UI Component
 * Displayed when an error is caught by the ErrorBoundary
 */
const ErrorFallback = ({ error, onRetry, onGoHome }) => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: '2rem'
        }}>
            <div style={{
                maxWidth: '500px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem 2rem',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--card-shadow)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <AlertTriangle size={40} color="var(--danger)" />
                </div>

                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '0.75rem'
                }}>
                    Something went wrong
                </h1>

                <p style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '1.5rem',
                    lineHeight: 1.6
                }}>
                    An unexpected error occurred. Don't worry, your data is safe.
                    Try refreshing the page or go back to the dashboard.
                </p>

                {error && (
                    <details style={{
                        textAlign: 'left',
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        <summary style={{
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontSize: '0.875rem',
                            fontWeight: 500
                        }}>
                            Technical Details
                        </summary>
                        <pre style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: 'var(--danger)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}>
                            {error.message || 'Unknown error'}
                        </pre>
                    </details>
                )}

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={onRetry}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <RefreshCw size={18} />
                        Refresh Page
                    </button>

                    <button
                        onClick={onGoHome}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Home size={18} />
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    )
}

/**
 * React Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console (could be sent to error reporting service)
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.setState({ errorInfo })
    }

    handleRetry = () => {
        // Reset state and reload
        this.setState({ hasError: false, error: null, errorInfo: null })
        window.location.reload()
    }

    handleGoHome = () => {
        // Reset state and navigate to dashboard
        this.setState({ hasError: false, error: null, errorInfo: null })
        localStorage.setItem('allset_active_view', 'dashboard')
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    onRetry={this.handleRetry}
                    onGoHome={this.handleGoHome}
                />
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
