const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return withNativeWind(config, { input: "./global.css" });
})();