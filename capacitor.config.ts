import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aofbiz.app',
  appName: 'AllSet',
  webDir: 'dist',
  server: {
    // Live reload - REMOVE THIS FOR PRODUCTION BUILD
    url: 'http://192.168.1.103:3000',
    cleartext: true,
    // Allow external URLs (for Supabase)
    allowNavigation: ['*.supabase.co', '*.supabase.com']
  },
  android: {
    // Android specific settings
    allowMixedContent: true
  }
};

export default config;
