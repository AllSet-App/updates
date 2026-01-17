import React from 'react'
import { Svg, Path, Circle, G } from '@react-pdf/renderer'

// SVG Line Icons for PDF - using stroke-based rendering
// All icons are 14x14 viewBox for consistent sizing

export const LocationIcon = ({ color = '#000000', size = 14 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
        <Circle cx={12} cy={9} r={2.5} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
)

export const PhoneIcon = ({ color = '#000000', size = 14 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
        />
    </Svg>
)

export const WhatsAppIcon = ({ color = '#000000', size = 14 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
            stroke={color}
            strokeWidth={1.5}
            fill="none"
        />
        <Path
            d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.16-1.34A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
    </Svg>
)

export const EmailIcon = ({ color = '#000000', size = 14 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
        <Path
            d="M22 6l-10 7L2 6"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
    </Svg>
)

export const WebsiteIcon = ({ color = '#000000', size = 14 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} fill="none" />
        <Path
            d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
            stroke={color}
            strokeWidth={2}
            fill="none"
        />
    </Svg>
)

// Font family mapping for PDF
// react-pdf supports: Helvetica, Times-Roman, Courier (and their variants)
// We map the app's font personalities to PDF-compatible fonts
export const getPdfFontFamily = (fontFamily) => {
    switch (fontFamily) {
        case 'modern':
            return 'Helvetica'
        case 'professional':
            return 'Helvetica'
        case 'elegant':
            return 'Times-Roman'
        case 'system':
        default:
            return 'Helvetica'
    }
}

export const getPdfFontFamilyBold = (fontFamily) => {
    switch (fontFamily) {
        case 'modern':
            return 'Helvetica-Bold'
        case 'professional':
            return 'Helvetica-Bold'
        case 'elegant':
            return 'Times-Bold'
        case 'system':
        default:
            return 'Helvetica-Bold'
    }
}
