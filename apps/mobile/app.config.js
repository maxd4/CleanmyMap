module.exports = ({ config }) => ({
  ...config,
  updates: {
    ...(config.updates ?? {}),
    enabled: false,
  },
  plugins: [
    ...(config.plugins ?? []),
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
      },
    ],
    ...(process.env.GOOGLE_MAPS_API_KEY?.trim()
      ? [['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY }]]
      : []),
  ],
})
