// PDF generation and platform-specific saving utility
import { pdf } from '@react-pdf/renderer'

// Platform detection
export const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI !== undefined
}

export const isCapacitor = () => {
    return typeof window !== 'undefined' && window.Capacitor !== undefined
}

/**
 * Convert ArrayBuffer to base64 string (browser compatible)
 */
const arrayBufferToBase64 = (buffer) => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
}

/**
 * Generate PDF and save/download based on platform
 * @param {React.ReactElement} document - The React PDF document component
 * @param {string} fileName - The desired file name (e.g., "Order_123_Invoice.pdf")
 */
export const generateAndSavePdf = async (document, fileName) => {
    try {
        // Generate PDF blob
        const pdfInstance = pdf(document)
        const blob = await pdfInstance.toBlob()

        if (!blob) {
            throw new Error('Failed to generate PDF blob')
        }

        if (isElectron()) {
            // Electron: Use IPC to save file
            const arrayBuffer = await blob.arrayBuffer()
            const base64 = arrayBufferToBase64(arrayBuffer)

            if (window.electronAPI?.savePdfToTemp) {
                const result = await window.electronAPI.savePdfToTemp(base64, fileName)
                if (!result.success) {
                    throw new Error(result.error || 'Failed to save PDF')
                }
                return { success: true, path: result.path }
            } else {
                // Fallback to web download if IPC not available
                return webDownload(blob, fileName)
            }
        } else if (isCapacitor()) {
            // Capacitor: Save to device storage and open
            try {
                const { Filesystem, Directory } = await import('@capacitor/filesystem')
                const { FileOpener } = await import('@capawesome-team/capacitor-file-opener')

                const arrayBuffer = await blob.arrayBuffer()
                const base64 = arrayBufferToBase64(arrayBuffer)

                // Save to Documents directory
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64,
                    directory: Directory.Documents
                })

                // Open the PDF file
                await FileOpener.openFile({
                    path: result.uri,
                    mimeType: 'application/pdf'
                })

                return { success: true, path: result.uri }
            } catch (capacitorError) {
                console.warn('Capacitor save failed, falling back to web download:', capacitorError)
                return webDownload(blob, fileName)
            }
        } else {
            // Web: Standard browser download
            return webDownload(blob, fileName)
        }
    } catch (error) {
        console.error('PDF generation error:', error)
        throw error
    }
}

/**
 * Web browser download helper
 */
const webDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return { success: true }
}
