import { useState, useEffect } from 'react'
import { X, Package } from 'lucide-react'
import { getExpenseCategories, getInventoryCategories, getInventory } from '../utils/storage'

const ExpenseForm = ({ expense, onClose, onSave, inventory, onUpdateInventory }) => {
  const [expenseCategories, setExpenseCategories] = useState({ categories: [] })
  const [inventoryCategories, setInventoryCategories] = useState({ categories: [] })
  const [inventoryItems, setInventoryItems] = useState([])
  const [addToInventory, setAddToInventory] = useState(true) // Default checked
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [showItemDropdown, setShowItemDropdown] = useState(false)

  // Initialize form data
  const getInitialFormData = () => {
    if (expense) {
      return {
        date: expense.date || new Date().toISOString().split('T')[0],
        item: expense.item || expense.description || '',
        category: expense.category || '',
        quantity: expense.quantity || 1,
        unitCost: expense.unitCost || 0,
        total: expense.total || expense.amount || 0,
        inventoryItemId: expense.inventoryItemId || null
      }
    }
    return {
      date: new Date().toISOString().split('T')[0],
      item: '',
      category: '',
      quantity: 1,
      unitCost: 0,
      total: 0,
      inventoryItemId: null
    }
  }

  const [formData, setFormData] = useState(getInitialFormData())

  // Load categories and inventory on mount
  useEffect(() => {
    const loadData = async () => {
      const [expCategories, invCategories, invItems] = await Promise.all([
        getExpenseCategories(),
        getInventoryCategories(),
        getInventory()
      ])
      setExpenseCategories(expCategories)
      setInventoryCategories(invCategories)
      setInventoryItems(invItems)
    }
    loadData()
  }, [])

  // Filter inventory items by category
  const getFilteredInventoryItems = () => {
    if (!formData.category) return []
    return inventoryItems.filter(item => item.category === formData.category)
  }

  // Filter items by search query
  const getFilteredItems = () => {
    const filtered = getFilteredInventoryItems()
    if (!itemSearchQuery.trim()) return filtered
    const query = itemSearchQuery.toLowerCase()
    return filtered.filter(item => item.itemName.toLowerCase().includes(query))
  }

  // Items under selected expense category (when Add to Inventory is OFF)
  const getExpenseCategoryItems = () => {
    if (!formData.category) return []
    const cat = (expenseCategories.categories || []).find(c => c.name === formData.category)
    return Array.isArray(cat?.items) ? cat.items : []
  }

  const getFilteredExpenseItems = () => {
    const items = getExpenseCategoryItems()
    if (!itemSearchQuery.trim()) return items
    const query = itemSearchQuery.toLowerCase()
    return items.filter(it => (it.name || '').toLowerCase().includes(query))
  }

  // Update form data when expense changes (for edit mode)
  useEffect(() => {
    if (expense) {
      const initialData = {
        date: expense.date || new Date().toISOString().split('T')[0],
        item: expense.item || expense.description || '',
        category: expense.category || '',
        quantity: expense.quantity || 1,
        unitCost: expense.unitCost || 0,
        total: expense.total || expense.amount || 0,
        inventoryItemId: expense.inventoryItemId || null
      }
      setFormData(initialData)
      setTotalManuallyEdited(false)
      // Determine if this expense is linked to inventory
      if (expense.inventoryItemId) {
        setAddToInventory(true)
      }
    }
  }, [expense])

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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showItemDropdown && !e.target.closest('.form-group')) {
        setShowItemDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showItemDropdown])

  // Auto-calculate total when quantity or unitCost changes (only if total wasn't manually edited)
  const [totalManuallyEdited, setTotalManuallyEdited] = useState(false)
  
  useEffect(() => {
    if (!totalManuallyEdited) {
      const qty = parseFloat(formData.quantity) || 0
      const cost = parseFloat(formData.unitCost) || 0
      const calculatedTotal = qty * cost
      // Only update if the calculated total is different to avoid unnecessary re-renders
      if (parseFloat(formData.total) !== calculatedTotal) {
        setFormData(prev => ({ ...prev, total: calculatedTotal }))
      }
    }
  }, [formData.quantity, formData.unitCost, totalManuallyEdited, formData.total])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'total') {
      setTotalManuallyEdited(true)
      setFormData(prev => ({ ...prev, [name]: value }))
    } else if (name === 'quantity' || name === 'unitCost') {
      // Reset manual edit flag when quantity or unit cost changes
      setTotalManuallyEdited(false)
      setFormData(prev => ({ ...prev, [name]: value }))
    } else if (name === 'category') {
      // Reset item when category changes
      setFormData(prev => ({ ...prev, [name]: value, item: '', inventoryItemId: null }))
      setItemSearchQuery('')
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleToggleAddToInventory = () => {
    setAddToInventory(!addToInventory)
    // Reset category and item when toggling
    setFormData({ ...formData, category: '', item: '', inventoryItemId: null })
    setItemSearchQuery('')
  }

  const handleItemSelect = (item) => {
    if (addToInventory) {
      setFormData({
        ...formData,
        item: item.itemName,
        inventoryItemId: item.id,
        unitCost: item.unitCost || formData.unitCost
      })
      setItemSearchQuery(item.itemName)
    } else {
      setFormData({
        ...formData,
        item: item.name,
        inventoryItemId: null
      })
      setItemSearchQuery(item.name)
    }
    setShowItemDropdown(false)
  }

  const handleItemInputChange = (e) => {
    const value = e.target.value
    setItemSearchQuery(value)
    setFormData({ ...formData, item: value, inventoryItemId: null })
    setShowItemDropdown(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const expenseData = {
      date: formData.date,
      description: formData.item,
      item: formData.item,
      category: formData.category,
      quantity: parseFloat(formData.quantity) || 0,
      unitCost: parseFloat(formData.unitCost) || 0,
      amount: parseFloat(formData.total) || 0,
      total: parseFloat(formData.total) || 0,
      inventoryItemId: addToInventory && formData.inventoryItemId ? formData.inventoryItemId : null,
      id: expense?.id || Date.now().toString()
    }
    
    // Update inventory stock if linked to inventory item
    if (addToInventory && formData.inventoryItemId && inventory && onUpdateInventory) {
      const item = inventory.find(inv => inv.id === formData.inventoryItemId)
      if (item) {
        const quantity = parseFloat(formData.quantity) || 0
        const updatedInventory = inventory.map(inv =>
          inv.id === formData.inventoryItemId
            ? { ...inv, currentStock: inv.currentStock + quantity }
            : inv
        )
        const { saveInventory } = await import('../utils/storage')
        await saveInventory(updatedInventory)
        onUpdateInventory(updatedInventory)
      }
    }
    
    onSave(expenseData)
    onClose()
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              name="date"
              className="form-input"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Add to Inventory Toggle */}
          <div className="form-group">
            <button
              type="button"
              onClick={handleToggleAddToInventory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                border: `2px solid ${addToInventory ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius)',
                backgroundColor: addToInventory ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: addToInventory ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <Package size={18} />
              <span>{addToInventory ? 'Add to Inventory (Active)' : 'Add to Inventory (Inactive)'}</span>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              name="category"
              className="form-input"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select a category</option>
              {addToInventory
                ? inventoryCategories.categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))
                : expenseCategories.categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
            </select>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Item</label>
            {addToInventory ? (
              <>
                <input
                  type="text"
                  name="item"
                  className="form-input"
                  value={itemSearchQuery || formData.item}
                  onChange={handleItemInputChange}
                  onFocus={() => setShowItemDropdown(true)}
                  placeholder="Select or type item name"
                  autoComplete="off"
                />
                {showItemDropdown && formData.category && getFilteredItems().length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    marginTop: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    {getFilteredItems().map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {item.itemName}
                        {item.currentStock !== undefined && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                            (Stock: {item.currentStock})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  name="item"
                  className="form-input"
                  value={itemSearchQuery || formData.item}
                  onChange={handleItemInputChange}
                  onFocus={() => setShowItemDropdown(true)}
                  placeholder="Select or type item name"
                  autoComplete="off"
                />
                {showItemDropdown && formData.category && getFilteredExpenseItems().length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    marginTop: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}>
                    {getFilteredExpenseItems().map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        style={{
                          padding: '0.75rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {item.name}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity (Qty)</label>
              <input
                type="number"
                name="quantity"
                className="form-input"
                value={formData.quantity === 0 ? '' : formData.quantity}
                onChange={handleChange}
                onBlur={(e) => {
                  // Ensure value is a number on blur
                  const numValue = parseFloat(e.target.value) || 0
                  setFormData(prev => ({ ...prev, quantity: numValue }))
                }}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Cost</label>
              <input
                type="number"
                name="unitCost"
                className="form-input"
                value={formData.unitCost === 0 ? '' : formData.unitCost}
                onChange={handleChange}
                onBlur={(e) => {
                  // Ensure value is a number on blur
                  const numValue = parseFloat(e.target.value) || 0
                  setFormData(prev => ({ ...prev, unitCost: numValue }))
                }}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Total</label>
            <input
              type="number"
              name="total"
              className="form-input"
              value={formData.total}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              Auto-calculated (Qty × Unit Cost). You can edit if needed.
            </small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ExpenseForm
