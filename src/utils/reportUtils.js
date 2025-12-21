import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO, format, differenceInDays } from 'date-fns'

// --- General Helpers ---

export const formatCurrency = (amount) => {
    return `Rs. ${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const filterByDateRange = (data, dateField, startDate, endDate) => {
    if (!startDate || !endDate) return data
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    return data.filter(item => {
        const d = new Date(item[dateField])
        return d >= start && d <= end
    })
}

// --- Sales Calculations ---

export const calculateSalesMetrics = (orders) => {
    const paidOrders = orders.filter(o => o.paymentStatus === 'Paid')
    const revenue = paidOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
    const totalOrders = orders.length

    // Group by channel
    const salesByChannel = orders.reduce((acc, order) => {
        const source = (order.orderSource || 'Organic').trim()
        acc[source] = (acc[source] || 0) + 1
        return acc
    }, {})

    // Transform for Recharts
    const channelData = Object.entries(salesByChannel).map(([name, value]) => ({ name, value }))

    return { revenue, totalOrders, channelData }
}

export const getTopSellingProducts = (orders, inventory = [], products = { categories: [] }) => {
    const productStats = {}

    // Helper to get category name from products list
    const getCategoryName = (id) => {
        if (!id) return null;
        const category = products.categories.find(c => c.id === id);
        return category ? category.name : null;
    }

    // Helper to get item name from products list
    const getItemName = (categoryId, itemId) => {
        if (!categoryId || !itemId) return null;
        const category = products.categories.find(c => c.id === categoryId);
        if (!category || !category.items) return null;
        const item = category.items.find(i => i.id === itemId);
        return item ? item.name : null;
    }

    // Fallback: Create a lookup map for inventory items
    const inventoryMap = new Map();
    inventory.forEach(item => {
        if (item.id) {
            inventoryMap.set(item.id, {
                name: item.itemName,
                category: item.category
            });
        }
    });

    orders.forEach(order => {
        const items = order.orderItems || []
        // Handle legacy structure
        if (items.length === 0 && order.itemId) {
            items.push({
                itemId: order.itemId,
                categoryId: order.categoryId,
                customItemName: order.customItemName,
                quantity: order.quantity || 1,
                unitPrice: order.unitPrice || 0
            })
        }

        items.forEach(item => {
            let name = 'Unknown Product';
            let category = 'Uncategorized';
            let key = item.itemId || item.customItemName || 'unknown';

            // 1. Resolve Category
            // Try to resolve category ID from products list first (Most reliable for standard categories)
            const resolvedCategoryName = getCategoryName(item.categoryId);
            if (resolvedCategoryName) {
                category = resolvedCategoryName;
            } else if (item.categoryId) {
                // Format ID if not found in map (e.g. 'custom' -> 'Custom')
                category = item.categoryId.charAt(0).toUpperCase() + item.categoryId.slice(1);
            } else if (item.itemId && inventoryMap.has(item.itemId)) {
                // Fallback to inventory
                category = inventoryMap.get(item.itemId).category || 'Uncategorized';
            }

            // 2. Resolve Item Name
            // Prioritize what is recorded in the order (customItemName)
            if (item.customItemName) {
                name = item.customItemName;
            } else {
                // Try to resolve from products list
                const resolvedItemName = getItemName(item.categoryId, item.itemId);
                if (resolvedItemName) {
                    name = resolvedItemName;
                } else if (item.itemId && inventoryMap.has(item.itemId)) {
                    // Fallback to inventory
                    name = inventoryMap.get(item.itemId).name;
                } else if (item.itemId) {
                    name = 'Product ' + item.itemId;
                }
            }

            // Grouping Logic
            // If it's a standard product (has itemId), group by itemId. 
            // If it's custom (no itemId), group by name.
            if (item.itemId) {
                key = item.itemId;
            } else {
                key = name;
            }

            if (!productStats[key]) {
                productStats[key] = {
                    name: name,
                    category: category,
                    quantity: 0,
                    revenue: 0
                }
            }
            productStats[key].quantity += Number(item.quantity) || 0
            productStats[key].revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
        })
    })

    return Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 10)
}

// --- Expense Calculations ---

export const calculateExpenseMetrics = (expenses) => {
    const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const byCategory = expenses.reduce((acc, e) => {
        const cat = e.category || 'Other'
        acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0)
        return acc
    }, {})

    const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }))

    return { total, categoryData }
}

// --- Profitability ---

export const calculateProfitability = (orders, expenses) => {
    // 1. Net Profit (Cash Basis)
    const revenue = orders
        .filter(o => o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)

    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const netProfit = revenue - totalExpenses
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    return { netProfit, margin, revenue, totalExpenses }
}

export const calculateAverageBusinessMetrics = (orders, expenses) => {
    const paidOrdersEncoded = orders.filter(o => o.paymentStatus === 'Paid');
    const totalOrders = paidOrdersEncoded.length; // Use paid orders for revenue averaging to be accurate?? 
    // actually, for cost per order, maybe we should use *all* orders that are not cancelled?
    // Let's stick to "Valid" orders (not cancelled/returned) for the divisor to be safe.

    const validOrders = orders.filter(o => !['cancelled', 'returned'].includes(o.status?.toLowerCase()));
    const orderCount = validOrders.length;

    const { netProfit, revenue, totalExpenses } = calculateProfitability(orders, expenses);

    if (orderCount === 0) {
        return {
            avgRevenuePerOrder: 0,
            avgCostPerOrder: 0,
            avgProfitPerOrder: 0
        };
    }

    return {
        avgRevenuePerOrder: revenue / orderCount,
        avgCostPerOrder: totalExpenses / orderCount,
        avgProfitPerOrder: netProfit / orderCount
    };
}

export const getMonthlyFinancials = (orders, expenses) => {
    const data = {}

    // Revenue
    orders.forEach(o => {
        if (o.paymentStatus !== 'Paid') return
        const date = o.orderDate || o.createdDate
        if (!date) return
        const key = date.substring(0, 7)
        if (!data[key]) data[key] = { date: key, revenue: 0, expenses: 0, profit: 0 }
        data[key].revenue += Number(o.totalPrice) || 0
    })

    // Expenses
    expenses.forEach(e => {
        const date = e.date
        if (!date) return
        const key = date.substring(0, 7)
        if (!data[key]) data[key] = { date: key, revenue: 0, expenses: 0, profit: 0 }
        data[key].expenses += Number(e.amount) || 0
    })

    // Calculate Profit
    Object.values(data).forEach(item => {
        item.profit = item.revenue - item.expenses
    })

    return Object.values(data).sort((a, b) => a.date.localeCompare(b.date))
}

// --- Order Metrics ---

export const calculateOrderMetrics = (orders) => {
    const statusCounts = orders.reduce((acc, o) => {
        const s = o.status || 'New Order'
        acc[s] = (acc[s] || 0) + 1
        return acc
    }, {})

    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

    // Processing Time (Created -> Dispatched)
    let totalDays = 0
    let count = 0
    orders.forEach(o => {
        if (o.status === 'Dispatched' && o.createdDate && o.dispatchDate) {
            const days = differenceInDays(parseISO(o.dispatchDate), parseISO(o.createdDate))
            if (days >= 0) {
                totalDays += days
                count++
            }
        }
    })
    const avgProcessingTime = count > 0 ? (totalDays / count).toFixed(1) : 'N/A'

    return { statusData, avgProcessingTime }
}

export const calculateConsumptionTrends = (orders) => {
    // 1. Filter valid orders
    const validOrders = orders.filter(o =>
        !['cancelled', 'returned'].includes((o.status || '').toLowerCase())
    )

    // 2. Aggregate quantities by Item and Month
    // Map: "YYYY-MM" -> { "ItemName": Qty, ... }
    const monthlyUsage = {}
    const itemTotals = {}

    validOrders.forEach(order => {
        const date = order.orderDate || order.createdDate
        if (!date) return
        const monthKey = date.substring(0, 7) // YYYY-MM

        if (!monthlyUsage[monthKey]) monthlyUsage[monthKey] = { date: monthKey }

        const items = order.orderItems || []
        // Handle legacy single-item orders
        if (items.length === 0 && (order.itemId || order.customItemName)) {
            items.push({
                customItemName: order.customItemName || 'Unknown Item',
                quantity: order.quantity || 1
            })
        }

        items.forEach(item => {
            const name = item.customItemName || item.itemName || 'Unknown Item'
            const qty = Number(item.quantity) || 0

            monthlyUsage[monthKey][name] = (monthlyUsage[monthKey][name] || 0) + qty
            itemTotals[name] = (itemTotals[name] || 0) + qty
        })
    })

    // 3. Find Top 5 High-Demand Items to display
    const topItems = Object.entries(itemTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0])

    // 4. Transform for Recharts
    // Recharts needs array of objects, keys matching lines
    const chartData = Object.values(monthlyUsage).sort((a, b) => a.date.localeCompare(b.date))

    return { chartData, topItems }
}
