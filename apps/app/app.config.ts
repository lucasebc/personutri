import type { ExpoConfig } from 'expo/config';

/**
 * APP_ALLOW_HTTP=1 libera tráfego http:// (só para builds de teste na rede local).
 * O build normal exige HTTPS.
 */
const allowHttp = process.env.APP_ALLOW_HTTP === '1';

const config: ExpoConfig = {
  name: 'PersoNutri',
  slug: 'personutri',
  scheme: 'personutri',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.lucasebc.personutri',
    adaptiveIcon: {
      backgroundColor: '#1D7A4F',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.POST_NOTIFICATIONS',
      // Health Connect (leitura). As de histórico e segundo plano precisam do consentimento do usuário.
      'android.permission.health.READ_EXERCISE',
      'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
      'android.permission.health.READ_TOTAL_CALORIES_BURNED',
      'android.permission.health.READ_DISTANCE',
      'android.permission.health.READ_HEART_RATE',
      'android.permission.health.READ_WEIGHT',
      'android.permission.health.READ_BODY_FAT',
      'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND',
      'android.permission.health.READ_HEALTH_DATA_HISTORY',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-camera', { cameraPermission: 'O PersoNutri usa a câmera para ler o código de barras dos produtos.', microphonePermission: false, recordAudioAndroid: false }],
    ['expo-notifications', { color: '#1D7A4F' }],
    'expo-background-task',
    'react-native-health-connect',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 26,
          usesCleartextTraffic: allowHttp,
        },
      },
    ],
  ],
};

export default config;
