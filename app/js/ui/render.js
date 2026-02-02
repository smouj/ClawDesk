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
  const gatewayToken = document.getElementById("gateway-token");
  const gatewayActivity = document.getElementById("gateway-activity");
  const gatewayAllow = document.getElementById("gateway-allow");
  const gatewayVersion = document.getElementById("gateway-version");
  const usageTokens = document.getElementById("usage-tokens");
  const usageCost = document.getElementById("usage-cost");
  const usageNote = document.getElementById("usage-note");
  const usageState = document.getElementById("usage-state");
  const lcdStatus = document.getElementById("lcd-status");
  const lcdLatency = document.getElementById("lcd-latency");
  const lcdUptime = document.getElementById("lcd-uptime");
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
      gatewayAllow.textContent = `acciones ${count}`;
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
      setLcd(gatewayBind, `bind ${profile.bind}:${profile.port}`);
    }
  }

  if (state.health) {
    if (lcdLatency) {
      const latency = state.health.gateway?.latency_ms;
      setLcd(lcdLatency, latency ? `${latency} ms` : "-- ms");
    }
    if (lcdUptime) {
      setLcd(lcdUptime, `${state.health.uptime_s ?? "--"} s`);
    }
    if (gatewayToken) {
      gatewayToken.textContent = state.health.gateway?.token_present ? "detectado" : "no encontrado";
      gatewayToken.className = `kpi-value ${
        state.health.gateway?.token_present ? "ok" : "warn"
      }`;
    }
    if (state.health.openclaw?.version && gatewayVersion) {
      gatewayVersion.textContent = state.health.openclaw.version;
    }
  }

  if (gatewayActivity) {
    const latest = (state.events || [])[state.events?.length - 1];
    gatewayActivity.textContent = `última actividad ${latest?.timestamp || latest?.time || "--"}`;
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
        <span class="badge ${profile.remote ? "warn" : "ok"}">${profile.remote ? "remoto" : "local"}</span>
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
  if (ts) ts.textContent = timestamp ? `Actualizado ${timestamp}` : "--";

  setTable(
    document.getElementById("usage-providers"),
    ["Proveedor", "Tokens", "Coste", "Reqs"],
    byProvider.map((item) => [
      item.name,
      item.tokens ?? "n/a",
      item.cost ?? "n/a",
      item.requests ?? "n/a",
    ])
  );
  setTable(
    document.getElementById("usage-models"),
    ["Modelo", "Tokens", "Coste"],
    byModel.map((item) => [item.name, item.tokens ?? "n/a", item.cost ?? "n/a"])
  );
  setTable(
    document.getElementById("usage-tools"),
    ["Herramienta", "Uso", "Coste"],
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
    button.textContent = "Ejecutar";
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

export const renderAgents = (state) => {
  const list = document.getElementById("agents-list");
  const empty = document.getElementById("agents-empty");
  const source = document.getElementById("agents-source");
  if (!list) return;
  const data = state.agentsData;
  if (source) {
    source.textContent = data?.source || "n/a";
  }
  if (!data?.agents?.length) {
    list.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  list.innerHTML = data.agents
    .map(
      (agent) => `
      <div class="card">
        <div class="section-header">
          <h4>${agent.name}</h4>
          <span class="badge ${agent.default ? "ok" : "warn"}">${
        agent.default ? "predeterminado" : "secundario"
      }</span>
        </div>
        <p class="muted">${agent.provider || "proveedor n/a"} · ${
        agent.model || "modelo n/a"
      }</p>
        <p class="muted">${agent.storage_path || "sin ruta"} · ${
        agent.disabled ? "deshabilitado" : "activo"
      }</p>
        <div class="inline wrap">
          <button class="btn secondary" data-action="default" data-name="${
            agent.name
          }">Marcar default</button>
          <button class="btn ghost" data-action="export" data-name="${
            agent.name
          }">Exportar</button>
          <button class="btn danger" data-action="delete" data-name="${agent.name}">Eliminar</button>
        </div>
      </div>
    `
    )
    .join("");
};

export const renderSkills = (state) => {
  const list = document.getElementById("skills-list");
  const empty = document.getElementById("skills-empty");
  const source = document.getElementById("skills-source");
  const requirements = document.getElementById("skills-requirements");
  if (!list) return;
  const data = state.skillsData;
  if (source) source.textContent = data?.source || "n/a";
  if (!data?.skills?.length) {
    list.innerHTML = "";
    if (empty) empty.style.display = "block";
    if (requirements) requirements.textContent = "Sin requisitos pendientes.";
    return;
  }
  if (empty) empty.style.display = "none";
  const missingCommands = [];
  const labelMap = {
    enabled: "habilitada",
    disabled: "deshabilitada",
    missing: "faltan requisitos",
  };
  list.innerHTML = data.skills
    .map((skill) => {
      if (skill.missing_requirements?.length) {
        skill.missing_requirements.forEach((req) => {
          if (req.command) missingCommands.push(req.command);
        });
      }
      return `
      <div class="card">
        <div class="section-header">
          <h4>${skill.name}</h4>
          <span class="badge ${
            skill.status === "enabled" ? "ok" : skill.status === "missing" ? "warn" : ""
          }">${labelMap[skill.status] || skill.status}</span>
        </div>
        <p class="muted">${skill.description || "Sin descripción"}</p>
        <div class="inline wrap">
          <button class="btn secondary" data-action="toggle" data-name="${
            skill.name
          }" data-enabled="${!skill.enabled}">
            ${skill.enabled ? "Desactivar" : "Activar"}
          </button>
        </div>
      </div>
    `;
    })
    .join("");
  if (requirements) {
    requirements.textContent = missingCommands.length
      ? missingCommands.join("\n")
      : "Sin requisitos pendientes.";
  }
};

export const renderConfig = (state) => {
  const config = state.configDetail || state.config;
  if (!config) return;
  const clawdeskText = document.getElementById("clawdesk-config");
  const openclawText = document.getElementById("openclaw-config");
  const perms = document.getElementById("config-perms");
  const openclawPerms = document.getElementById("openclaw-perms");
  if (clawdeskText && config.clawdesk?.config) {
    clawdeskText.value = JSON.stringify(config.clawdesk.config, null, 2);
  }
  if (openclawText) {
    openclawText.value = config.openclaw?.config ? JSON.stringify(config.openclaw.config, null, 2) : "";
  }
  if (perms && config.clawdesk?.permissions) {
    perms.textContent = config.clawdesk.permissions.mode;
    perms.className = `badge ${config.clawdesk.permissions.worldReadable ? "warn" : "ok"}`;
  }
  if (openclawPerms && config.openclaw?.permissions) {
    openclawPerms.textContent = config.openclaw.permissions.mode;
    openclawPerms.className = `badge ${
      config.openclaw.permissions.worldReadable ? "warn" : "ok"
    }`;
  }
};

export const renderSecurity = (state) => {
  const output = document.getElementById("security-output");
  if (!output) return;
  output.textContent = state.securityReport || "Ejecuta un audit o doctor para ver resultados.";
};

export const renderDiagnostics = (state) => {
  const diag = document.getElementById("diagnostics-summary");
  const healthChecks = document.getElementById("health-checks");
  if (!diag || !healthChecks) return;
  const health = state.health;
  if (!health) {
    diag.innerHTML = "<p class='muted'>Sin datos.</p>";
    healthChecks.innerHTML = "<p class='muted'>Sin datos.</p>";
    return;
  }
  diag.innerHTML = `
    <p><strong>Versión:</strong> ${health.version}</p>
    <p><strong>Uptime:</strong> ${health.uptime_s}s</p>
    <p><strong>OS:</strong> ${health.system?.platform} ${health.system?.release}</p>
    <p><strong>WSL:</strong> ${health.system?.is_wsl ? "sí" : "no"}</p>
  `;
  healthChecks.innerHTML = `
    <p><strong>Gateway:</strong> ${health.gateway?.status || "n/a"}</p>
    <p><strong>OpenClaw:</strong> ${
      health.openclaw?.version || (health.openclaw?.detected ? "detectado" : "no detectado")
    }</p>
    <p><strong>Latencia:</strong> ${health.gateway?.latency_ms || "--"} ms</p>
  `;
};
