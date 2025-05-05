// @ts-check
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Firebase / Expo SDK 53: .cjs dosyalarını izin ver ve 
// Firebase alt paketlerinin doğru şekilde paketlenmesi için klasik Node "exports" kullan
config.resolver.sourceExts = config.resolver.sourceExts || [];
if (!config.resolver.sourceExts.includes("cjs")) {
  config.resolver.sourceExts.push("cjs");
}

// Firebase ve React-Native-WebView gibi tüm bağımlılıklar tam dışa aktarım haritaları 
// gönderene kadar yeni, daha katı "package.json exports" çözünürlüğünü devre dışı bırak
config.resolver.unstable_enablePackageExports = false;

module.exports = config; 