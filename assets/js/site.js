(() => {
  document.documentElement.classList.add("js");
  const button = document.querySelector(".menu-toggle");
  const nav = document.getElementById("navigation");
  if (!button || !nav) return;
  const header = button.closest(".site-header");
  const settings = nav.querySelector(".display-settings");
  button.hidden = false;
  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    if (!open && settings) settings.open = false;
  };
  const close = () => setOpen(false);
  button.addEventListener("click", () => {
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("click", (event) => {
    if (settings && !settings.contains(event.target)) settings.open = false;
    if (!nav.contains(event.target) && !button.contains(event.target)) close();
  });
  header.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && settings?.open) {
      settings.open = false;
      settings.querySelector("summary").focus();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      close();
      if (getComputedStyle(button).display !== "none") button.focus({ preventScroll: true });
      event.preventDefault();
    }
  });
  document.addEventListener("focusin", (event) => {
    if (!nav.contains(event.target) && !button.contains(event.target)) close();
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));

  // Reuse the original menu and display controls, so there is one set of links,
  // one keyboard tab order, and no duplicate IDs or preference controls.
  if (document.documentElement.dataset.persistentNavigation !== "true") return;
  document.documentElement.classList.add("persistent-navigation");
  // The wordmark normally provides Home. Include that destination in the
  // collapsed panel too, without altering a customized header template.
  const wordmark = header.querySelector(".wordmark");
  if (wordmark && !Array.from(nav.querySelectorAll("a")).some((a) => a.href === wordmark.href)) {
    const home = document.createElement("a");
    home.setAttribute("href", wordmark.getAttribute("href"));
    home.textContent = "Home";
    home.className = "menu-home-link";
    if (document.body.classList.contains("layout-home")) home.setAttribute("aria-current", "page");
    home.addEventListener("click", close);
    nav.prepend(home);
  }
  const narrow = window.matchMedia("(max-width: 1180px)");
  let floating = null;
  let positionFrame = null;

  const updateLayout = () => {
    const panel = floating || narrow.matches;
    const hadPanel = nav.classList.contains("is-menu-panel");
    const focused = document.activeElement;
    header.classList.toggle("is-scrolled", floating);
    nav.classList.toggle("is-menu-panel", panel);
    if (panel && !hadPanel) setOpen(nav.contains(focused));
    if (!panel && hadPanel) {
      close();
      // Keep keyboard focus visible if the desktop layout hides its button.
      if (focused === button) {
        nav.querySelector("a:not(.menu-home-link)")?.focus({ preventScroll: true });
      } else if (focused.classList.contains("menu-home-link")) {
        wordmark?.focus({ preventScroll: true });
      }
    }
  };

  // The header stays in normal document flow. Only its button and open panel
  // become fixed, preserving the molecular story's existing scroll geometry.
  const updatePosition = () => {
    const nextFloating = header.getBoundingClientRect().bottom <= 0;
    const nextPanel = nextFloating || narrow.matches;
    if (nextFloating !== floating || nextPanel !== nav.classList.contains("is-menu-panel")) {
      floating = nextFloating;
      updateLayout();
    }
  };
  // Check actual scroll position in every browser, rather than relying on an
  // IntersectionObserver notification at the header's visibility boundary.
  // Coalesce scroll events into one geometry read per animation frame, and
  // only update the menu when its layout state actually changes.
  const schedulePosition = () => {
    if (positionFrame !== null) return;
    positionFrame = requestAnimationFrame(() => {
      positionFrame = null;
      updatePosition();
    });
  };
  updatePosition();
  narrow.addEventListener("change", schedulePosition);
  window.addEventListener("scroll", schedulePosition, { passive: true });
  window.addEventListener("resize", schedulePosition, { passive: true });
  window.addEventListener("pageshow", updatePosition);
})();
