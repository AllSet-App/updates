const GITHUB_RELEASES_URL = 'https://api.github.com/repos/aofbiz/updates/releases/latest'

/**
 * Fetch the latest release from GitHub Releases API
 */
export const getLatestUpdate = async () => {
    try {
        const response = await fetch(GITHUB_RELEASES_URL, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        if (!response.ok) {
            if (response.status === 404) {
                // No releases found
                return null
            }
            throw new Error(`GitHub API error: ${response.status}`)
        }

        const release = await response.json()

        // Parse asset links
        const exeAsset = release.assets?.find(a => a.name.endsWith('.exe'))
        const apkAsset = release.assets?.find(a => a.name.endsWith('.apk'))

        return {
            version: release.tag_name?.replace(/^v/, ''), // Remove 'v' prefix
            release_notes: release.body || '',
            exe_link: exeAsset?.browser_download_url || null,
            apk_link: apkAsset?.browser_download_url || null,
            published_at: release.published_at
        }
    } catch (error) {
        console.error('Error fetching latest update from GitHub:', error)
        return null
    }
}
