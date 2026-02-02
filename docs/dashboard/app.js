const setActivePage = (page) => {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("active", section.id === `page-${page}`);
  });
  document.querySelectorAll(".tabstrip button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
};

document.querySelectorAll(".tabstrip button").forEach((button) => {
  button.addEventListener("click", () => setActivePage(button.dataset.page));
});
