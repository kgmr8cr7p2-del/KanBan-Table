type GoidaEvent = {
  id: string;
  createdAt: string;
};

let latestEvent: GoidaEvent | null = null;

export function triggerGoidaEvent() {
  latestEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  return latestEvent;
}

export function getLatestGoidaEvent() {
  return latestEvent;
}
