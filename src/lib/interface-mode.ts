export const interfaceModes = ["new"] as const;

export type InterfaceMode = (typeof interfaceModes)[number];

export const INTERFACE_MODE_COOKIE = "taskora_interface_mode";

export function normalizeInterfaceMode(_value: unknown): InterfaceMode {
  void _value;
  return "new";
}
