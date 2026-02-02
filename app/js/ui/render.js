import { setLcd, pulseVu } from "./components.js";

const setTable = (table, headers, rows) => {
  if (!table) return;
  if (!rows.length) {
    table.innerHTML = '<tr><td class="muted">Sin datos</td></tr>';
    return;
  }
  table.innerHTML = `
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? "n/a"}</td>`).join("")}</tr>`)
        .join("")}
    </tbody>
  `;
};

export const renderDashboard = (state) => {
  const gatewayState = document.getElementById("gateway-state");
  const gatewaySummary = document.getElementById("gateway-summary");
  const gatewayBind = document.getElementById("gateway-bind");
  const gatewayLatency = document.getElementById("gateway-latency");
  const gatewayAllow = document.getElementById("gateway-allow");
  const gatewayVersion = document.getElementById("gateway-version");
  const usageTokens = document.getElementById("usage-tokens");
  const usageCost = document.getElementById("usage-cost");
  const usageNote = document.getElementById("usage-note");
  const usageState = document.getElementById("usage-state");
  const lcdStatus = document.getElementById("lcd-status");
  const versionBadge = document.getElementById("version-badge");
  const openControl = document.getElementById("open-control-ui");
  const recentEvents = document.getElementById("recent-events");

  if (state.gateway) {
    const statusText = (state.gateway.status || "").trim();
    const lowered = statusText.toLowerCase();
    const online = ["online", "running", "up", "active"].some((flag) => lowered.includes(flag));
    const offline = ["offline", "stopped", "down", "inactive", "error"].some((flag) =>
      lowered.includes(flag)
    );
    if (gatewayState) {
      gatewayState.textContent = online ? "online" : offline ? "offline" : "unknown";
      gatewayState.className = `badge ${online ? "ok" : offline ? "crit" : "warn"}`;
    }
    if (gatewaySummary) {
      gatewaySummary.textContent = statusText || "Sin datos";
    }
    setLcd(gatewayBind, `bind ${state.gateway.profile || "--"}`);
    setLcd(gatewayLatency, `latency ${state.gateway.latency || "--"}`);
  }

  if (state.usage) {
    setLcd(usageTokens, `tokens ${state.usage.totals.tokensIn ?? "n/a"}`);
    setLcd(usageCost, `cost ${state.usage.totals.cost ?? "n/a"}`);
    usageNote.textContent = state.usage.notes || "Actualizado";
    if (usageState) {
      usageState.textContent = "synced";
      usageState.className = "badge ok";
    }
    pulseVu(document.getElementById("vu-activity"), 3);
  } else if (usageState) {
    usageState.textContent = "n/a";
    usageState.className = "badge warn";
  }

  if (state.config) {
    if (versionBadge && state.config.version) {
      versionBadge.textContent = `v${state.config.version}`;
    }
    if (gatewayVersion && state.config.version) {
      gatewayVersion.textContent = `v${state.config.version}`;
    }
    if (gatewayAllow && state.config.security?.allow_actions) {
      const count = state.config.security.allow_actions.length;
      gatewayAllow.textContent = `allow ${count}`;
      gatewayAllow.className = `badge ${count ? "ok" : "warn"}`;
    }
    if (openControl) {
      const allow = state.config.security?.allow_actions?.includes("gateway.dashboard");
      openControl.disabled = !allow;
      openControl.title = allow ? "" : "Acción no permitida por policy";
    }
    const active = state.config.activeProfile;
    const profile = state.config.profiles?.find((p) => p.name === active);
    if (profile) {
      setLcd(lcdStatus, `${profile.bind}:${profile.port}`);
    }
  }

  if (recentEvents) {
    const entries = (state.events || []).slice(-4).reverse();
    if (!entries.length) {
      recentEvents.innerHTML = "<p class='muted'>Sin eventos recientes.</p>";
    } else {
      recentEvents.innerHTML = entries
        .map((entry) => {
          const type = entry.type || entry.event || "info";
          const message = entry.message || entry.detail || entry.action || "Evento registrado";
          const timestamp = entry.timestamp || entry.time || entry.at || "";
          return `
            <div class="event-item">
              <div class="event-meta">
                <span class="badge">${type}</span>
                <span class="muted">${timestamp}</span>
              </div>
              <strong>${message}</strong>
            </div>
          `;
        })
        .join("");
    }
  }
};

export const renderProfiles = (state) => {
  const container = document.getElementById("profiles-list");
  const empty = document.getElementById("profiles-empty");
  if (!container) return;
  container.innerHTML = "";
  if (!state.profiles.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  state.profiles.forEach((profile) => {
    const card = document.createElement("article");
    card.className = `card ${profile.active ? "card-active" : ""}`;
    card.innerHTML = `
      <div class="section-header">
        <h3>${profile.name}</h3>
        <span class="badge ${profile.remote ? "warn" : "ok"}">${profile.remote ? "remote" : "local"}</span>
      </div>
      <p class="muted">${profile.bind}:${profile.port}</p>
      <div class="inline">
        <button class="btn secondary" data-action="activate" ${profile.active ? "disabled" : ""}>${
          profile.active ? "Activo" : "Activar"
        }</button>
        <button class="btn danger" data-action="delete">Eliminar</button>
      </div>
    `;
    card.querySelector("[data-action='activate']").dataset.name = profile.name;
    card.querySelector("[data-action='delete']").dataset.name = profile.name;
    container.appendChild(card);
  });
};

export const renderUsage = (state) => {
  if (!state.usage) return;
  const { totals, timestamp, byProvider, byModel, byTool } = state.usage;
  setLcd(document.getElementById("usage-total-tokens"), `tokens ${totals.tokensIn ?? "n/a"}`);
  setLcd(document.getElementById("usage-total-cost"), `cost ${totals.cost ?? "n/a"}`);
  const ts = document.getElementById("usage-timestamp");
  if (ts) ts.textContent = timestamp ? `Updated ${timestamp}` : "--";

  setTable(
    document.getElementById("usage-providers"),
    ["Provider", "Tokens", "Cost", "Reqs"],
    byProvider.map((item) => [
      item.name,
      item.tokens ?? "n/a",
      item.cost ?? "n/a",
      item.requests ?? "n/a",
    ])
  );
  setTable(
    document.getElementById("usage-models"),
    ["Model", "Tokens", "Cost"],
    byModel.map((item) => [item.name, item.tokens ?? "n/a", item.cost ?? "n/a"])
  );
  setTable(
    document.getElementById("usage-tools"),
    ["Tool", "Usage", "Cost"],
    byTool.map((item) => [item.name, item.usage ?? "n/a", item.cost ?? "n/a"])
  );
};

export const renderMacros = (state) => {
  const list = document.getElementById("macro-list");
  if (!list) return;
  list.innerHTML = "";
  const entries = Object.entries(state.macros || {});
  if (!entries.length) {
    list.innerHTML = "<p class='muted'>Sin macros registradas.</p>";
    return;
  }
  entries.forEach(([name, macro]) => {
    const row = document.createElement("div");
    row.className = "inline";
    row.innerHTML = `<strong>${name}</strong><span class="muted">${macro.description || ""}</span>`;
    const button = document.createElement("button");
    button.className = "btn secondary";
    button.textContent = "Run";
    button.dataset.name = name;
    row.appendChild(button);
    list.appendChild(row);
  });
};

export const renderEvents = (state) => {
  const list = document.getElementById("timeline-list");
  if (!list) return;
  if (!state.events.length) {
    list.innerHTML = "<p class='muted'>Sin eventos.</p>";
    return;
  }
  list.innerHTML = state.events
    .map((entry) => {
      const type = entry.type || entry.event || "info";
      const message = entry.message || entry.detail || entry.action || "Evento registrado";
      const timestamp = entry.timestamp || entry.time || entry.at || "";
      return `
        <div class="event-item">
          <div class="event-meta">
            <span class="badge">${type}</span>
            <span class="muted">${timestamp}</span>
          </div>
          <strong>${message}</strong>
        </div>
      `;
    })
    .join("");
};

export const renderLogs = (lines) => {
  const container = document.getElementById("log-stream");
  if (!container) return;
  container.textContent = lines.join("\n");
};

export const renderSettings = (state) => {
  const remoteStatus = document.getElementById("remote-status");
  if (remoteStatus && state.config?.security) {
    const enabled = Boolean(state.config.security.enableRemoteProfiles);
    remoteStatus.textContent = enabled ? "enabled" : "disabled";
    remoteStatus.className = `badge ${enabled ? "ok" : "warn"}`;
  }
};
