/**
 * Site-control bus — the voice agent dispatches these events and
 * pages/components subscribe to react. This is how the agent gets
 * "hands" inside the React app without prop-drilling.
 */

export const AGENT_EVENTS = {
  layer: "aquatwin:agent:layer",
  zone: "aquatwin:agent:zone",
  simulate: "aquatwin:agent:simulate",
  optimize: "aquatwin:agent:optimize",
  refresh: "aquatwin:agent:refresh",
} as const;

export interface AgentLayerEvent {
  layer: string;
}

export interface AgentZoneEvent {
  zoneId: string;
}

export interface AgentSimulateEvent {
  strategy?: string;
}

export interface AgentOptimizeEvent {
  amount: number;
}

export function dispatchAgentEvent<T>(name: string, detail: T): void {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Subscribe to an agent event. Returns an unsubscribe function. */
export function onAgentEvent<T>(
  name: string,
  handler: (detail: T) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<T>).detail);
  document.addEventListener(name, listener);
  return () => document.removeEventListener(name, listener);
}

/** Toggle the app sidebar (the app layout already listens for this). */
export function dispatchSidebarToggle(): void {
  document.dispatchEvent(new Event("aquatwin:toggle-sidebar"));
}
