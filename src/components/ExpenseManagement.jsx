import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Save, X, DollarSign, Tag } from 'lucide-react'
import { getExpenseCategories, saveExpenseCategories } from '../utils/storage'
import ConfirmationModal from './ConfirmationModal'
import { useToast } from './Toast/ToastContext'

const ExpenseManagement = () => {
  const { addToast } = useToast()
  const [expenseCategories, setExpenseCategories] = useState({ categories: [] })
  const [editingCategory, setEditingCategory] = useState(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [categoryFormData, setCategoryFormData] = useState({ name: '' })
  const [editingItem, setEditingItem] = useState(null) // { categoryId, itemId }
  const [itemFormData, setItemFormData] = useState({ name: '' })

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

  const showConfirm = (title, message, onConfirm, type = 'default', confirmText = 'Confirm') => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
      isAlert: false,
      confirmText
    })
  }

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }))
  }

  useEffect(() => {
    loadExpenseCategories()
  }, [])

  const loadExpenseCategories = async () => {
    const data = await getExpenseCategories()
    setExpenseCategories(data)
    // Initialize expanded state for all categories
    const expanded = {}
    if (data && data.categories) {
      data.categories.forEach(cat => {
        expanded[cat.id] = false
      })
    }
    setExpandedCategories(expanded)
  }

  const saveCategories = async (data) => {
    const success = await saveExpenseCategories(data)
    if (!success) {
      addToast('Error saving expense categories. Please try again.', 'error')
    }
    return success
  }

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const handleAddCategory = () => {
    setCategoryFormData({ name: '' })
    setEditingCategory(null)
    setShowCategoryForm(true)
  }

  const handleEditCategory = (category) => {
    setCategoryFormData({ name: category.name })
    setEditingCategory(category.id)
    setShowCategoryForm(true)
  }

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      addToast('Please enter a category name', 'warning')
      return
    }

    const updated = { ...expenseCategories }

    if (editingCategory) {
      // Edit existing category
      const categoryIndex = updated.categories.findIndex(cat => cat.id === editingCategory)
      if (categoryIndex !== -1) {
        updated.categories[categoryIndex].name = categoryFormData.name.trim()
        updated.categories[categoryIndex].items = Array.isArray(updated.categories[categoryIndex].items)
          ? updated.categories[categoryIndex].items
          : []
      }
    } else {
      // Add new category
      updated.categories.push({
        id: generateId(),
        name: categoryFormData.name.trim(),
        items: []
      })
    }

    if (await saveCategories(updated)) {
      setExpenseCategories(updated)
      // Auto-expand newly added category
      if (!editingCategory) {
        const newCategory = updated.categories[updated.categories.length - 1]
        setExpandedCategories(prev => ({
          ...prev,
          [newCategory.id]: true
        }))
      }
      setShowCategoryForm(false)
      setCategoryFormData({ name: '' })
      setEditingCategory(null)
      addToast(editingCategory ? 'Category updated successfully' : 'Category added successfully', 'success')
    }
  }

  const handleDeleteCategory = (categoryId) => {
    showConfirm('Delete Category', 'Are you sure you want to delete this category?', async () => {
      const updated = { ...expenseCategories }
      updated.categories = updated.categories.filter(cat => cat.id !== categoryId)
      if (await saveCategories(updated)) {
        setExpenseCategories(updated)
        addToast('Category deleted successfully', 'success')
      } else {
        addToast('Error deleting category. Please try again.', 'error')
      }
    }, 'danger', 'Delete')
  }

  // ===== Items inside categories (e.g., Ads -> FB Ads, Google Ads) =====
  const handleAddItem = (categoryId) => {
    setEditingItem({ categoryId, itemId: null })
    setItemFormData({ name: '' })
  }

  const handleEditItem = (categoryId, item) => {
    setEditingItem({ categoryId, itemId: item.id })
    setItemFormData({ name: item.name })
  }

  const handleCancelItem = () => {
    setEditingItem(null)
    setItemFormData({ name: '' })
  }

  const handleSaveItem = async () => {
    const categoryId = editingItem?.categoryId
    if (!categoryId) return
    const name = (itemFormData.name || '').trim()
    if (!name) {
      addToast('Please enter an item name', 'warning')
      return
    }

    const updated = { ...expenseCategories }
    const categoryIndex = updated.categories.findIndex(c => c.id === categoryId)
    if (categoryIndex === -1) return
    const cat = updated.categories[categoryIndex]
    cat.items = Array.isArray(cat.items) ? cat.items : []

    const exists = cat.items.some(it =>
      (it.name || '').toLowerCase() === name.toLowerCase() && it.id !== editingItem.itemId
    )
    if (exists) {
      addToast('That item already exists in this category.', 'warning')
      return
    }

    if (editingItem.itemId) {
      cat.items = cat.items.map(it => it.id === editingItem.itemId ? { ...it, name } : it)
    } else {
      cat.items = [...cat.items, { id: generateId(), name }]
    }

    if (await saveCategories(updated)) {
      setExpenseCategories(updated)
      handleCancelItem()
      addToast(editingItem.itemId ? 'Item updated successfully' : 'Item added successfully', 'success')
    }
  }

  const handleDeleteItem = (categoryId, itemId) => {
    showConfirm('Delete Item', 'Are you sure you want to delete this item?', async () => {
      const updated = { ...expenseCategories }
      const categoryIndex = updated.categories.findIndex(c => c.id === categoryId)
      if (categoryIndex === -1) return
      const cat = updated.categories[categoryIndex]
      cat.items = (Array.isArray(cat.items) ? cat.items : []).filter(it => it.id !== itemId)
      if (await saveCategories(updated)) {
        setExpenseCategories(updated)
        addToast('Item deleted successfully', 'success')
      }
    }, 'danger', 'Delete')
  }

  return (
    <div>
      <style>{`
        @media (max-width: 520px) {
          .expense-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .expense-header div {
            width: 100%;
          }
          .expense-header .btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .category-header-actions {
            flex-wrap: wrap !important;
          }
        }
        
        @media (max-width: 480px) {
          .items-table th:nth-child(2),
          .items-table td:nth-child(2) {
            width: auto !important;
          }
          .category-card-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .category-header-actions {
            width: 100% !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      {/* Header with Add Category Button */}
      <div className="header-container expense-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '0.5rem'
          }}>
            Expense Management
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Manage expense categories
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleAddCategory}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryForm(false)
                  setCategoryFormData({ name: '' })
                  setEditingCategory(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ name: e.target.value })}
                placeholder="e.g., Material, Operational, Transport"
                className="form-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCategory()
                  if (e.key === 'Escape') {
                    setShowCategoryForm(false)
                    setCategoryFormData({ name: '' })
                    setEditingCategory(null)
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setShowCategoryForm(false)
                  setCategoryFormData({ name: '' })
                  setEditingCategory(null)
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Save size={18} />
                {editingCategory ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      {expenseCategories.categories.length === 0 ? (
        <div className="card" style={{
          padding: '3rem',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <DollarSign size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No categories yet</p>
          <p style={{ fontSize: '0.875rem' }}>Click "Add Category" to get started</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {expenseCategories.categories.map((category) => (
            <div key={category.id} className="card">
              {/* Category Header */}
              <div className="category-card-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flex: 1
                }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                    <DollarSign size={20} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      margin: 0
                    }}>
                      {category.name}
                    </h3>
                  </div>
                </div>
                <div className="category-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.4rem' }}
                    title="Show/Hide Items"
                  >
                    <Tag size={16} />
                  </button>
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.4rem' }}
                    title="Edit Category"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.4rem' }}
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedCategories[category.id] && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>
                      CATEGORY ITEMS
                    </p>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddItem(category.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} />
                      Add Item
                    </button>
                  </div>

                  {editingItem?.categoryId === category.id && (
                    <div className="card" style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', padding: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Item Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={itemFormData.name}
                          onChange={(e) => setItemFormData({ name: e.target.value })}
                          placeholder="e.g., FB Ads, Google Ads"
                          autoFocus
                          style={{ fontSize: '0.9rem' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveItem()
                            if (e.key === 'Escape') handleCancelItem()
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={handleCancelItem}>Cancel</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveItem}>Save</button>
                      </div>
                    </div>
                  )}

                  {(Array.isArray(category.items) ? category.items : []).length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                      No items defined yet for this category.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="items-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Item Name</th>
                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right', width: '120px', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(category.items) ? category.items : []).map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.name}</td>
                              <td style={{ padding: '0.8rem 0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                  <button className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }} onClick={() => handleEditItem(category.id, item)}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="btn btn-danger btn-sm" style={{ padding: '0.35rem' }} onClick={() => handleDeleteItem(category.id, item.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        isAlert={modalConfig.isAlert}
        confirmText={modalConfig.confirmText}
      />
    </div>
  )
}

export default ExpenseManagement
