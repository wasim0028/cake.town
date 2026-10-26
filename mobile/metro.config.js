// Expo's Metro config understands npm workspaces, so the shared package resolves on its own.
const { getDefaultConfig } = require("expo/metro-config");

module.exports = getDefaultConfig(__dirname);
