const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Exclude the Cloud Functions directory from Metro bundling
config.resolver.blockList = [
  /.*\/functions\/.*/,
];

module.exports = config;
