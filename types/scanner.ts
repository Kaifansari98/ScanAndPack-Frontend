export type ScannerType = "mobile" | "ring" | "handheld";

export const SCANNER_LABELS: Record<ScannerType, string> = {
  mobile: "Mobile Scanner",
  ring: "Ring Scanner",
  handheld: "Handheld Scanner",
};

export const isScannerType = (value: unknown): value is ScannerType =>
  value === "mobile" || value === "ring" || value === "handheld";
