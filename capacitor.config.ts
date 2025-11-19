import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sixseven.app',
  appName: '6Seven',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

