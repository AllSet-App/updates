import { useState, useEffect, useRef } from 'react'
import { getTrackingNumbers, getOrders } from '../utils/storage'
import { markTrackingNumberAsUsed } from '../utils/storage'

const TrackingNumberInput = ({ value, onChange, onBlur, disabled, required }) => {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [allTrackingNumbers, setAllTrackingNumbers] = useState([])
  const [assignedTrackingNumbers, setAssignedTrackingNumbers] = useState(new Set())
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Load tracking numbers and orders on mount
  useEffect(() => {
    const loadData = async () => {
      const [trackingNumbers, orders] = await Promise.all([
        getTrackingNumbers(),
        getOrders()
      ])
      
      // Get set of tracking numbers already assigned to orders
      const assigned = new Set()
      orders.forEach(order => {
        if (order.trackingNumber) {
          assigned.add(order.trackingNumber.toString())
        }
      })
      setAssignedTrackingNumbers(assigned)
      
      // Filter only available tracking numbers (not marked as used AND not assigned to orders)
      const available = trackingNumbers.filter(tn => {
        const tnNumber = tn.number?.toString() || ''
        return tn.status === 'available' && !assigned.has(tnNumber)
      })
      setAllTrackingNumbers(available)
    }
    loadData()
  }, [])

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(e)

    // Extract digits from the input
    const digitsOnly = newValue.replace(/\D/g, '')
    
    // Check if user typed at least 3 digits
    if (digitsOnly.length >= 3) {
      const lastThreeDigits = digitsOnly.slice(-3)
      
      // Filter tracking numbers where last 3 digits match and are not assigned
      const matching = allTrackingNumbers.filter(tn => {
        const tnNumber = tn.number?.toString() || ''
        // Skip if already assigned to an order
        if (assignedTrackingNumbers.has(tnNumber)) {
          return false
        }
        // Extract digits from tracking number
        const tnDigits = tnNumber.replace(/\D/g, '')
        return tnDigits.length >= 3 && tnDigits.slice(-3) === lastThreeDigits
      })
      
      if (matching.length > 0) {
        setSuggestions(matching.map(tn => tn.number))
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && showSuggestions && suggestions.length > 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[0])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  const handleSuggestionClick = async (suggestion) => {
    setInputValue(suggestion)
    const event = { target: { name: 'trackingNumber', value: suggestion } }
    onChange(event)
    setShowSuggestions(false)
    setSuggestions([])
    
    // Mark tracking number as used
    try {
      await markTrackingNumberAsUsed(suggestion)
      // Update local state to exclude this tracking number from future suggestions
      setAllTrackingNumbers(prev => prev.filter(tn => tn.number?.toString() !== suggestion))
      setAssignedTrackingNumbers(prev => new Set([...prev, suggestion]))
    } catch (error) {
      console.error('Error marking tracking number as used:', error)
    }
  }

  const handleBlur = () => {
    if (onBlur) {
      onBlur({ target: { name: 'trackingNumber', value: inputValue } })
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        name="trackingNumber"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true)
          }
        }}
        disabled={disabled}
        required={required}
        className="form-input"
        placeholder="Type last 3 digits for smart suggestions..."
        style={{ width: '100%' }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            marginTop: '0.25rem',
            zIndex: 1000,
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {suggestion}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Available
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TrackingNumberInput

