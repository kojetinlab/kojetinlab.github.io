/* Exercise the actual navigation controller with deterministic browser events.
   This checks behavior, not CSS painting or a particular browser engine.
   An optional source path lets a regression be checked against an older release. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(
  process.argv[2] || path.join(__dirname, "../assets/js/site.js"),
  "utf8",
);

function fixture({ enabled = true, narrow = false, bottom = 102 } = {}) {
  const state = { bottom, reads: 0 };
  const frames = new Map();
  let frameId = 0;
  let document;
  class Events {
    listeners = new Map();
    addEventListener(name, callback, options) {
      const list = this.listeners.get(name) || [];
      list.push({ callback, options });
      this.listeners.set(name, list);
    }
    emit(name, event = {}) {
      for (const { callback } of this.listeners.get(name) || []) {
        callback({ target: this, preventDefault() {}, ...event });
      }
    }
  }
  class Element extends Events {
    constructor(tag = "div", classes = "") {
      super();
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.attributes = new Map();
      this.dataset = {};
      this.className = classes;
      this.classList = {
        add: (name) => this.classes.add(name),
        contains: (name) => this.classes.has(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, force = !this.classes.has(name)) => {
          if (force) this.classes.add(name);
          else this.classes.delete(name);
          return force;
        },
      };
    }
    set className(value) {
      this.classes = new Set(value.split(/\s+/).filter(Boolean));
    }
    get className() {
      return [...this.classes].join(" ");
    }
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }
    get href() {
      return new URL(this.getAttribute("href"), "https://example.test/lab/").href;
    }
    get pathname() {
      return new URL(this.href).pathname;
    }
    append(child) {
      this.children.push(child);
      child.parent = this;
    }
    prepend(child) {
      this.children.unshift(child);
      child.parent = this;
    }
    contains(target) {
      return this === target || this.children.some((child) => child.contains(target));
    }
    matches(selector) {
      if (selector === "a:not(.menu-home-link)")
        return this.tagName === "A" && !this.classes.has("menu-home-link");
      return selector.startsWith(".")
        ? this.classes.has(selector.slice(1))
        : this.tagName === selector.toUpperCase();
    }
    closest(selector) {
      return this.matches(selector) ? this : this.parent?.closest(selector);
    }
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [
        ...(child.matches(selector) ? [child] : []),
        ...child.querySelectorAll(selector),
      ]);
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
    focus(options) {
      document.activeElement = this;
      this.focusOptions = options;
    }
    getBoundingClientRect() {
      state.reads++;
      return { bottom: state.bottom };
    }
  }
  const root = new Element("html");
  root.dataset.persistentNavigation = String(enabled);
  const body = new Element("body", "layout-home");
  const header = new Element("header", "site-header");
  const wordmark = new Element("a", "wordmark");
  wordmark.setAttribute("href", "/lab/");
  const button = new Element("button", "menu-toggle");
  button.hidden = true;
  button.setAttribute("aria-expanded", "false");
  const nav = new Element("nav");
  for (const label of ["Research", "People", "Publications", "News", "Join us", "Contact"]) {
    const link = new Element("a");
    link.textContent = label;
    link.setAttribute("href", "/lab/" + label.toLowerCase().replace(" ", "-") + "/");
    nav.append(link);
  }
  const settings = new Element("details", "display-settings");
  const summary = new Element("summary");
  settings.append(summary);
  nav.append(settings);
  header.append(wordmark);
  header.append(button);
  header.append(nav);
  body.append(header);
  document = Object.assign(new Events(), {
    documentElement: root,
    body,
    activeElement: body,
    querySelector: (selector) => body.querySelector(selector),
    getElementById: (id) => (id === "navigation" ? nav : null),
    createElement: (tag) => new Element(tag),
  });
  const media = Object.assign(new Events(), { matches: narrow });
  // Deliberately never delivers a visibility notification. Scroll must work
  // even if this API exists but no useful boundary notification arrives.
  class SilentIntersectionObserver {
    observe() {}
  }
  const window = Object.assign(new Events(), {
    matchMedia: () => media,
    IntersectionObserver: SilentIntersectionObserver,
    location: { pathname: "/lab/" },
  });
  vm.runInNewContext(source, {
    document,
    window,
    IntersectionObserver: SilentIntersectionObserver,
    requestAnimationFrame(callback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    getComputedStyle: () => ({
      display: media.matches || header.classes.has("is-scrolled") ? "flex" : "none",
    }),
  });
  function flush() {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback());
  }
  function scrollTo(nextBottom) {
    state.bottom = nextBottom;
    window.emit("scroll");
    flush();
  }
  return {
    state,
    root,
    header,
    button,
    nav,
    settings,
    summary,
    document,
    window,
    media,
    frames,
    flush,
    scrollTo,
  };
}

const desktop = fixture();
assert.equal(desktop.header.classList.contains("is-scrolled"), false);
desktop.scrollTo(-250);
assert.equal(
  desktop.header.classList.contains("is-scrolled"),
  true,
  "scroll must reveal the menu without a visibility notification",
);
assert.equal(desktop.nav.classList.contains("is-menu-panel"), true);
assert.equal(desktop.window.listeners.get("scroll")[0].options.passive, true);
const before = desktop.state.reads;
for (let i = 0; i < 12; i++) desktop.window.emit("scroll");
assert.equal(desktop.state.reads, before);
assert.equal(desktop.frames.size, 1, "burst scrolling schedules only one frame");
desktop.flush();
assert.equal(desktop.state.reads, before + 1);
assert.equal(desktop.frames.size, 0, "no continuing animation loop while idle");

desktop.button.emit("click");
assert.equal(desktop.button.getAttribute("aria-expanded"), "true");
assert.equal(desktop.nav.querySelectorAll("a").length, 7);
assert.equal(desktop.nav.querySelector(".menu-home-link").getAttribute("href"), "/lab/");
desktop.settings.open = true;
desktop.header.emit("keydown", { key: "Escape" });
assert.equal(desktop.settings.open, false);
assert.equal(desktop.document.activeElement, desktop.summary);
assert.equal(desktop.button.getAttribute("aria-expanded"), "true");
desktop.header.emit("keydown", { key: "Escape" });
assert.equal(desktop.button.getAttribute("aria-expanded"), "false");
assert.equal(desktop.document.activeElement, desktop.button);
desktop.scrollTo(102);
assert.equal(desktop.header.classList.contains("is-scrolled"), false);
assert.equal(desktop.nav.classList.contains("is-menu-panel"), false);
assert.equal(desktop.document.activeElement.textContent, "Research");
assert.equal(desktop.document.activeElement.focusOptions.preventScroll, true);

desktop.scrollTo(0.25);
assert.equal(desktop.header.classList.contains("is-scrolled"), false);
desktop.scrollTo(-0.25);
assert.equal(desktop.header.classList.contains("is-scrolled"), true);
desktop.state.bottom = 50;
desktop.window.emit("resize");
desktop.flush();
assert.equal(desktop.header.classList.contains("is-scrolled"), false);
desktop.state.bottom = -400;
desktop.window.emit("pageshow");
assert.equal(desktop.header.classList.contains("is-scrolled"), true);

const restored = fixture({ bottom: -500 });
assert.equal(restored.header.classList.contains("is-scrolled"), true);
restored.button.emit("click");
restored.document.emit("click", { target: restored.document.body });
assert.equal(restored.button.getAttribute("aria-expanded"), "false");

const mobile = fixture({ narrow: true });
assert.equal(mobile.nav.classList.contains("is-menu-panel"), true);
mobile.scrollTo(-500);
mobile.scrollTo(88);
assert.equal(mobile.header.classList.contains("is-scrolled"), false);
assert.equal(mobile.nav.classList.contains("is-menu-panel"), true);
mobile.media.matches = false;
mobile.media.emit("change");
mobile.flush();
assert.equal(mobile.nav.classList.contains("is-menu-panel"), false);

const disabled = fixture({ enabled: false, narrow: true });
disabled.scrollTo(-500);
assert.equal(disabled.root.classList.contains("persistent-navigation"), false);
assert.equal(disabled.header.classList.contains("is-scrolled"), false);
assert.equal(disabled.window.listeners.has("scroll"), false);
disabled.button.emit("click");
assert.equal(
  disabled.button.getAttribute("aria-expanded"),
  "true",
  "the original mobile menu still works",
);
console.log(
  "Navigation passed: scroll without observer notifications, fractional boundary, coalescing, resize, restored position, keyboard focus, controls, Home path, mobile, and off switch.",
);
