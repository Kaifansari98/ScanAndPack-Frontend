const BASE_ASSET_URL = "http://192.168.1.9:7777/assets/scan-and-pack/";

export function ScanAndPackUrl(fileName: string): string {
  if (!fileName) return ""; // fallback for missing logo
  return `${BASE_ASSET_URL}${encodeURIComponent(fileName)}`;
}