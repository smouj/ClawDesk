const token = document.querySelector('meta[name="clawdesk-api-token"]').content;

const request = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Request failed");
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res.text();
};

export const api = {
  getConfig: () => request("/config"),
  getProfiles: () => request("/profiles"),
  activateProfile: (name) => request("/profiles/activate", { method: "POST", body: JSON.stringify({ name }) }),
  saveProfile: (payload) => request("/profiles/save", { method: "POST", body: JSON.stringify(payload) }),
  deleteProfile: (name) => request(`/profiles/${name}`, { method: "DELETE" }),
  getGatewayStatus: () => request("/gateway/status"),
  getGatewayControlUrl: () => request("/gateway/control-url"),
  probeGateway: () => request("/gateway/probe"),
  getUsageSnapshot: () => request("/usage/snapshot"),
  getUsageHistory: (range) => request(`/usage/history?range=${range}`),
  exportUsage: (range, format) => request(`/usage/export?range=${range}&format=${format}`),
  getMacros: () => request("/macros"),
  runMacro: (name) => request("/macros/run", { method: "POST", body: JSON.stringify({ name }) }),
  getEvents: (limit = 200) => request(`/events?limit=${limit}`),
  getLogs: () => request("/logs"),
  getOpenclawVersion: () => request("/openclaw/version"),
};

export const streamLogs = (onEvent) => {
  const source = new EventSource(`/api/logs/stream?token=${token}`);
  source.addEventListener("logs", (event) => {
    onEvent("logs", JSON.parse(event.data));
  });
  source.addEventListener("error", (event) => {
    onEvent("error", event);
  });
  return source;
};
