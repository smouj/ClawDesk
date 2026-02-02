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

const repoUrl = "https://github.com/smouj/ClawDesk.git";
const channelMap = {
  stable: "main",
  nightly: "main",
};

const buildCommand = () => {
  const ref = channelMap[state.channel] || "main";
  const lines = [
    `git clone --depth 1 --branch ${ref} ${repoUrl}`,
    "cd ClawDesk",
  ];
  const installLine = state.os === "wsl" ? "CLAWDESK_WSL=1 ./install.sh" : "./install.sh";
  lines.push(installLine);
  return lines.join("\n");
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

  installTitle.textContent = isAgent ? "Payload para agentes" : "Instalar con git clone";
  installBadge.textContent = "Git";

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
