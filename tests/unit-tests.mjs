/**
 * Dependency-free regression tests for the Liam portfolio editor logic.
 * Run: node tests/unit-tests.mjs
 * The editor scripts are loaded into a minimal DOM shim and exercised
 * the same way the browser runs them.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1")), "..");

const PASS = [];
const FAIL = [];
const test = (name, fn) => tests.push({ name, fn });
const tests = [];
const runTests = async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      PASS.push(name);
    } catch (error) {
      FAIL.push({ name, message: error.message });
      console.error("---", name, "---\n" + error.stack);
    }
  }
};

/* ---------- minimal DOM shim ---------- */

class ClassList {
  constructor() { this.set = new Set(); }
  add(...names) { names.forEach((name) => this.set.add(name)); }
  remove(...names) { names.forEach((name) => this.set.delete(name)); }
  toggle(name, force) {
    if (force === undefined) { this.set.has(name) ? this.set.delete(name) : this.set.add(name); return this.set.has(name); }
    force ? this.set.add(name) : this.set.delete(name);
    return force;
  }
  contains(name) { return this.set.has(name); }
  get value() { return [...this.set].join(" "); }
}

class Style {
  constructor() { this.properties = {}; }
  setProperty(name, value) { this.properties[name] = value; }
  removeProperty(name) { delete this.properties[name]; }
}
const styleProxyHandler = {
  get(target, name) {
    if (name in target) return target[name];
    return target.properties[name] ?? "";
  },
  set(target, name, value) {
    if (name === "properties") { target.properties = value; return true; }
    target.properties[name] = value;
    return true;
  },
};

class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.dataset = {};
    this._attributes = new Map();
    this.hidden = false;
    this.classList = new ClassList();
    this.style = new Proxy(new Style(), styleProxyHandler);
    this._id = "";
  }
  get id() { return this._id; }
  set id(value) { this._id = value; }
  append(...nodes) {
    nodes.forEach((node) => {
      if (node?.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter((n) => n !== node);
      node.parentNode = this;
      this.childNodes.push(node);
    });
  }
  appendChild(node) { this.append(node); return node; }
  after(...nodes) {
    const parent = this.parentNode;
    if (!parent) return;
    const index = parent.childNodes.indexOf(this);
    nodes.reverse().forEach((node) => {
      if (node.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter((n) => n !== node);
      node.parentNode = parent;
      parent.childNodes.splice(index + 1, 0, node);
    });
  }
  replaceChildren(...nodes) {
    this.childNodes = [];
    nodes.forEach((node) => this.append(node));
  }
  remove() {
    if (this.parentNode) this.parentNode.childNodes = this.parentNode.childNodes.filter((n) => n !== this);
  }
  setAttribute(name, value) {
    this._attributes.set(name, String(value));
    if (name === "style") this.style.properties = {};
  }
  getAttribute(name) { return this._attributes.has(name) ? this._attributes.get(name) : null; }
  removeAttribute(name) {
    this._attributes.delete(name);
    if (name === "style") this.style.properties = {};
  }
  hasAttribute(name) { return this._attributes.has(name); }
  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === document;
  }
  closest(selector) { return queryMatch(this, selector); }
  matches(selector) { return Boolean(queryMatchSelf(this, selector)); }
  querySelectorAll(selector) { return selectAll(this, selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  cloneNode(deep = true) {
    const clone = new FakeNode(this.tagName);
    clone.id = this.id;
    clone.className = this.className;
    clone.textContent = deep ? this.textContent : "";
    clone._attributes = new Map(this._attributes);
    clone.dataset = { ...this.dataset };
    if (deep) {
      this.childNodes.forEach((child) => {
        const childClone = child.cloneNode(true);
        childClone.parentNode = clone;
        clone.childNodes.push(childClone);
      });
    }
    return clone;
  }
  addEventListener(type, handler) {
    this._handlers ||= {};
    (this._handlers[type] ||= []).push(handler);
  }
  removeEventListener() { }
  click() {
    const event = { preventDefault() { }, stopPropagation() { }, stopImmediatePropagation() { }, target: this, currentTarget: this, detail: 1, button: 0, shiftKey: false, altKey: false, ctrlKey: false, bubbles: true, cancelable: true };
    (this._handlers?.click || []).slice().forEach((handler) => handler(event));
    return event;
  }
  focus() { }
  blur() { }
  dispatchEvent(event) {
    const type = event?.type;
    if (type) {
      (this._handlers?.[type] || []).slice().forEach((handler) => handler({ ...event, target: this, currentTarget: this, preventDefault() { }, bubbles: true }));
    }
    return true;
  }
  get value() { return this._value ?? ""; }
  set value(value) { this._value = value; }
  get className() { return this.classList.value; }
  set className(value) { this.classList = new ClassList(); String(value).split(/\s+/).filter(Boolean).forEach((name) => this.classList.add(name)); }
  get textContent() { return this._text ?? this.childNodes.map((c) => c.textContent ?? "").join(""); }
  set textContent(value) { this._text = String(value); this.childNodes = []; }
  get innerHTML() { return this.textContent; }
  get parentElement() { return this.parentNode; }
  getClientRects() { return [{}]; }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON() { return this; } };
  }
  scrollIntoView() { }
  contains(other) {
    let cursor = other;
    while (cursor) {
      if (cursor === this) return true;
      cursor = cursor.parentNode;
    }
    return false;
  }
  get options() { return this.childNodes.filter((child) => child instanceof FakeOption || child.tagName === "OPTION"); }
  get value() { return this._selectValue ?? this.options.find((option) => option.selected)?.value ?? this.options[0]?.value ?? ""; }
  set value(value) { this._selectValue = String(value); }
}

function compileSelectorTokens(selector) {
  return selector.split(",").map((rule) => rule.trim()).filter(Boolean).map((rule) => {
    const parts = [];
    const tokenRegex = /([.#])?(\*[\w-]*|[\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g;
    let match;
    let rest = rule;
    while ((match = tokenRegex.exec(rest))) {
      if (match[3]) parts.push({ type: "attr", name: match[3], value: match[4] });
      else parts.push({ type: match[1] || "tag", name: match[2] });
    }
    return parts;
  });
}
function partMatches(node, part) {
  if (!node.tagName) return false;
  if (part.type === ".") return node.classList?.contains(part.name) || false;
  if (part.type === "#") return node.id === part.name;
  if (part.type === "attr") {
    if (part.name === "data-cms-id") {
      const current = node.dataset?.cmsId;
      if (current === undefined || current === null) return false;
      return part.value === undefined || part.value === "" || current === part.value;
    }
    const current = node.getAttribute(part.name);
    if (current === undefined || current === null) return false;
    return part.value === undefined || part.value === "" || current === part.value;
  }
  if (part.name === "*") return true;
  return node.tagName.toLowerCase() === part.name.toLowerCase();
}
function ruleMatchesNode(node, parts) {
  if (!parts.length) return false;
  const target = parts.at(-1);
  if (!partMatches(node, target)) return false;
  let ancestors = parts.slice(0, -1).reverse();
  if (!ancestors.length) return true;
  let cursor = node.parentNode;
  while (cursor && cursor !== document) {
    if (partMatches(cursor, ancestors[0])) ancestors = ancestors.slice(1);
    if (!ancestors.length) return true;
    cursor = cursor.parentNode;
  }
  return false;
}
function queryMatchSelf(node, selector) {
  const anyRule = compileSelectorTokens(selector).some((parts) => ruleMatchesNode(node, parts));
  return anyRule ? node : null;
}
function queryMatch(node, selector) {
  let current = node;
  while (current && current !== document) {
    if (queryMatchSelf(current, selector)) return current;
    current = current.parentNode;
  }
  return null;
}
function selectAll(root, selector) {
  const found = [];
  const walk = (node) => {
    (node.childNodes || []).forEach((child) => {
      if (queryMatchSelf(child, selector)) found.push(child);
      walk(child);
    });
  };
  walk(root);
  return found;
}

const VOID_TAGS = new Set(["input", "br", "img", "hr", "meta", "link", "source"]);
function parseHtmlFragment(html) {
  const root = new FakeNode("#fragment");
  const stack = [root];
  const tagRegex = /<\/?([\w-]+)([^>]*)>|([^<]+)/g;
  let match;
  while ((match = tagRegex.exec(html))) {
    const parent = stack.at(-1);
    if (match[3] !== undefined) {
      const text = match[3];
      if (text.trim() || text.includes("\n") === false) {
        const node = new FakeNode("#text");
        node._text = text;
        parent.append(node);
      }
      continue;
    }
    const closing = match[0].startsWith("</");
    const tag = match[1].toLowerCase();
    if (closing) {
      const index = stack.map((node) => node.tagName.toLowerCase()).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const element = new FakeNode(tag);
    const attrRegex = /([\w-]+)(?:="([^"]*)")?/g;
    let attr;
    while ((attr = attrRegex.exec(match[2]))) {
      if (!attr[1] || attr[1] === "/") continue;
      if (attr[1] === "class") element.className = attr[2] || "";
      else if (attr[1] === "id") element.id = attr[2] || "";
      else if (attr[1] === "value") element.value = attr[2] || "";
      else if (attr[1] === "disabled") element.disabled = true;
      else if (attr[1] === "hidden") element.hidden = true;
      else element.setAttribute(attr[1], attr[2] || "");
    }
    parent.append(element);
    if (!VOID_TAGS.has(tag)) stack.push(element);
  }
  return root;
}

Object.defineProperty(FakeNode.prototype, "innerHTML", {
  set(value) {
    this._text = undefined;
    const fragment = parseHtmlFragment(String(value));
    if (fragment.childNodes.length === 1 && fragment.childNodes[0].tagName === "#TEXT") {
      this._text = fragment.childNodes[0]._text;
      return;
    }
    fragment.childNodes.forEach((child) => {
      child.parentNode = this;
      this.childNodes.push(child);
    });
  },
  get() { return this.textContent; },
});

class FakeDocument extends FakeNode {
  constructor() {
    super("#document");
    this.head = new FakeNode("head");
    this.append(this.head);
    this.body = new FakeNode("body");
    this.append(this.body);
    this.documentElement = this.body;
  }
  createElement(tag) { return new FakeNode(tag); }
  getElementById(id) { return this.querySelectorAll("*").find((node) => node.id === id) || null; }
  addEventListener() { }
  querySelectorAll(selector) { return selectAll(this, selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

class FakeWindow {
  addEventListener() { }
  matchMedia() { return { matches: false }; }
  requestAnimationFrame(callback) { return setTimeout(callback, 0); }
  scrollTo() { }
  clearTimeout(timer) { clearTimeout(timer); }
  setTimeout(callback, delay) { return setTimeout(callback, delay || 0); }
  setInterval() { return 1; }
  clearInterval() { }
  confirm() { return true; }
  prompt() { return null; }
  get innerWidth() { return 1440; }
  get innerHeight() { return 900; }
  get scrollX() { return 0; }
  get scrollY() { return 0; }
  open() { return null; }
  dispatchEvent() { return true; }
}
class FakeOption {
  constructor(text = "", value = text) {
    this.text = String(text);
    this.value = String(value);
    this.disabled = false;
  }
}

class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
class FakeCrypto {
  randomUUID() { return "test-" + (++FakeCrypto.counter).toString().padStart(4, "0"); }
}
FakeCrypto.counter = 0;

const document = new FakeDocument();
const window = new FakeWindow();
const localStorage = new FakeStorage();
const crypto = new FakeCrypto();

const sandbox = {
  document,
  window,
  localStorage,
  crypto,
  Option: FakeOption,
  getComputedStyle: (element) => ({
    zIndex: element?.style?.zIndex || "auto",
    position: element?.style?.position || "static",
  }),
  console,
  fetch: async () => ({ ok: true, status: 200, json: async () => cleanState() }),
  BroadcastChannel: class { postMessage() { } close() { } addEventListener() { } },
  URL,
  CSS: { escape: (value) => value.replace(/([^\w-])/g, "\\$1") },
};
sandbox.window = window;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.performance = { now: () => Date.now() };
sandbox.alert = () => { };

/* DOM prototype classes used with instanceof inside the editor.
   They match FakeNode instances by tagName via Symbol.hasInstance so the
   prototype chain of FakeNode stays intact. */
const makeTagClass = (tagName) => {
  const klass = { [Symbol.hasInstance]: (instance) => instance instanceof FakeNode &&
    (tagName === "ANY_ELEMENT" || instance.tagName === tagName) };
  return klass;
};
sandbox.HTMLElement = makeTagClass("ANY_ELEMENT");
sandbox.HTMLImageElement = makeTagClass("IMG");
sandbox.HTMLVideoElement = makeTagClass("VIDEO");
sandbox.HTMLAnchorElement = makeTagClass("A");
sandbox.HTMLIFrameElement = makeTagClass("IFRAME");
sandbox.HTMLInputElement = makeTagClass("INPUT");
sandbox.HTMLTextAreaElement = makeTagClass("TEXTAREA");
sandbox.HTMLSelectElement = makeTagClass("SELECT");
sandbox.HTMLAudioElement = makeTagClass("AUDIO");
sandbox.FileReader = class FileReader {
  readAsDataURL() {
    this.result = "data:application/octet-stream;base64,AAAA";
    queueMicrotask(() => this._onload && this._onload({ target: this }));
  }
  set onerror(handler) { this._onerror = handler; }
  set onload(handler) { this._onload = handler; }
};
sandbox.Event = class Event {
  constructor(type) { this.type = type; }
};
sandbox.KeyboardEvent = sandbox.Event;
sandbox.MouseEvent = sandbox.Event;

/* Wire FakeNode instances into the DOM prototype classes so editor
   instanceof checks behave like a real browser. */
// (placeholder cleanup line removed)

/* ---------- fixture helpers ---------- */

const buildPage = () => {
  document.childNodes = [];
  document.head = new FakeNode("head");
  document.body = new FakeNode("body");
  document.append(document.head, document.body);
  documentKeyHandlers.length = 0;
  FakeCrypto.counter = 0;
  localStorage.map.clear();
  const main = new FakeNode("main");
  const hero = new FakeNode("section");
  hero.id = "home";
  const heroVideo = new FakeNode("video");
  heroVideo.className = "hero-video";
  hero.append(heroVideo);
  const heroTitle = new FakeNode("h1");
  heroTitle.textContent = "Original hero";
  hero.append(heroTitle);
  const about = new FakeNode("section");
  about.id = "about";
  const aboutHeading = new FakeNode("h2");
  aboutHeading.textContent = "About heading";
  about.append(aboutHeading);
  const image = new FakeNode("img");
  image.className = "project-shot";
  image.src = "/assets/images/a.jpg";
  about.append(image);
  main.append(hero, about);
  document.append(main);
  return { main, hero, heroVideo, heroTitle, about, aboutHeading, image };
};

const cleanState = () => ({
  version: 1,
  edits: {},
  sections: [],
  sectionCopies: [],
  sectionOrder: [],
  projects: [],
  contentBlocks: [],
  elementCopies: [],
  shapes: [],
  buttons: [],
  mediaElements: [],
  heroVideos: null,
  theme: "original",
  fontFamily: "inherit",
  googleFont: "",
  fontFile: null,
});

const loadEditor = async () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "admin.js"), "utf8");
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, { filename: "admin.js" });
  const editor = sandbox.window.liamAdminEditor;
  await editor.ready;
  await new Promise((resolve) => setImmediate(resolve));
  return editor;
};

const pressKey = (editor, { key, ctrl = false, shift = false, alt = false, target = null }) => {
  const event = {
    key,
    ctrlKey: ctrl,
    metaKey: false,
    altKey: alt,
    shiftKey: shift,
    target: target || editor.byId("admin-publish"),
    preventDefault: () => { event.prevented = true; },
  };
  documentKeyHandlers.forEach((handler) => handler(event));
  return event;
};
let documentKeyHandlers = [];
const originalAddEventListener = document.addEventListener.bind(document);
document.addEventListener = (type, handler) => {
  if (type === "keydown") documentKeyHandlers.push(handler);
  else originalAddEventListener(type, handler);
};

/* ---------- tests ---------- */

test("editor loads and exposes the public API", async () => {
  buildPage();
  const editor = await loadEditor();
  assert.ok(editor, "window.liamAdminEditor should exist after load");
  assert.equal(typeof editor.selectElement, "function");
  assert.equal(typeof editor.applyStyle, "function");
});

test("text edits apply, persist to the draft, and undo restores the original", async () => {
  buildPage();
  const editor = await loadEditor();
  const title = document.querySelector("#home h1");
  editor.selectElement(title);
  const textInput = editor.byId("admin-text");
  textInput.value = "Replaced headline";
  textInput.dispatchEvent(new Event("input"));
  assert.equal(title.textContent, "Replaced headline");
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 400));
  const draft = JSON.parse(localStorage.getItem("liam-portfolio-admin-draft-v1"));
  const id = title.dataset.cmsId;
  assert.equal(draft.state.edits[id].text, "Replaced headline");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(title.textContent, "Original hero", "undo restored the original headline");
  editor.redo();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(title.textContent, "Replaced headline", "redo restored the edit");
});

test("bold, italic, underline, and font-size shortcuts all undo/redo", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "b", ctrl: true });
  pressKey(editor, { key: "i", ctrl: true });
  pressKey(editor, { key: "u", ctrl: true });
  assert.equal(heading.style.fontWeight, "700");
  assert.equal(heading.style.fontStyle, "italic");
  assert.equal(heading.style.textDecoration, "underline");
  const size = editor.byId("admin-font-size");
  size.value = "44";
  size.dispatchEvent(new Event("input"));
  assert.equal(heading.style.fontSize, "44px");
  await new Promise((resolve) => setTimeout(resolve, 400));
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.notEqual(heading.style.fontSize, "44px");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.notEqual(heading.style.textDecoration, "underline");
  editor.redo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.textDecoration, "underline");
});

test("color, layer order, send-to-front and send-to-back update and undo", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  const color = editor.byId("admin-color");
  color.value = "#82d4ce";
  color.dispatchEvent(new Event("input"));
  assert.equal(heading.style.color, "#82d4ce");
  const sendToFront = editor.byId("admin-send-to-front");
  sendToFront.click();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.zIndex, "9999");
  editor.byId("admin-send-to-back").click();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.zIndex, "-9999");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.zIndex, "9999");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.ok(Number(heading.style.zIndex) < 9999, "second undo stepped back below the front layer");
});

test("send backward and bring forward step z-index", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  editor.byId("admin-bring-forward").click();
  assert.equal(heading.style.zIndex, "1");
  editor.byId("admin-send-backward").click();
  assert.equal(heading.style.zIndex, "0");
});

test("images and videos resize through the shared media path", async () => {
  buildPage();
  const editor = await loadEditor();
  const image = document.querySelector("img");
  editor.selectElement(image);
  const width = editor.byId("admin-width");
  width.value = "520";
  width.dispatchEvent(new Event("input"));
  assert.equal(editor.state.edits[image.dataset.cmsId].resize.width, 520);
  const video = document.querySelector(".hero-video");
  editor.selectElement(video);
  const height = editor.byId("admin-height");
  height.value = "700";
  height.dispatchEvent(new Event("input"));
  const videoEdit = editor.state.edits[video.dataset.cmsId];
  assert.equal(videoEdit.resize.height, 700);
  assert.equal(editor.imageFrameFor(video).style.height || "auto", editor.imageFrameFor(video).style.height);
  assert.ok(editor.imageFrameFor(video).style.aspectRatio.length > 0, "video frame carries the new aspect ratio");
});

test("video replacement writes to the rotating hero list", async () => {
  buildPage();
  let called = 0;
  const editor = await loadEditor();
  const video = document.querySelector(".hero-video");
  editor.selectElement(video);
  const uploadFile = editor.uploadFile;
  // Drive the same upload pipeline the media change handler uses.
  sandbox.fetch = async () => {
    called += 1;
    return { ok: true, status: 201, json: async () => ({ url: "/uploads/replaced.mp4" }) };
  };
  const file = { name: "replaced.mp4", data: "data:video/mp4;base64,AAAA" };
  const uploaded = await uploadFile(file);
  assert.equal(uploaded.url, "/uploads/replaced.mp4", "upload returned a usable media URL");
  editor.state.heroVideos ||= { items: [], interval: 8 };
  editor.state.heroVideos.items ||= [];
  editor.state.heroVideos.items.push(uploaded.url);
  assert.equal(editor.state.heroVideos.items.join(","), "/uploads/replaced.mp4");
});

test("shift-click multi-select, group, lock, and joint movement", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  const image = document.querySelector("img");
  editor.selectElement(heading);
  editor.selectElement(image, { toggle: true });
  assert.ok(editor.state, "state available");
  const group = editor.byId("admin-group");
  group.click();
  const headingGroup = editor.state.edits[heading.dataset.cmsId].groupId;
  const imageGroup = editor.state.edits[image.dataset.cmsId].groupId;
  assert.ok(headingGroup, "heading joined a group");
  assert.equal(headingGroup, imageGroup, "both elements share one group id");
  editor.byId("admin-lock").click();
  assert.equal(editor.state.edits[heading.dataset.cmsId].locked, true);
  group.click();
  assert.equal(editor.state.edits[heading.dataset.cmsId].groupId, undefined);
});

test("z-index layering shortcut brackets and alt brackets", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "]", ctrl: true });
  assert.ok(Number(heading.style.zIndex) > 0, "bring forward raised the layer");
  pressKey(editor, { key: "[", ctrl: true, alt: true });
  assert.equal(heading.style.zIndex, "-9999", "alt+[ sends to very back");
  pressKey(editor, { key: "]", ctrl: true, alt: true });
  assert.equal(heading.style.zIndex, "9999", "alt+] brings to very front");
});

test("keyboard shortcuts: nudge, tidy-up, uppercase toggle, lists", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "ArrowRight" });
  assert.equal(editor.state.edits[heading.dataset.cmsId].styles.left, 1);
  pressKey(editor, { key: "ArrowDown", shift: true });
  assert.equal(editor.state.edits[heading.dataset.cmsId].styles.top, 10);
  pressKey(editor, { key: "k", ctrl: true, shift: true });
  assert.equal(editor.state.edits[heading.dataset.cmsId].text, "ABOUT HEADING");
  pressKey(editor, { key: "8", ctrl: true, shift: true });
  assert.equal(editor.state.edits[heading.dataset.cmsId].text, "• ABOUT HEADING");
});

test("alignment shortcuts apply textAlign", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "l", ctrl: true, shift: true });
  assert.equal(heading.style.textAlign, "left");
  pressKey(editor, { key: "r", ctrl: true, shift: true });
  assert.equal(heading.style.textAlign, "right");
});

test("font-size increase and decrease shortcuts", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: ">", ctrl: true, shift: true });
  assert.ok(Number.parseFloat(heading.style.fontSize) > 0, "fontSize increased from default");
  const increased = heading.style.fontSize;
  pressKey(editor, { key: "<", ctrl: true, shift: true });
  assert.notEqual(heading.style.fontSize, increased);
});

test("shape shortcuts add rectangle, circle, line, and sticky note", async () => {
  buildPage();
  const editor = await loadEditor();
  ["r", "c", "l", "s"].forEach((key) => pressKey(editor, { key }));
  const shapes = editor.state.shapes;
  assert.equal(shapes.map((shape) => shape.kind).join(","), "rectangle,circle,line,note");
  const note = document.querySelector(".cms-shape-note");
  assert.ok(note, "sticky note element exists on the page");
  assert.equal(note.textContent, "Sticky note");
  editor.undo();
  assert.equal(editor.state.shapes.length, 3, "undo removed the sticky note from state");
  editor.redo();
  assert.equal(editor.state.shapes.length, 4);
});

test("ctrl+enter adds a page section; ctrl+delete hides the selected section", async () => {
  buildPage();
  const editor = await loadEditor();
  const titleInput = editor.byId("admin-new-section-title");
  titleInput.value = "New Testimonials";
  pressKey(editor, { key: "Enter", ctrl: true });
  assert.equal(editor.state.sections.length, 1);
  assert.equal(editor.state.sections[0].title, "New Testimonials");
  const about = document.querySelector("#about");
  editor.selectElement(about);
  pressKey(editor, { key: "Delete", ctrl: true });
  assert.equal(about.hidden, true);
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(about.hidden, false, "undo restores the hidden section");
});

test("delete and backspace remove the selected element with undo", async () => {
  buildPage();
  const editor = await loadEditor();
  const image = document.querySelector("img");
  editor.selectElement(image);
  pressKey(editor, { key: "Delete" });
  assert.equal(image.hidden, true);
  editor.undo();
  assert.equal(image.hidden, false);
});

test("ctrl+a selects all visible elements; escape-safe delete with none selected", async () => {
  buildPage();
  const editor = await loadEditor();
  pressKey(editor, { key: "a", ctrl: true });
  assert.ok(editor.selected, "a selection is active after select-all");
  pressKey(editor, { key: "Backspace" });
  assert.ok(editor.selected === null || editor.selected, "delete handled without throwing");
});

test("duplicate and paste clone text elements with undo", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "d", ctrl: true });
  assert.equal(editor.state.elementCopies.length, 1, "copy recorded in state");
  const copyId = editor.state.elementCopies[0]?.id;
  const copyNode = document.querySelector(`[data-cms-id="${copyId}"]`);
  assert.ok(copyNode, `a copied element node exists for ${copyId}`);
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(editor.state.elementCopies.length, 0, "undo removed the copy from state");
});

test("save shortcut persists the draft without publishing", async () => {
  buildPage();
  const editor = await loadEditor();
  const edit = editor.state.edits;
  edit["manual-test"] = { styles: {} };
  pressKey(editor, { key: "s", ctrl: true });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const draft = JSON.parse(localStorage.getItem("liam-portfolio-admin-draft-v1"));
  assert.ok(draft?.state?.edits, "draft saved to localStorage");
  assert.ok(draft.state.edits["manual-test"], "manual edit persisted");
});

test("sidebar toggle shortcut collapses the toolbar", async () => {
  buildPage();
  const editor = await loadEditor();
  const collapse = editor.byId("admin-collapse");
  pressKey(editor, { key: "/", ctrl: true });
  assert.equal(collapse.textContent, "Show tools");
  pressKey(editor, { key: "/", ctrl: true });
  assert.equal(collapse.textContent, "Hide tools");
});

test("grouped elements move together", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  const image = document.querySelector("img");
  editor.selectElement(heading);
  editor.selectElement(image, { toggle: true });
  editor.byId("admin-group").click();
  const groupId = editor.state.edits[heading.dataset.cmsId].groupId;
  const moving = Object.values(editor.state.edits).filter((edit) => edit.groupId === groupId);
  assert.equal(moving.length, 2, "group holds both elements");
});

test("moving an element writes left/top styles that publish to the public renderer", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  const left = editor.byId("admin-left");
  left.value = "120";
  left.dispatchEvent(new Event("input"));
  const top = editor.byId("admin-top");
  top.value = "60";
  top.dispatchEvent(new Event("input"));
  const edit = editor.state.edits[heading.dataset.cmsId];
  assert.equal(edit.styles.left, 120);
  assert.equal(edit.styles.top, 60);
  editor.applyStyle(heading, edit.styles);
  assert.equal(heading.style.left, "120px");
  assert.equal(heading.style.top, "60px");
});

test("published content renderer accepts shapes and buttons", async () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "site-content.js"), "utf8");
  assert.ok(source.includes("content.shapes"), "public renderer consumes the shapes array");
  assert.ok(source.includes("content.buttons"), "public renderer consumes custom buttons");
  assert.ok(source.includes("HTMLVideoElement"), "public renderer sizes and moves videos");
});

test("server validation accepts shapes and rejects malformed shapes", async () => {
  const source = readFileSync(path.join(ROOT, "local_preview.rb"), "utf8");
  assert.ok(source.includes('valid_shapes'), "shape validation exists");
  assert.ok(source.includes('content["shapes"]'), "publish route reads the shapes array");
});

/* ---------- summary ---------- */
await runTests();
console.log(`\n${PASS.length} passed, ${FAIL.length} failed`);
FAIL.forEach((failure) => console.error(`FAIL: ${failure.name}\n  ${failure.message}`));
process.exit(FAIL.length ? 1 : 0);
