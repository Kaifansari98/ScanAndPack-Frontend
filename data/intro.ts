// ─── PACKING STATIONS ─────────────────────────────────────────────────────────

export const PACKING_STATIONS = [
  { id: "PS1", name: "Station Alpha", capacity: 20, filled: 12, icon: "📦" },
  { id: "PS2", name: "Station Beta",  capacity: 20, filled: 5,  icon: "📦" },
  { id: "PS3", name: "Station Gamma", capacity: 20, filled: 20, icon: "📦" },
];

// ─── DEFECT REASONS ───────────────────────────────────────────────────────────

export const DEFECT_REASONS = [
  { id: "D1", label: "Scratch",      icon: "〰️", color: "#E63946" },
  { id: "D2", label: "Dent",         icon: "💥", color: "#F77F00" },
  { id: "D3", label: "Wrong Size",   icon: "📏", color: "#9B2335" },
  { id: "D4", label: "Color Fault",  icon: "🎨", color: "#7B2D8B" },
  { id: "D5", label: "Missing Part", icon: "❓", color: "#C0392B" },
  { id: "D6", label: "Other",        icon: "⚠️", color: "#6B7280" },
];

// ─── SCANNED ITEM (simulated QR result) ───────────────────────────────────────

export const SCANNED_ITEM = {
  id:        "ITM-00492",
  name:      "Bracket Assembly",
  machine:   "Press Line A",
  batch:     "BATCH-2024-119",
  qty:       1,
  timestamp: "10:42 AM",
  status:    "In Progress",
};

// ─── BOX ITEMS ────────────────────────────────────────────────────────────────

export const BOX_ITEMS = [
  { id: "ITM-00490", name: "Bracket Assembly", status: "ok" },
  { id: "ITM-00491", name: "Bracket Assembly", status: "ok" },
  { id: "ITM-00492", name: "Bracket Assembly", status: "ok" },
];

// ─── INTRO SLIDES ─────────────────────────────────────────────────────────────

export const INTRO_SLIDES = [
  {
    bg:       "#0B1C2D",
    icon:     "🏭",
    title:    "Factory Control",
    subtitle: "Manage your production line with ease",
    accent:   "#F4A261",
  },
  {
    bg:       "#0D2137",
    icon:     "📷",
    title:    "Scan & Track",
    subtitle: "Scan QR codes to track items instantly",
    accent:   "#2A9D8F",
  },
  {
    bg:       "#1A1A2E",
    icon:     "📦",
    title:    "Pack & Ship",
    subtitle: "Pack boxes and generate labels fast",
    accent:   "#F4A261",
  },
];

// ─── SETTINGS MENU ITEMS ──────────────────────────────────────────────────────

export const SETTINGS_ITEMS = [
  { icon: "🌐", label: "Language",      value: "English"    },
  { icon: "🔦", label: "Scanner Flash", value: "Auto"       },
  { icon: "🌙", label: "Dark Mode",     value: "Auto"       },
  { icon: "📳", label: "Vibration",     value: "On"         },
  { icon: "📞", label: "Support",       value: "Supervisor" },
  { icon: "ℹ️", label: "App Version",   value: "1.0.0"      },
];

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export const DASHBOARD_STATS = [
  { label: "Scanned", value: "48", icon: "📷", colorKey: "primary" },
  { label: "Packed",  value: "32", icon: "📦", colorKey: "success" },
  { label: "Defects", value: "3",  icon: "⚠️", colorKey: "error"   },
];