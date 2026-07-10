import { randomInt } from "node:crypto";

type SoundKind = "created" | "completed";

type TaskSoundEvent = {
  id: string;
  createdAt: string;
  soundUrl: string;
  repeatCount: number;
  kind: SoundKind;
};

const sounds: Record<SoundKind, string[]> = {
  created: [
    "/task-sounds/opiat-rabota.mp3",
    "/task-sounds/captainwhat2.mp3",
    "/task-sounds/peonready1.mp3",
    "/task-sounds/ooo-a-vot-tak-mne-nravitsja.mp3",
  ],
  completed: [
    "/completion-sounds/archerready1.mp3",
    "/completion-sounds/foresttrollyes1.mp3",
    "/completion-sounds/peasantbuildingcomplete1.mp3",
    "/completion-sounds/skibidi-dop-dop-yes-yes.mp3",
    "/completion-sounds/ura-pobeda.mp3",
  ],
};

type TaskSoundState = {
  latestEvent: TaskSoundEvent | null;
  lastSoundUrls: Record<SoundKind, string>;
  soundBags: Record<SoundKind, string[]>;
};

const state = getTaskSoundState();

export function triggerTaskSoundEvent(kind: SoundKind = "created") {
  const soundUrl = takeNextSound(kind);

  state.latestEvent = {
    id: `${Date.now()}-${randomInt(100000, 999999)}`,
    createdAt: new Date().toISOString(),
    soundUrl,
    repeatCount: 1,
    kind,
  };
  state.lastSoundUrls[kind] = soundUrl;
  return state.latestEvent;
}

export function triggerTaskCompletionSoundEvent() {
  return triggerTaskSoundEvent("completed");
}

export function getLatestTaskSoundEvent() {
  return state.latestEvent;
}

function takeNextSound(kind: SoundKind) {
  if (!state.soundBags[kind].length) {
    state.soundBags[kind] = shuffledSounds(kind);
    if (state.soundBags[kind].length > 1 && state.soundBags[kind][0] === state.lastSoundUrls[kind]) {
      [state.soundBags[kind][0], state.soundBags[kind][1]] = [state.soundBags[kind][1], state.soundBags[kind][0]];
    }
  }
  return state.soundBags[kind].shift() ?? sounds[kind][0];
}

function shuffledSounds(kind: SoundKind) {
  const bag = [...sounds[kind]];
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  return bag;
}

function getTaskSoundState() {
  const globalState = globalThis as typeof globalThis & { __teamKanbanTaskSoundState?: TaskSoundState };
  if (!globalState.__teamKanbanTaskSoundState?.soundBags) {
    globalState.__teamKanbanTaskSoundState = {
      latestEvent: globalState.__teamKanbanTaskSoundState?.latestEvent ?? null,
      lastSoundUrls: { created: "", completed: "" },
      soundBags: { created: [], completed: [] },
    };
  }
  return globalState.__teamKanbanTaskSoundState;
}
