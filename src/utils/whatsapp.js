// WhatsApp utility functions

/**
 * Formats a phone number for WhatsApp with Sri Lanka country code (+94)
 * Takes the last 9 digits and prefixes with +94
 * 
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted number in format +94XXXXXXXXX
 * 
 * @example
 * formatWhatsAppNumber('0771234567') // Returns '+94771234567'
 * formatWhatsAppNumber('+94771234567') // Returns '+94771234567'
 * formatWhatsAppNumber('077 123 4567') // Returns '+94771234567'
 */
export const formatWhatsAppNumber = (phoneNumber) => {
  if (!phoneNumber) return ''

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '')

  // If it's already a full international number starting with 94
  if (digitsOnly.startsWith('94') && digitsOnly.length === 11) {
    return `+${digitsOnly}`
  }

  // If it's a local number with 0 (e.g., 0771234567)
  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `+94${digitsOnly.slice(1)}`
  }

  // If it's a local number without 0 (e.g., 771234567)
  if (digitsOnly.length === 9 && !digitsOnly.startsWith('0')) {
    return `+94${digitsOnly}`
  }

  // If it's already formatted with +94
  if (phoneNumber.startsWith('+94') && digitsOnly.length === 11) {
    return `+${digitsOnly}`
  }

  // While typing or for other formats, return the digits or the original
  // But if it's already longer than 11, it might be a different international number
  // For now, let's keep it simple for the primary market (SL)

  // If it's a partial number starting with 0, don't prepend +94 yet
  if (digitsOnly.startsWith('0')) {
    return digitsOnly
  }

  return phoneNumber
}

/**
 * Formats WhatsApp number for storage (keeps in international format)
 * This ensures consistency when saving to database
 */
export const formatWhatsAppForStorage = (phoneNumber) => {
  return formatWhatsAppNumber(phoneNumber)
}

/**
 * Generates a WhatsApp message from a template and order data
 * @param {string} template - The message template with placeholders
 * @param {object} order - The order data
 * @param {object} context - Additional calculated values (categoryName, itemName, quantity, finalPrice, codAmount, itemDetailsString)
 */
export const generateWhatsAppMessage = (template, order, context = {}) => {
  if (!template) return ''

  const replacements = {
    '{{order_id}}': order.id || '',
    '{{tracking_number}}': order.trackingNumber || 'N/A',
    '{{customer_name}}': order.customerName || '',
    '{{address}}': order.address || 'N/A',
    '{{phone}}': order.phone || 'N/A',
    '{{whatsapp}}': order.whatsapp || order.phone || 'N/A',
    '{{city}}': order.nearestCity || 'N/A',
    '{{district}}': order.district || 'N/A',
    '{{item_details}}': context.itemDetailsString || '',
    '{{subtotal}}': (context.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '{{total_price}}': (context.finalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '{{discount}}': (context.discountAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '{{delivery_charge}}': (context.deliveryCharge ?? 400).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '{{cod_amount}}': (context.codAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    '{{order_date}}': order.orderDate || order.createdDate || '',
    '{{delivery_date}}': order.deliveryDate || 'N/A',
    '{{dispatch_date}}': order.dispatchDate || 'N/A',
    '{{status}}': order.status || '',
    '{{payment_status}}': order.paymentStatus || '',
    '{{notes}}': order.notes || 'N/A',
    '{{source}}': order.orderSource || 'N/A'
  }

  let finalMessage = template
  Object.entries(replacements).forEach(([key, value]) => {
    // Escape special regex characters in the key if needed, or use replaceAll
    finalMessage = finalMessage.split(key).join(value)
  })

  return finalMessage
}
