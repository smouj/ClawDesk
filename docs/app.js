const navItems = document.querySelectorAll(".nav-item");
const toggleButtons = document.querySelectorAll(".toggle-btn");
const wizardModal = document.getElementById("wizard-modal");
const launchWizard = document.getElementById("launch-wizard");
const closeWizard = document.getElementById("close-wizard");
const confirmWizard = document.getElementById("confirm-wizard");
const supportBundleButtons = document.querySelectorAll(
  "#support-bundle, #bundle-logs"
);
const views = document.querySelectorAll(".view");
const refreshButton = document.getElementById("refresh-view");
const openControlButton = document.getElementById("open-control-ui");
const gatewayRefresh = document.getElementById("gateway-refresh");

const rawToken = document.querySelector('meta[name="clawdesk-api-token"]')?.content;
const apiToken = rawToken && rawToken !== "__CLAWDESK_TOKEN__" ? rawToken : null;
const apiHeaders = apiToken
  ? {
      Authorization: `Bearer ${apiToken}`,
    }
  : {};

const apiFetch = async (path, options = {}) => {
  if (!apiToken) {
    throw new Error("API local no disponible. Ejecuta clawdesk run.");
  }
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...apiHeaders,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Error ${response.status}`);
  }
  if (response.headers.get("content-type")?.includes("application/json")) {
    return response.json();
  }
  return response.text();
};

const setActiveView = (viewName) => {
  navItems.forEach((nav) => {
    nav.classList.toggle("active", nav.dataset.view === viewName);
  });
  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
  const title = document.getElementById("view-title");
  const subtitle = document.getElementById("view-subtitle");
  const viewCopy = {
    dashboard: {
      title: "Mission Control",
      subtitle: "Estado operativo de tu gateway y agentes.",
    },
    agents: {
      title: "Agents",
      subtitle: "Gestiona agentes de OpenClaw en tiempo real.",
    },
    skills: {
      title: "Skills",
      subtitle: "Controla skills activas sin salir del dashboard.",
    },
    logs: {
      title: "Logs",
      subtitle: "Observabilidad local con filtros rápidos.",
    },
    settings: {
      title: "Settings",
      subtitle: "Wizard y configuración local del gateway.",
    },
  };
  if (viewCopy[viewName]) {
    title.textContent = viewCopy[viewName].title;
    subtitle.textContent = viewCopy[viewName].subtitle;
  }
};

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.view);
  });
});

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.nav));
});

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleButtons.forEach((toggle) => toggle.classList.remove("active"));
    button.classList.add("active");
  });
});

const openModal = () => {
  wizardModal.classList.add("active");
  wizardModal.setAttribute("aria-hidden", "false");
};

const closeModal = () => {
  wizardModal.classList.remove("active");
  wizardModal.setAttribute("aria-hidden", "true");
};

launchWizard?.addEventListener("click", openModal);
closeWizard?.addEventListener("click", closeModal);
confirmWizard?.addEventListener("click", closeModal);

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
};

const setBadge = (id, value, tone) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.classList.remove("ok", "warn", "error");
  if (tone) {
    el.classList.add(tone);
  }
};

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === "string") {
      return { id: item, name: item, status: "unknown" };
    }
    const id = item.id || item.name || item.slug || "unknown";
    return {
      id,
      name: item.name || item.id || item.slug || "unknown",
      status: item.status || item.state || "unknown",
      description: item.description || item.role || "",
    };
  });
};

const renderAgents = (agents) => {
  const container = document.getElementById("agent-list");
  const empty = document.getElementById("agent-empty");
  if (!container || !empty) return;
  container.innerHTML = "";
  if (!agents.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  agents.forEach((agent) => {
    const card = document.createElement("article");
    card.className = "card agent-card";
    card.innerHTML = `
      <div class="agent-title">
        <div class="avatar neon">${agent.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h3>${agent.name}</h3>
          <p>${agent.description || "Agent"}</p>
        </div>
      </div>
      <div class="agent-meta">
        <span class="badge">${agent.status}</span>
        <span class="badge">ID: ${agent.id}</span>
      </div>
      <div class="card-actions">
        <button class="mini" data-action="start">Start</button>
        <button class="mini" data-action="stop">Stop</button>
        <button class="mini" data-action="restart">Restart</button>
      </div>
    `;
    card.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.action;
        try {
          await apiFetch(`/api/agents/${encodeURIComponent(agent.id)}/${action}`, {
            method: "POST",
          });
          await loadAgents();
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      });
    });
    container.appendChild(card);
  });
};

const renderSkills = (skills) => {
  const container = document.getElementById("skill-list");
  const empty = document.getElementById("skill-empty");
  if (!container || !empty) return;
  container.innerHTML = "";
  if (!skills.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  skills.forEach((skill) => {
    const card = document.createElement("article");
    card.className = "card agent-card";
    card.innerHTML = `
      <div class="agent-title">
        <div class="avatar pink">${skill.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h3>${skill.name}</h3>
          <p>${skill.description || "Skill"}</p>
        </div>
      </div>
      <div class="agent-meta">
        <span class="badge">${skill.status}</span>
        <span class="badge">ID: ${skill.id}</span>
      </div>
      <div class="card-actions">
        <button class="mini" data-action="enable">Enable</button>
        <button class="mini" data-action="disable">Disable</button>
      </div>
    `;
    card.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.action;
        try {
          await apiFetch(`/api/skills/${encodeURIComponent(skill.id)}/${action}`, {
            method: "POST",
          });
          await loadSkills();
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      });
    });
    container.appendChild(card);
  });
};

let lastLogs = [];

const renderLogs = () => {
  const stream = document.getElementById("log-stream");
  if (!stream) return;
  const levelFilter = document.getElementById("log-level")?.value || "all";
  const searchTerm = document.getElementById("log-search")?.value?.toLowerCase() || "";
  stream.innerHTML = "";
  const filtered = lastLogs.filter((line) => {
    const matchesLevel = levelFilter === "all" || line.includes(levelFilter);
    const matchesSearch = !searchTerm || line.toLowerCase().includes(searchTerm);
    return matchesLevel && matchesSearch;
  });
  filtered.forEach((line) => {
    const p = document.createElement("p");
    p.textContent = line;
    stream.appendChild(p);
  });
};

const loadLogs = async () => {
  try {
    const data = await apiFetch("/api/logs?tail=200");
    lastLogs = data.lines || [];
    renderLogs();
  } catch (error) {
    lastLogs = [`Error: ${error.message}`];
    renderLogs();
  }
};

const loadGatewayStatus = async () => {
  try {
    const data = await apiFetch("/api/gateway/status");
    setBadge("gateway-status", "UP", "ok");
    setText("gateway-summary", data.status || "OK");
    setText("last-activity", new Date().toLocaleTimeString());
  } catch (error) {
    setBadge("gateway-status", "DOWN", "error");
    setText("gateway-summary", error.message);
    setText("last-activity", "--");
  }
};

const loadOpenClawVersion = async () => {
  try {
    const data = await apiFetch("/api/openclaw/version");
    setText("openclaw-version", data.version || "detectado");
    setText("detect-openclaw", `Detectado: ${data.version}`);
    setText("modal-openclaw", data.version || "OK");
  } catch (error) {
    setText("openclaw-version", "no detectado");
    setText("detect-openclaw", "OpenClaw no encontrado en PATH.");
    setText("modal-openclaw", "No detectado");
  }
};

const loadConfig = async () => {
  try {
    const data = await apiFetch("/api/config");
    setText("config-host", data.app.host);
    setText("config-port", data.app.port);
    setText("config-gateway", data.gateway.url);
    setText("config-token", data.gateway.token_path);
    setText("config-actions", data.allow_actions.join(", "));
    setText("detect-gateway", `Sugerencia: ${data.gateway.url}`);
    setText("detect-token", `Ruta detectada: ${data.gateway.token_path}`);
    setText("modal-gateway", data.gateway.url);
    setText("modal-token", data.gateway.token_path);
    setText("allow-actions", data.allow_actions.length);
  } catch (error) {
    setText("config-host", "--");
    setText("config-port", "--");
    setText("config-gateway", "--");
    setText("config-token", "--");
    setText("config-actions", "--");
  }
};

const loadAgents = async () => {
  try {
    const data = await apiFetch("/api/agents");
    const items = normalizeItems(data.agents || []);
    renderAgents(items);
    setText("agent-count", items.length);
    setText("agent-total", items.length);
  } catch (error) {
    renderAgents([]);
    setText("agent-count", "0");
    setText("agent-total", "0");
  }
};

const loadSkills = async () => {
  try {
    const data = await apiFetch("/api/skills");
    const items = normalizeItems(data.skills || []);
    renderSkills(items);
  } catch (error) {
    renderSkills([]);
  }
};

const updateWizardStatus = async () => {
  try {
    await apiFetch("/api/health");
    setText("detect-test", "Conexión validada.");
    setBadge("modal-test", "OK", "ok");
  } catch (error) {
    setText("detect-test", "No se pudo validar la conexión.");
    setBadge("modal-test", "ERROR", "error");
  }
};

const refreshAll = async () => {
  if (!apiToken) {
    setText("detect-openclaw", "API local no disponible. Ejecuta clawdesk run.");
    setText("detect-gateway", "Sugerencia: http://127.0.0.1:18789");
    setText("detect-token", "Ruta detectada: ~/.config/openclaw/gateway.auth.token");
    setText("detect-test", "Conexión no disponible.");
    setBadge("modal-test", "OFFLINE", "warn");
    setBadge("gateway-status", "OFF", "warn");
    return;
  }
  await Promise.all([
    loadConfig(),
    loadOpenClawVersion(),
    loadGatewayStatus(),
    loadAgents(),
    loadSkills(),
    loadLogs(),
    updateWizardStatus(),
  ]);
};

refreshButton?.addEventListener("click", () => {
  const activeView = document.querySelector(".view.active")?.dataset.view;
  if (activeView === "logs") {
    loadLogs();
  } else if (activeView === "agents") {
    loadAgents();
  } else if (activeView === "skills") {
    loadSkills();
  } else {
    refreshAll();
  }
});

gatewayRefresh?.addEventListener("click", () => {
  loadGatewayStatus();
});

openControlButton?.addEventListener("click", async () => {
  if (!apiToken) {
    alert("API local no disponible. Ejecuta clawdesk run.");
    return;
  }
  try {
    const data = await apiFetch("/api/gateway/control-url");
    window.open(data.url, "_blank", "noopener,noreferrer");
  } catch (error) {
    alert(`No se pudo abrir el Control UI: ${error.message}`);
  }
});

supportBundleButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!apiToken) {
      alert("API local no disponible. Ejecuta clawdesk run.");
      return;
    }
    try {
      const response = await fetch("/api/support-bundle", {
        method: "POST",
        headers: apiHeaders,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clawdesk-support-bundle-${new Date().toISOString().slice(0, 10)}.tar.gz`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error al generar bundle: ${error.message}`);
    }
  });
});

const searchInput = document.getElementById("agent-search");
const agentFilter = document.getElementById("agent-filter");

const filterAgents = () => {
  const container = document.getElementById("agent-list");
  if (!container) return;
  const term = (searchInput?.value || "").toLowerCase();
  const status = agentFilter?.value || "all";
  container.querySelectorAll(".agent-card").forEach((card) => {
    const text = card.textContent.toLowerCase();
    const statusBadge = card.querySelector(".agent-meta .badge");
    const cardStatus = statusBadge ? statusBadge.textContent.toLowerCase() : "";
    const matchesTerm = !term || text.includes(term);
    const matchesStatus = status === "all" || cardStatus.includes(status);
    card.style.display = matchesTerm && matchesStatus ? "" : "none";
  });
};

searchInput?.addEventListener("input", filterAgents);
agentFilter?.addEventListener("change", filterAgents);

const logLevel = document.getElementById("log-level");
const logSearch = document.getElementById("log-search");
const refreshLogs = document.getElementById("refresh-logs");
const exportLogs = document.getElementById("export-logs");

logLevel?.addEventListener("change", renderLogs);
logSearch?.addEventListener("input", renderLogs);
refreshLogs?.addEventListener("click", loadLogs);

exportLogs?.addEventListener("click", () => {
  const content = lastLogs.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clawdesk-logs-${new Date().toISOString().slice(0, 10)}.log`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

const launchDashboard = document.getElementById("launch-dashboard");
launchDashboard?.addEventListener("click", () => setActiveView("dashboard"));

const tailscaleGuide = document.getElementById("tailscale-guide");
const sshGuide = document.getElementById("ssh-guide");

if (tailscaleGuide) {
  tailscaleGuide.addEventListener("click", () => {
    window.open("https://tailscale.com/kb/", "_blank", "noopener,noreferrer");
  });
}
if (sshGuide) {
  sshGuide.addEventListener("click", () => {
    window.open("https://www.ssh.com/academy/ssh/tunneling", "_blank", "noopener,noreferrer");
  });
}

refreshAll();
