import React from 'react'
import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet
} from '@react-pdf/renderer'
import {
    LocationIcon,
    PhoneIcon,
    WhatsAppIcon,
    EmailIcon,
    WebsiteIcon,
    getPdfFontFamily,
    getPdfFontFamilyBold
} from './PdfIcons'

// Helper to ensure values are proper strings for Text components
const safeStr = (val) => {
    if (val === null || val === undefined) return 'N/A'
    if (typeof val === 'number') return String(val)
    if (typeof val === 'string') return val || 'N/A'
    return String(val)
}

// Create styles with theme color and font family
const createStyles = (themeColor, fontFamily = 'Helvetica', fontFamilyBold = 'Helvetica-Bold') => StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: fontFamily,
        color: '#000000'
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '50%'
    },
    logo: {
        width: 70,
        height: 70,
        objectFit: 'contain',
        marginRight: 15
    },
    brandingText: {
        flexDirection: 'column'
    },
    businessName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: themeColor,
        fontFamily: fontFamilyBold,
        marginBottom: 4
    },
    tagline: {
        fontSize: 10,
        color: '#888888'
    },
    headerRight: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxWidth: '50%'
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 4
    },
    contactText: {
        fontSize: 9,
        color: '#333333',
        textAlign: 'right',
        marginRight: 6
    },
    contactIconWrapper: {
        width: 14,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    // Title
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: themeColor,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: fontFamilyBold
    },
    // Info sections
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    infoBox: {
        width: '48%',
        padding: 12,
        backgroundColor: '#f8f8f8',
        borderRadius: 4
    },
    infoTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666666',
        marginBottom: 8,
        textTransform: 'uppercase',
        fontFamily: fontFamilyBold
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    infoLabel: {
        fontSize: 9,
        color: '#666666',
        width: 80
    },
    infoValue: {
        fontSize: 9,
        color: '#000000',
        flex: 1
    },
    // Items table
    table: {
        marginBottom: 20
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: themeColor,
        padding: 8,
        borderRadius: 4
    },
    tableHeaderCell: {
        color: '#ffffff',
        fontSize: 9,
        fontWeight: 'bold',
        fontFamily: fontFamilyBold
    },
    tableRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee'
    },
    tableCell: {
        fontSize: 9,
        color: '#333333'
    },
    itemNotes: {
        fontSize: 8,
        color: '#888888',
        marginTop: 2,
        fontStyle: 'italic'
    },
    colDescription: { width: '45%' },
    colQty: { width: '15%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colAmount: { width: '20%', textAlign: 'right' },
    // Totals
    totalsContainer: {
        marginLeft: 'auto',
        width: 250,
        marginTop: 10
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4
    },
    totalLabel: {
        fontSize: 10,
        color: '#666666'
    },
    totalValue: {
        fontSize: 10,
        color: '#000000'
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        marginTop: 4,
        borderTopWidth: 2,
        borderTopColor: themeColor
    },
    grandTotalLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: themeColor,
        fontFamily: fontFamilyBold
    },
    grandTotalValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: themeColor,
        fontFamily: fontFamilyBold
    },
    // Footer
    footer: {
        marginTop: 'auto',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#eeeeee'
    },
    thankYou: {
        fontSize: 14,
        fontWeight: 'bold',
        color: themeColor,
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: fontFamilyBold
    },
    poweredBy: {
        fontSize: 8,
        color: '#888888',
        textAlign: 'center'
    }
})

// Helper to get category/item names
const getItemDisplay = (item, products) => {
    const category = products?.categories?.find(c => c.id === item.categoryId)
    const categoryName = category?.name || 'N/A'

    let itemName = item.customItemName || item.name || item.itemName
    if (!itemName && category) {
        const productItem = category.items?.find(i => i.id === item.itemId)
        itemName = productItem?.name || 'N/A'
    }

    return { categoryName, itemName: itemName || 'N/A' }
}

const InvoicePdfDocument = ({ order, businessProfile, palette, products, fontFamily = 'modern' }) => {
    const themeColor = palette?.color || '#FF2E36'
    const pdfFont = getPdfFontFamily(fontFamily)
    const pdfFontBold = getPdfFontFamilyBold(fontFamily)
    const styles = createStyles(themeColor, pdfFont, pdfFontBold)

    // Calculate totals
    const orderItems = Array.isArray(order.orderItems) && order.orderItems.length > 0
        ? order.orderItems
        : [{
            categoryId: order.categoryId,
            itemId: order.itemId,
            customItemName: order.customItemName,
            quantity: order.quantity || 1,
            unitPrice: order.unitPrice || 0,
            notes: ''
        }]

    const subtotal = orderItems.reduce((sum, item) => {
        return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
    }, 0)

    const deliveryCharge = Number(order.deliveryCharge) || 0
    const discountType = order.discountType || 'Rs'
    const discount = Number(order.discount || order.discountValue) || 0
    const discountAmount = discountType === '%' ? (subtotal * discount) / 100 : discount
    const finalPrice = Math.max(0, subtotal - discountAmount)
    const advancePayment = Number(order.advancePayment) || 0
    const codAmount = order.codAmount || Math.max(0, finalPrice + deliveryCharge - advancePayment)

    // Payment method label
    const isCOD = (order.paymentMethod || 'COD').toUpperCase() === 'COD'
    const totalLabel = isCOD ? 'COD Amount' : 'Total'

    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString()
        } catch {
            return dateStr
        }
    }

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {businessProfile?.businessLogo && (
                            <Image src={businessProfile.businessLogo} style={styles.logo} />
                        )}
                        <View style={styles.brandingText}>
                            <Text style={styles.businessName}>
                                {businessProfile?.businessName || 'AllSet'}
                            </Text>
                            <Text style={styles.tagline}>
                                {businessProfile?.businessTagline || 'From Chaos to Clarity'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerRight}>
                        {businessProfile?.businessAddress ? (
                            <View style={styles.contactRow}>
                                <Text style={styles.contactText}>{businessProfile.businessAddress}</Text>
                                <View style={styles.contactIconWrapper}>
                                    <LocationIcon color={themeColor} size={14} />
                                </View>
                            </View>
                        ) : null}
                        {businessProfile?.businessPhone ? (
                            <View style={styles.contactRow}>
                                <Text style={styles.contactText}>{businessProfile.businessPhone}</Text>
                                <View style={styles.contactIconWrapper}>
                                    <PhoneIcon color={themeColor} size={14} />
                                </View>
                            </View>
                        ) : null}
                        {businessProfile?.businessWhatsapp ? (
                            <View style={styles.contactRow}>
                                <Text style={styles.contactText}>{businessProfile.businessWhatsapp}</Text>
                                <View style={styles.contactIconWrapper}>
                                    <WhatsAppIcon color={themeColor} size={14} />
                                </View>
                            </View>
                        ) : null}
                        {businessProfile?.businessEmail ? (
                            <View style={styles.contactRow}>
                                <Text style={styles.contactText}>{businessProfile.businessEmail}</Text>
                                <View style={styles.contactIconWrapper}>
                                    <EmailIcon color={themeColor} size={14} />
                                </View>
                            </View>
                        ) : null}
                        {businessProfile?.businessWebsite ? (
                            <View style={styles.contactRow}>
                                <Text style={styles.contactText}>{businessProfile.businessWebsite}</Text>
                                <View style={styles.contactIconWrapper}>
                                    <WebsiteIcon color={themeColor} size={14} />
                                </View>
                            </View>
                        ) : null}
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>INVOICE</Text>

                {/* Customer & Order Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>Customer Information</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Name:</Text>
                            <Text style={styles.infoValue}>{safeStr(order.customerName)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Address:</Text>
                            <Text style={styles.infoValue}>{safeStr(order.address)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Phone:</Text>
                            <Text style={styles.infoValue}>{safeStr(order.phone)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>WhatsApp:</Text>
                            <Text style={styles.infoValue}>{safeStr(order.whatsapp)}</Text>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>Order Details</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Order #:</Text>
                            <Text style={styles.infoValue}>{safeStr(order.id)}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Created:</Text>
                            <Text style={styles.infoValue}>{formatDate(order.createdDate || order.orderDate)}</Text>
                        </View>
                        {order.dispatchDate && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Dispatched:</Text>
                                <Text style={styles.infoValue}>{formatDate(order.dispatchDate)}</Text>
                            </View>
                        )}
                        {order.trackingNumber && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Tracking #:</Text>
                                <Text style={styles.infoValue}>{safeStr(order.trackingNumber)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
                        <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
                        <Text style={[styles.tableHeaderCell, styles.colPrice]}>Unit Price</Text>
                        <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
                    </View>

                    {orderItems.map((item, idx) => {
                        const { categoryName, itemName } = getItemDisplay(item, products)
                        const qty = Number(item.quantity) || 0
                        const price = Number(item.unitPrice) || 0
                        const amount = qty * price
                        const notes = (item.notes || '').toString().trim()

                        return (
                            <View key={idx} style={styles.tableRow}>
                                <View style={styles.colDescription}>
                                    <Text style={styles.tableCell}>{safeStr(categoryName)} - {safeStr(itemName)}</Text>
                                    {notes ? <Text style={styles.itemNotes}>{notes}</Text> : null}
                                </View>
                                <Text style={[styles.tableCell, styles.colQty]}>{String(qty)}</Text>
                                <Text style={[styles.tableCell, styles.colPrice]}>Rs. {price.toFixed(2)}</Text>
                                <Text style={[styles.tableCell, styles.colAmount]}>Rs. {amount.toFixed(2)}</Text>
                            </View>
                        )
                    })}
                </View>

                {/* Totals */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Subtotal:</Text>
                        <Text style={styles.totalValue}>Rs. {subtotal.toFixed(2)}</Text>
                    </View>
                    {discountAmount > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Discount:</Text>
                            <Text style={styles.totalValue}>- Rs. {discountAmount.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Delivery:</Text>
                        <Text style={styles.totalValue}>Rs. {deliveryCharge.toFixed(2)}</Text>
                    </View>
                    {advancePayment > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Advance:</Text>
                            <Text style={styles.totalValue}>- Rs. {advancePayment.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={styles.grandTotalRow}>
                        <Text style={styles.grandTotalLabel}>{totalLabel}:</Text>
                        <Text style={styles.grandTotalValue}>Rs. {codAmount.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.thankYou}>Thank you for your business</Text>
                    <Text style={styles.poweredBy}>Powered by AllSet Business Management App</Text>
                </View>
            </Page>
        </Document >
    )
}

export default InvoicePdfDocument
