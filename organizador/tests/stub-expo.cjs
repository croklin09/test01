// Stub de módulos nativos de Expo para correr la capa de datos en Node (node:sqlite).
const Module = require('module'); const path = require('path');
const orig = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) {
  if (req === 'expo-file-system' || req === 'expo-sharing') return path.join(__dirname, 'empty.cjs');
  return orig.call(this, req, ...rest);
};
