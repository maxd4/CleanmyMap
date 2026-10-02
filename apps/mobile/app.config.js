module.exports = ({ config }) => ({
  ...config,
  updates: {
    ...(config.updates ?? {}),
    enabled: false,
  },
  plugins: [
    ...(config.plugins ?? []),
    ...(process.env.GOOGLE_MAPS_API_KEY
      ? [['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY }]]
      : []),
  ],
})
