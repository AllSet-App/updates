import { useEffect, useRef } from 'react'
import { getSettings } from '../utils/storage'
import { curfoxService } from '../utils/curfox'
import { useToast } from './Toast/ToastContext'

const CACHE_KEY_PREFIX = 'curfox_cache_'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 Days

const CurfoxAuthHandler = ({ session }) => {
    const { addToast } = useToast()
    const hasChecked = useRef(false)

    useEffect(() => {
        // Only run once per session load, avoid duplicate checks on re-renders
        if (!session || hasChecked.current) return

        const checkCurfoxConnection = async () => {
            hasChecked.current = true

            try {
                const settings = await getSettings()

                if (settings?.curfox?.enabled) {
                    const { email, password, tenant } = settings.curfox

                    if (!email || !password || !tenant) {
                        console.warn("Curfox enabled but missing credentials.")
                        return
                    }

                    console.log('App: Verifying Curfox connection...')
                    const authData = await curfoxService.login(email, password, tenant)

                    if (authData && authData.token) {
                        console.log('App: Curfox Connected')
                        addToast('Connected to Curfox Courier Service', 'success')

                        // Check Cache
                        const cachedCitiesStr = localStorage.getItem(CACHE_KEY_PREFIX + 'cities')
                        const cachedDistrictsStr = localStorage.getItem(CACHE_KEY_PREFIX + 'districts')
                        const cacheTimeStr = localStorage.getItem(CACHE_KEY_PREFIX + 'timestamp')

                        const isCacheValid = cacheTimeStr && (Date.now() - parseInt(cacheTimeStr) < CACHE_DURATION)

                        if (isCacheValid && cachedCitiesStr && cachedDistrictsStr) {
                            const districts = JSON.parse(cachedDistrictsStr)
                            const cities = JSON.parse(cachedCitiesStr)

                            if (districts.length > 0 && cities.length > 0) {
                                console.log(`App: Using Cached Curfox location data (${cities.length} cities)`)

                                // Dispatch event immediately
                                window.dispatchEvent(new CustomEvent('curfoxDataUpdated', {
                                    detail: { districts, cities }
                                }))
                                localStorage.setItem('curfox_auth', JSON.stringify({ tenant, token: authData.token }))
                                return
                            } else {
                                console.warn('App: Cache exists but is empty. Fetching fresh data...')
                            }
                        }

                        // Pre-fetch Data if cache invalid or missing
                        console.log('App: Cache expired or missing. Fetching Curfox location data...')
                        const authPayload = { tenant, token: authData.token }

                        try {
                            const [districts, cities] = await Promise.all([
                                curfoxService.getDistricts(authPayload),
                                curfoxService.getCities(authPayload)
                            ])

                            console.log(`App: Loaded ${districts?.length || 0} districts and ${cities?.length || 0} cities`)

                            if (cities && cities.length > 0) {
                                // Cache in LocalStorage only if we have data
                                try {
                                    localStorage.setItem(CACHE_KEY_PREFIX + 'districts', JSON.stringify(districts || []))
                                    localStorage.setItem(CACHE_KEY_PREFIX + 'cities', JSON.stringify(cities || []))
                                    localStorage.setItem(CACHE_KEY_PREFIX + 'timestamp', Date.now().toString())
                                    localStorage.setItem('curfox_auth', JSON.stringify(authPayload))
                                } catch (storageErr) {
                                    console.warn("App: LocalStorage quota exceeded. Using in-memory state only.", storageErr)
                                    // If quota exceeded, we can still proceed as the data is already in 'cities' variable
                                    // and will be dispatched to listeners. It just won't be cached for the next session.
                                }
                            } else if (cities && cities.length === 0) {
                                console.warn("App: Fetched cities list is empty, not caching.")
                            }

                            // Dispatch event for any listeners (like open forms)
                            window.dispatchEvent(new CustomEvent('curfoxDataUpdated', {
                                detail: { districts, cities }
                            }))

                        } catch (dataErr) {
                            console.error('App: Failed to pre-fetch Curfox data', dataErr)
                        }

                    } else {
                        console.warn('App: Curfox Connection Failed')
                        addToast('Curfox Connection Failed. Please check settings.', 'error')
                    }
                }
            } catch (error) {
                console.error('Curfox Auth Check Error:', error)
            }
        }

        checkCurfoxConnection()
    }, [session, addToast])

    return null // This component doesn't render anything visible
}

export default CurfoxAuthHandler
