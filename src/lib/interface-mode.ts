export const interfaceModes = ["classic", "new"] as const;

export type InterfaceMode = (typeof interfaceModes)[number];

export const INTERFACE_MODE_COOKIE = "taskora_interface_mode";

export function normalizeInterfaceMode(value: unknown): InterfaceMode {
  return value === "new" ? "new" : "classic";
}
