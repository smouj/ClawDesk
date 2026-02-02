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

const toastQueue = [];
let toastActive = false;
const MAX_TOAST_QUEUE = 3;
const TOAST_DURATION = 2400;
const TOAST_GAP = 220;

const renderToast = ({ message, tone }) => {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  toastActive = true;
  setTimeout(() => {
    toast.className = "toast";
    toastActive = false;
    if (toastQueue.length) {
      setTimeout(() => renderToast(toastQueue.shift()), TOAST_GAP);
    }
  }, TOAST_DURATION);
};

export const showToast = (message, tone = "") => {
  if (!message) return;
  if (toastActive) {
    if (toastQueue.length >= MAX_TOAST_QUEUE) {
      toastQueue.shift();
    }
    toastQueue.push({ message, tone });
    return;
  }
  renderToast({ message, tone });
};

export const debounce = (fn, wait = 200) => {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
};
