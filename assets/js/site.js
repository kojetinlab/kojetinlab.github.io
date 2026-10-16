(() => {
  document.documentElement.classList.add("js");
  const button = document.querySelector(".menu-toggle");
  const nav = document.getElementById("navigation");
  if (!button || !nav) return;
  button.hidden = false;
  const close = () => {
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  };
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  const settings = nav.querySelector(".display-settings");
  document.addEventListener("click", (event) => {
    if (settings && !settings.contains(event.target)) settings.open = false;
  });
  nav.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settings?.open) {
      settings.open = false;
      settings.querySelector("summary").focus();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      close();
      button.focus();
    }
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
})();
