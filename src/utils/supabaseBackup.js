/**
 * Supabase Backup Service
 * Handles database backups using Supabase Storage
 */

import { getSupabase } from './supabaseClient'

const BUCKET_NAME = 'backups'

/**
 * Ensures the 'backups' bucket exists in Supabase Storage.
 * Should be called before any storage operations.
 */
export const ensureBucketExists = async () => {
    try {
        const supabase = await getSupabase()
        if (!supabase) return false

        // In the new "No-Login" setup, the SQL script handles bucket creation.
        // We just try a simple list to see if we have access.
        const { data: buckets, error: listError } = await supabase.storage.listBuckets()

        // If we can't list buckets, it might be a permission error.
        // We'll proceed anyway and let the actual upload/list fail if the bucket is truly missing.
        if (listError) {
            console.warn('Could not verify bucket existence (permission restricted):', listError.message)
            return true
        }

        const exists = buckets?.some(b => b.name === BUCKET_NAME)
        if (!exists) {
            // Attempt to create, but don't crash if it fails (SQL script is the primary way now)
            await supabase.storage.createBucket(BUCKET_NAME, {
                public: false,
                fileSizeLimit: 52428800,
            })
        }
        return true
    } catch (error) {
        // Silently fail ensureBucketExists - the actual storage calls will throw meaningful errors
        return true
    }
}

/**
 * Uploads a backup file to Supabase Storage.
 */
export const uploadBackup = async (fileName, fileContent) => {
    try {
        const supabase = await getSupabase()
        if (!supabase) throw new Error('Supabase not configured')

        await ensureBucketExists()

        const { error } = await supabase.storage.from(BUCKET_NAME).upload(fileName, fileContent, {
            contentType: 'application/json',
            upsert: true
        })

        if (error) throw error
        return true
    } catch (error) {
        console.error('Supabase Backup Upload Error:', error)
        throw error
    }
}

/**
 * Lists available backup files in Supabase Storage.
 */
export const listBackups = async () => {
    try {
        const supabase = await getSupabase()
        if (!supabase) return []

        await ensureBucketExists()

        const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
        })

        if (error) throw error

        // Map to consistent format
        return data.map(file => ({
            id: file.id,
            name: file.name,
            createdTime: file.created_at
        }))
    } catch (error) {
        console.error('Supabase Backup List Error:', error)
        return []
    }
}

/**
 * Downloads a backup file from Supabase Storage.
 */
export const downloadBackup = async (fileName) => {
    try {
        const supabase = await getSupabase()
        if (!supabase) throw new Error('Supabase not configured')

        const { data, error } = await supabase.storage.from(BUCKET_NAME).download(fileName)
        if (error) throw error

        const text = await data.text()
        return JSON.parse(text)
    } catch (error) {
        console.error('Supabase Backup Download Error:', error)
        throw error
    }
}

/**
 * Deletes a backup file from Supabase Storage.
 */
export const deleteBackup = async (fileName) => {
    try {
        const supabase = await getSupabase()
        if (!supabase) throw new Error('Supabase not configured')

        const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName])
        if (error) throw error
        return true
    } catch (error) {
        console.error('Supabase Backup Delete Error:', error)
        return false
    }
}
