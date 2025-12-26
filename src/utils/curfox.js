
const BASE_URL = 'https://v1.api.curfox.com/api/public/merchant';
const AUTH_URL = 'https://v1.api.curfox.com/api/public/merchant/login';

class CurfoxService {
    constructor() {
        this.token = localStorage.getItem('curfox_token');
        this.tenant = localStorage.getItem('curfox_tenant');
        this.tokenExpiry = localStorage.getItem('curfox_token_expiry');
    }

    // Helper to get headers
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': this.token ? `Bearer ${this.token}` : '',
            'X-tenant': this.tenant || 'developers' // Default or fallback
        };
    }

    // Check if token is valid
    isAuthenticated() {
        if (!this.token) return false;
        // Simple check: if we have a token, assume valid for now, or check expiry if available
        // For now, we rely on API 401 response to clear it.
        return true;
    }

    // Authenticate and get token
    async login(email, password, tenant = 'developers') {
        try {
            console.log('Logging in to Curfox...', { email, tenant });
            const response = await fetch(AUTH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-tenant': tenant
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Curfox Login Failed:', response.status, errorText);
                throw new Error(`Authentication failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // Assuming headers or body contains the token. 
            // Based on docs, it's usually in body.token or body.data.token
            // We'll assume standard Bearer response structure.
            const token = data.token || data.data?.token;

            if (token) {
                this.token = token;
                this.tenant = tenant;
                localStorage.setItem('curfox_token', token);
                localStorage.setItem('curfox_tenant', tenant);
                console.log('Curfox Login Successful. Token:', token.substring(0, 10) + '...');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Curfox Login Error:', error);
            throw error;
        }
    }

    // Get Cities (for validation)
    async getCities() {
        try {
            console.log('Fetching Curfox Cities...');
            const response = await fetch(`${BASE_URL}/city?noPagination=1`, {
                headers: this.getHeaders()
            });
            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`Failed to fetch cities: ${response.status} ${txt}`);
            }
            const data = await response.json();
            const cities = data.cities || data.data || [];
            console.log(`Curfox Cities Fetched: ${cities.length}`, cities[0]);
            return cities;
        } catch (error) {
            console.error('Curfox Cities Error:', error);
            return [];
        }
    }

    // Get Districts
    // Get Districts (Using State endpoint)
    async getDistricts() {
        try {
            const response = await fetch(`${BASE_URL}/state?noPagination=1`, {
                headers: this.getHeaders()
            });
            if (!response.ok) throw new Error('Failed to fetch districts (states)');
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Curfox Districts Error:', error);
            return [];
        }
    }

    // Create Order (Generate Waybill)
    async createOrder(orderData) {
        if (!this.isAuthenticated()) throw new Error('Not authenticated');

        // Transform local order format to Curfox format
        const payload = {
            customer_name: orderData.customerName,
            customer_phone: orderData.phone || orderData.whatsapp,
            delivery_address: orderData.address,
            district_id: orderData.districtId, // Needed if API requires ID. If name, use name.
            city_id: orderData.cityId,         // Similarly for city
            cod_amount: orderData.codAmount || 0,
            weight: 1, // Default or calculated
            // ... map other fields based on API docs
        };

        try {
            const response = await fetch(`${BASE_URL}/order/single`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Order creation failed');
            }

            const data = await response.json();
            return data.tracking_number || data.data?.tracking_number; // Adjust based on actual response
        } catch (error) {
            console.error('Curfox Create Order Error:', error);
            throw error;
        }
    }

    // Get Tracking Info
    async getTracking(trackingNumber) {
        if (!this.isAuthenticated()) throw new Error('Not authenticated');

        try {
            // NOTE: Using Merchant endpoint for detailed info
            const url = `${BASE_URL}/order/tracking-info?tracking_number=${trackingNumber}`;

            const response = await fetch(url, { headers: this.getHeaders() });
            if (!response.ok) throw new Error('Failed to fetch tracking');

            const data = await response.json();
            return data.history || data.data || [];
        } catch (error) {
            console.error('Curfox Tracking Error:', error);
            return [];
        }
    }
}

export const curfoxService = new CurfoxService();
