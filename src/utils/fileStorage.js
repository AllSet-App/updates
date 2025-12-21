import { supabase } from './supabase'

const BUCKET_NAME = 'order-item-images'

/**
 * Uploads an image for a specific order item.
 * @param {File} file - The file object to upload.
 * @param {string} orderId - The ID of the order (or temp ID).
 * @param {string} itemId - The ID of the item.
 * @returns {Promise<string|null>} - The public URL of the uploaded image, or null on error.
 */
export const uploadOrderItemImage = async (file, orderId, itemId) => {
    try {
        if (!file) return null

        // Create a unique file path: orderId/itemId_timestamp.ext
        const fileExt = file.name.split('.').pop()
        const fileName = `${itemId}_${Date.now()}.${fileExt}`
        const filePath = `${orderId}/${fileName}`

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (error) {
            console.error('Error uploading image:', error)
            throw error
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath)

        return publicUrl
    } catch (error) {
        console.error('Upload failed:', error)
        return null
    }
}

/**
 * Deletes an image from storage.
 * @param {string} imageUrl - The full public URL of the image to delete.
 * @returns {Promise<boolean>} - True if successful.
 */
export const deleteOrderItemImage = async (imageUrl) => {
    try {
        if (!imageUrl) return false

        // Extract path from URL
        // URL format: .../storage/v1/object/public/bucket-name/folder/file.ext
        const path = imageUrl.split(`${BUCKET_NAME}/`).pop()

        if (!path) return false

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path])

        if (error) {
            console.error('Error deleting image:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Delete failed:', error)
        return false
    }
}
