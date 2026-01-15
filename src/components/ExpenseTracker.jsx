import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit, Trash2, Filter } from 'lucide-react'
import CustomDropdown from './Common/CustomDropdown'
import CollapsibleDateFilter from './Common/CollapsibleDateFilter'
import ExpenseForm from './ExpenseForm'
import { saveExpenses } from '../utils/storage'
import { getMonthlyExpenses, getCategoryBreakdown } from '../utils/calculations'
import { formatCurrency } from '../utils/reportUtils'
import BaseDonutChart from './Common/Charts/BaseDonutChart'
import { COLORS } from './Reports/ChartConfig'
import ConfirmationModal from './ConfirmationModal'
import Pagination from './Common/Pagination'
import { useToast } from './Toast/ToastContext'
import ProFeatureLock from './ProFeatureLock'
import { useLicensing } from './LicensingContext'
import { format, startOfMonth, endOfMonth, parse, isWithinInterval } from 'date-fns'

const ExpenseTracker = ({ expenses, onUpdateExpenses, triggerFormOpen, inventory, onUpdateInventory }) => {
  const { addToast } = useToast()
  const { isFreeUser } = useLicensing()
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Date Filter State
  const [filterType, setFilterType] = useState(() => localStorage.getItem('allset_expenses_filter_type') || 'month')
  const [selectedMonth, setSelectedMonth] = useState(() => localStorage.getItem('allset_expenses_selected_month') || format(new Date(), 'yyyy-MM'))
  const [startDate, setStartDate] = useState(() => localStorage.getItem('allset_expenses_start_date') || format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => localStorage.getItem('allset_expenses_end_date') || format(endOfMonth(new Date()), 'yyyy-MM-dd'))

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

  // Handle external form trigger (only when triggerFormOpen > 0)
  useEffect(() => {
    if (triggerFormOpen && triggerFormOpen > 0) {
      setEditingExpense(null)
      setShowForm(true)
    }
  }, [triggerFormOpen])

  // Persist date filter state
  useEffect(() => {
    localStorage.setItem('allset_expenses_filter_type', filterType)
  }, [filterType])

  useEffect(() => {
    localStorage.setItem('allset_expenses_selected_month', selectedMonth)
  }, [selectedMonth])

  useEffect(() => {
    localStorage.setItem('allset_expenses_start_date', startDate)
  }, [startDate])

  useEffect(() => {
    localStorage.setItem('allset_expenses_end_date', endDate)
  }, [endDate])

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  const monthlyExpenses = useMemo(() => {
    return getMonthlyExpenses(expenses, currentMonth, currentYear)
  }, [expenses, currentMonth, currentYear])

  const categoryBreakdown = useMemo(() => {
    return getCategoryBreakdown(monthlyExpenses)
  }, [monthlyExpenses])

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses]

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter)
    }

    // Date filtering
    filtered = filtered.filter(expense => {
      if (!expense.date) return true
      try {
        const expenseDate = parse(expense.date, 'yyyy-MM-dd', new Date())

        if (filterType === 'month') {
          const monthStart = startOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()))
          const monthEnd = endOfMonth(parse(selectedMonth, 'yyyy-MM', new Date()))
          return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd })
        } else {
          const rangeStart = parse(startDate, 'yyyy-MM-dd', new Date())
          const rangeEnd = parse(endDate, 'yyyy-MM-dd', new Date())
          return isWithinInterval(expenseDate, { start: rangeStart, end: rangeEnd })
        }
      } catch (error) {
        return true
      }
    })

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [expenses, categoryFilter, filterType, selectedMonth, startDate, endDate])

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const currentExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredExpenses.slice(start, start + itemsPerPage)
  }, [filteredExpenses, currentPage])

  const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

  const pieChartData = Object.entries(categoryBreakdown).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  }))



  const handleSaveExpense = async (expenseData) => {
    try {
      let updatedExpenses
      if (editingExpense) {
        updatedExpenses = expenses.map(expense =>
          expense.id === expenseData.id ? expenseData : expense
        )
      } else {
        updatedExpenses = [...expenses, expenseData]
      }

      const saveSuccess = await saveExpenses(updatedExpenses)
      if (saveSuccess) {
        onUpdateExpenses(updatedExpenses)
        setEditingExpense(null)
        addToast(editingExpense ? 'Expense updated successfully' : 'Expense added successfully', 'success')
      } else {
        addToast('Failed to save expense. Please try again.', 'error')
        console.error('Failed to save expense to Supabase')
      }
    } catch (error) {
      console.error('Error saving expense:', error)
      addToast('Error saving expense: ' + error.message, 'error')
    }
  }

  const handleDelete = (expenseId) => {
    showConfirm('Delete Expense', 'Are you sure you want to delete this expense?', async () => {
      try {
        // Find the expense being deleted
        const expenseToDelete = expenses.find(expense => expense.id === expenseId)

        // If expense is linked to inventory, deduct the quantity from inventory stock
        if (expenseToDelete?.inventoryItemId && expenseToDelete?.quantity && inventory && onUpdateInventory) {
          const item = inventory.find(inv => inv.id === expenseToDelete.inventoryItemId)
          if (item) {
            const quantity = parseFloat(expenseToDelete.quantity) || 0
            const updatedInventory = inventory.map(inv =>
              inv.id === expenseToDelete.inventoryItemId
                ? { ...inv, currentStock: Math.max(0, inv.currentStock - quantity) } // Ensure stock doesn't go below 0
                : inv
            )
            const { saveInventory } = await import('../utils/storage')
            const inventorySaveSuccess = await saveInventory(updatedInventory)
            if (inventorySaveSuccess) {
              onUpdateInventory(updatedInventory)
            } else {
              console.error('Failed to update inventory stock')
              // Continue with expense deletion even if inventory update fails
            }
          }
        }

        // Delete the expense
        const updatedExpenses = expenses.filter(expense => expense.id !== expenseId)
        const saveSuccess = await saveExpenses(updatedExpenses)
        if (saveSuccess) {
          onUpdateExpenses(updatedExpenses)
          addToast('Expense deleted successfully', 'success')
        } else {
          addToast('Failed to delete expense. Please try again.', 'error')
          console.error('Failed to delete expense from Supabase')
        }
      } catch (error) {
        console.error('Error deleting expense:', error)
        addToast('Error deleting expense: ' + error.message, 'error')
      }
    }, 'danger', 'Delete')
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const content = (
    <div>
      <style>{`
        @media (max-width: 600px) {
          .expense-tracker-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 1rem !important;
          }
          .expense-tracker-header div {
            width: 100%;
          }
          .expense-tracker-header .btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .filters-container {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          .filters-container > div, .filters-container > select {
            width: 100% !important;
          }
          .summary-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 480px) {
          .expense-table-desktop {
            display: none !important;
          }
          .expense-mobile-list {
            display: block !important;
          }
          .expense-mobile-card {
            background: var(--bg-secondary);
            padding: 1rem;
            border-radius: var(--radius);
            margin-bottom: 1rem;
            border: 1px solid var(--border-color);
          }
          .expense-mobile-card-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
          }
        }

        @media (min-width: 481px) {
          .expense-mobile-list {
            display: none !important;
          }
        }
      `}</style>

      <div className="header-container expense-tracker-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>
            Expense Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Track and manage business expenses
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingExpense(null)
              setShowForm(true)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="filters-container" style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <CustomDropdown
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'Material', label: 'Material' },
              { value: 'Operational', label: 'Operational' },
              { value: 'Transport', label: 'Transport' },
              { value: 'Utilities', label: 'Utilities' },
              { value: 'Other', label: 'Other' }
            ]}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
        <CollapsibleDateFilter
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          startDate={startDate}
          endDate={endDate}
          onRangeChange={({ startDate: newStart, endDate: newEnd }) => {
            if (newStart) setStartDate(newStart)
            if (newEnd) setEndDate(newEnd)
          }}
          onReset={() => {
            setFilterType('month')
            setSelectedMonth(format(new Date(), 'yyyy-MM'))
            setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
            setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
          }}
          align="right"
        />
      </div>

      {/* Summary Cards */}
      <div className="summary-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div className="card">
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}>
            Monthly Total
          </p>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            Rs.{monthlyTotal.toLocaleString('en-IN')}
          </h3>
        </div>
        <div className="card">
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            marginBottom: '0.5rem'
          }}>
            Total Expenses
          </p>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)'
          }}>
            Rs.{expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0).toLocaleString('en-IN')}
          </h3>
        </div>
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Category Breakdown Pie Chart */}
        <div className="card">
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '1rem',
            color: 'var(--text-primary)'
          }}>
            Category Breakdown (This Month)
          </h3>
          {pieChartData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No expenses this month
            </p>
          ) : (
            <div style={{ width: '100%', height: 300 }}>
              <BaseDonutChart
                data={pieChartData}
                centerLabel="Monthly Total"
                centerValue={formatCurrency(monthlyTotal)}
                height={300}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expenses List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredExpenses.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No expenses found. Add your first expense to get started.</p>
          </div>
        ) : (
          <>
            <div className="expense-table-desktop" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{new Date(expense.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 500 }}>{expense.item || expense.description}</td>
                      <td>
                        {expense.category && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}>
                            {expense.category}
                          </span>
                        )}
                      </td>
                      <td>{expense.quantity || '-'}</td>
                      <td>{expense.unitCost ? `Rs.${expense.unitCost.toLocaleString('en-IN')}` : '-'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        Rs.{(expense.total || expense.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(expense.id)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="expense-mobile-list" style={{ padding: '1rem' }}>
              {currentExpenses.map((expense) => (
                <div key={expense.id + '-mobile'} className="expense-mobile-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{expense.item || expense.description}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(expense.date).toLocaleDateString('en-IN')}</div>
                  </div>
                  <div className="expense-mobile-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                    <span>{expense.category || '-'}</span>
                  </div>
                  {(expense.quantity || expense.unitCost) && (
                    <div className="expense-mobile-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Details:</span>
                      <span>{expense.quantity || 1} x Rs.{(expense.unitCost || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="expense-mobile-card-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ fontWeight: 600 }}>Total:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>Rs.{(expense.total || expense.amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleEdit(expense)}>
                      <Edit size={14} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleDelete(expense.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredExpenses.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredExpenses.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredExpenses.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </>
        )}
      </div>

      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onClose={() => {
            setShowForm(false)
            setEditingExpense(null)
          }}
          onSave={handleSaveExpense}
          inventory={inventory}
          onUpdateInventory={onUpdateInventory}
        />
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

  // If Free user, wrap with ProFeatureLock
  if (isFreeUser) {
    return (
      <ProFeatureLock
        featureName="Expense Tracking"
        showContent={false}
        features={[
          "Comprehensive Expense Logging",
          "Category-wise Spending Breakdown",
          "Monthly Cost Analysis Charts",
          "Linked Inventory Cost Tracking"
        ]}
      >
        {content}
      </ProFeatureLock>
    )
  }

  return content
}

export default ExpenseTracker
