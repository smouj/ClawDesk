export const setLcd = (el, text) => {
  if (el) el.textContent = text;
};

export const pulseVu = (el, level = 3) => {
  if (!el) return;
  const bars = Array.from(el.querySelectorAll("span"));
  bars.forEach((bar, index) => {
    bar.style.background = index < level ? "rgba(107, 255, 122, 0.8)" : "rgba(107, 255, 122, 0.2)";
  });
};

export const showToast = (message, tone = "") => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  setTimeout(() => {
    toast.className = "toast";
  }, 2800);
};
