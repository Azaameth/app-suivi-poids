import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Appli Android (jalon 3) : la même appli web, servie depuis l'APK par une WebView.
 * `appId` est définitif (bloc 0.2) : il identifie l'appli auprès d'Android et de Firebase.
 */
const config: CapacitorConfig = {
  appId: 'io.github.azaameth.machimoto',
  appName: 'Professeur Machimoto',
  webDir: 'dist',
}

export default config
