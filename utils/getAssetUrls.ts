const BASE_ASSET_URL = "https://api.vloq.com/assets/scan-and-pack/";

export function ScanAndPackUrl(fileName: string): string {
  if (!fileName) return ""; // fallback for missing logo
  return `${BASE_ASSET_URL}${encodeURIComponent(fileName)}`;
}