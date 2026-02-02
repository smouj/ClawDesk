const state = {
  mode: "human",
  os: "linux",
  channel: "stable",
};

const commandEl = document.querySelector("#install-command code");
const payloadEl = document.querySelector("#agent-payload code");
const installTitle = document.getElementById("install-title");
const installBadge = document.getElementById("install-badge");
const copyButton = document.getElementById("copy-command");
const copyPayloadButton = document.getElementById("copy-payload");
const toast = document.getElementById("toast");

const baseInstaller =
  "curl -fsSL https://raw.githubusercontent.com/smouj/ClawDesk/main/scripts/install-remote.sh | bash";

const buildCommand = () => {
  const env = [];
  if (state.channel === "nightly") {
    env.push("CLAWDESK_CHANNEL=nightly");
  }
  if (state.os === "wsl") {
    env.push("CLAWDESK_WSL=1");
  }
  const prefix = env.length ? `${env.join(" ")} ` : "";
  return `${prefix}${baseInstaller}`;
};

const buildPayload = () => {
  const command = buildCommand();
  return [
    "Eres un agente de instalación. Ejecuta los pasos y devuelve TODO el output:",
    command,
    "clawdesk doctor",
    "clawdesk status",
  ].join("\n");
};

const updateView = () => {
  const command = buildCommand();
  const payload = buildPayload();
  const isAgent = state.mode === "agent";

  installTitle.textContent = isAgent ? "Payload para agentes" : "Instalar en 1 comando";
  installBadge.textContent = state.channel === "nightly" ? "Nightly" : "Stable";

  if (isAgent) {
    commandEl.textContent = payload;
  } else {
    commandEl.textContent = command;
  }

  payloadEl.textContent = payload;
};

const updateSegment = (selector, key) => {
  document.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(selector).forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      state[key] = button.dataset[key];
      updateView();
    });
  });
};

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("active");
  setTimeout(() => {
    toast.classList.remove("active");
  }, 1600);
};

updateSegment("[data-mode]", "mode");
updateSegment("[data-os]", "os");
updateSegment("[data-channel]", "channel");

const copyText = async (text) => {
  await navigator.clipboard.writeText(text);
};

copyButton?.addEventListener("click", async () => {
  try {
    const text = commandEl.textContent || "";
    await copyText(text);
    showToast("Copiado ✓");
  } catch {
    showToast("No se pudo copiar");
  }
});

copyPayloadButton?.addEventListener("click", async () => {
  try {
    const text = payloadEl.textContent || "";
    await copyText(text);
    showToast("Payload copiado ✓");
  } catch {
    showToast("No se pudo copiar");
  }
});

updateView();
