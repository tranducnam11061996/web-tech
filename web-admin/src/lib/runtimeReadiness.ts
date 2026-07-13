type ReadinessState = { ready: boolean; startedAt: number; completedAt: number | null; error: string | null };

declare global {
  var hacomPrewarmState: ReadinessState | undefined;
}

function state() {
  global.hacomPrewarmState ||= {
    ready: process.env.NODE_ENV !== 'production',
    startedAt: Date.now(),
    completedAt: process.env.NODE_ENV !== 'production' ? Date.now() : null,
    error: null,
  };
  return global.hacomPrewarmState;
}

export function beginRuntimePrewarm() {
  Object.assign(state(), { ready: false, startedAt: Date.now(), completedAt: null, error: null });
}

export function completeRuntimePrewarm(error?: unknown) {
  Object.assign(state(), {
    ready: true,
    completedAt: Date.now(),
    error: error ? (error instanceof Error ? error.message : 'Prewarm failed') : null,
  });
}

export function getRuntimePrewarmState() {
  return { ...state() };
}
