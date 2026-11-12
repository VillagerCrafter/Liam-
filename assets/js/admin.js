(() => {
  const TEXT_SELECTOR = [
    "h1", "h2", "h3", "h4", "p", ".brand-name", ".brand-band-heading",
    ".hero-note", ".section-number", ".story-kicker", ".step-number",
    ".step-arrow", ".service-number", ".service-title", ".service-summary",
    ".service-image-action", ".project-meta > span", ".project-index",
    ".project-role", ".project-description", ".about-image-caption",
    ".featured-client", ".featured-project-title", ".footer-bottom > span",
    ".footer-bottom > a", ".primary-navigation > a", ".hero-actions > a",
    ".intro-actions > a", "a", "button:not(.service-open)",
  ].join(",");
  const CANDIDATE_SELECTOR = `${TEXT_SELECTOR},img,video,section,article,div,form,nav,footer,header,iframe,.service-open,button`;
  const STORAGE_KEY = "liam-portfolio-admin-draft-v1";
  const VERSION_STORAGE_KEY = "liam-portfolio-admin-versions-v1";
  const CASE_STUDY_PREVIEW_KEY = "liam-portfolio-case-study-preview-v1";
  const contentUrl = document.querySelector('script[data-content-url]')?.dataset.contentUrl || "/site-content.json";
  const siteBaseUrl = document.querySelector('script[data-content-url]')?.dataset.siteBaseurl || "";
  const textBox = (label, id) => `<label class="admin-full" for="${id}">${label}<textarea id="${id}"></textarea></label>`;
  const numberBox = (label, id, step = "1") => `<label>${label}<input id="${id}" type="number" step="${step}"></label>`;

  const toolbar = document.createElement("aside");
  toolbar.className = "admin-toolbar";
  toolbar.setAttribute("aria-label", "Website editing tools");
  toolbar.innerHTML = `
    <header class="admin-toolbar-header">
      <div><span class="admin-toolbar-kicker">Administrator copy</span><h1>Website editor</h1></div>
      <div class="admin-header-actions"><button id="admin-collapse" type="button" aria-expanded="true">Hide tools</button><a href="/logout" aria-label="Lock administrator session" title="Lock">Lock</a></div>
    </header>
    <div id="admin-status" class="admin-status" role="status" aria-live="polite">Loading saved changes…</div>
    <button class="admin-publish" id="admin-publish" type="button">Update website</button>
    <div class="admin-button-row">
      <button id="admin-edit-mode" class="admin-primary" type="button" aria-pressed="true">Edit page</button>
      <button id="admin-preview-toggle" type="button" aria-pressed="false">Preview draft</button>
    </div>
    <div class="admin-preview-modes" role="group" aria-label="Preview website width">
      <button type="button" data-preview-mode="desktop" aria-pressed="true">Desktop</button>
      <button type="button" data-preview-mode="tablet" aria-pressed="false">Tablet</button>
      <button type="button" data-preview-mode="mobile" aria-pressed="false">Mobile</button>
    </div>
    <p class="admin-hint">Double-click text to edit it. Double-click a photo or video to replace it. Select other items to adjust, move, or remove them.</p>
    <details class="admin-tool-group" open>
      <summary>Build your page</summary>
      <fieldset><legend>Add to the page</legend>
      <label class="admin-full" for="admin-section-template">Section layout
        <select id="admin-section-template">
          <option value="editorial">Editorial introduction</option>
          <option value="case-study">Project story: challenge, approach, result</option>
        </select>
      </label>
      <label class="admin-full" for="admin-new-section-title">New section name
        <input id="admin-new-section-title" maxlength="160" placeholder="e.g. Recent campaign">
      </label>
      <button class="admin-full admin-primary" id="admin-add-section" type="button">＋ Add page section</button>
      <button class="admin-full admin-primary" id="admin-add-project" type="button">＋ Add portfolio project</button>
      <small class="admin-full">Duplicate a section to reuse its existing layout and content.</small>
    </fieldset>
      <fieldset><legend>Add content to a section</legend>
        <label class="admin-full" for="admin-block-target">Place in section
          <select id="admin-block-target"></select>
        </label>
        <div class="admin-button-row admin-full">
          <button id="admin-add-heading-block" type="button">＋ Heading</button>
          <button id="admin-add-text-block" type="button">＋ Text</button>
        </div>
        <button class="admin-full" id="admin-add-image-block" type="button">＋ Photo</button>
        <small class="admin-full">Add editable text and photos to any section, including Examples from the field.</small>
        <div class="admin-button-row admin-full">
          <button id="admin-block-up" type="button">Move up</button>
          <button id="admin-block-down" type="button">Move down</button>
        </div>
      </fieldset>
      <input id="admin-block-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>
    </details>
    <details class="admin-tool-group">
      <summary>Page appearance</summary>
    <fieldset><legend>Color and fonts</legend>
      <label class="admin-full" for="admin-theme">Color scheme
        <select id="admin-theme"><option value="original">Original</option><option value="coastal">Coastal / teal</option><option value="sunset">Warm / sunset</option><option value="violet">Violet</option></select>
      </label>
      <label class="admin-full" for="admin-font">Site font
        <select id="admin-font"><option value="inherit">Original clean sans-serif</option><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="custom">Imported font</option></select>
      </label>
      <button class="admin-full" id="admin-import-font" type="button">Import a font file</button>
      <small class="admin-full">Supported: WOFF, WOFF2, TTF, and OTF.</small>
    </fieldset>
    </details>
    <details class="admin-tool-group" open>
      <summary id="admin-selection-label">Selected element</summary>
    <fieldset>
      <div class="admin-full" id="admin-selection-name"><small>Choose something in the page to edit it.</small></div>
      <div class="admin-button-row admin-full">
        <button id="admin-duplicate" type="button" disabled>Copy</button>
        <button id="admin-group" type="button" disabled>Group</button>
        <button id="admin-lock" type="button" disabled>Lock</button>
      </div>
      <div class="admin-button-row admin-full">
        <button id="admin-send-backward" type="button" disabled>Send backward</button>
        <button id="admin-bring-forward" type="button" disabled>Bring forward</button>
      </div>
      ${textBox("Text", "admin-text")}
      <button class="admin-full" id="admin-replace-media" type="button" disabled>Replace image or video</button>
      <label class="admin-full" for="admin-alt">Image description<input id="admin-alt" type="text"></label>
      <label class="admin-full" for="admin-href">Link or embed destination<input id="admin-href" type="url"></label>
      <label class="admin-full" for="admin-filter">Media filter
        <select id="admin-filter"><option value="">Original</option><option value="grayscale(1)">Black and white</option><option value="sepia(1)">Sepia</option><option value="brightness(1.15)">Brighter</option><option value="contrast(1.15)">More contrast</option></select>
      </label>
      <label class="admin-full" for="admin-service-description">Expanded service description<textarea id="admin-service-description"></textarea></label>
      <label class="admin-full" for="admin-service-example">Service example<textarea id="admin-service-example"></textarea></label>
      <fieldset class="admin-full" id="admin-project-fields" hidden>
        <legend>Portfolio case study</legend>
        <label class="admin-full" for="admin-project-title">Project title<input id="admin-project-title" maxlength="160"></label>
        <label class="admin-full" for="admin-project-client">Brand or client<input id="admin-project-client" maxlength="180"></label>
        <label class="admin-full" for="admin-project-location">Event or location<input id="admin-project-location" maxlength="180"></label>
        <label class="admin-full" for="admin-project-category">Category
          <select id="admin-project-category">
            <option value="activation">Activation</option><option value="tour">Tour</option>
            <option value="content">Content</option><option value="hosting">Hosting</option>
          </select>
        </label>
        <label class="admin-full" for="admin-project-description">Project summary<textarea id="admin-project-description"></textarea></label>
        <label class="admin-full" for="admin-project-role">My role<textarea id="admin-project-role"></textarea></label>
        <label class="admin-full" for="admin-project-alt">Case-study image description<input id="admin-project-alt" maxlength="180"></label>
        <button class="admin-full" id="admin-project-preview" type="button">Preview case study page</button>
        <small class="admin-full">The project ID and page URL stay stable when you edit its details.</small>
      </fieldset>
      <button class="admin-full" id="admin-parent" type="button" disabled>Select parent element</button>
      <small class="admin-full" id="admin-media-hint">Images, videos, and uploaded fonts are saved with this project.</small>
    </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Size and position</summary>
    <fieldset>
      ${numberBox("Width (px)", "admin-width")}
      ${numberBox("Height (px)", "admin-height")}
      ${numberBox("Font size (px)", "admin-font-size")}
      ${numberBox("Move left (px)", "admin-left")}
      ${numberBox("Move down (px)", "admin-top")}
      <label>Layer order (front +)<input id="admin-z-index" type="number" step="1"></label>
      <button class="admin-full" id="admin-send-to-front" type="button">Bring to front</button>
      <button class="admin-full" id="admin-send-to-back" type="button">Send to back</button>
      <button class="admin-full" id="admin-drag" type="button" aria-pressed="false">Drag selected element</button>
    </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Colors and effects</summary>
    <fieldset>
      <label>Text color<input id="admin-color" type="color" value="#172019"></label>
      <label>Background<input id="admin-background" type="color" value="#f4f2e9"></label>
      <div class="admin-button-row admin-full">
        <button id="admin-bold" type="button" aria-pressed="false">Bold</button>
        <button id="admin-italic" type="button" aria-pressed="false">Italic</button>
        <button id="admin-underline" type="button" aria-pressed="false">Underline</button>
        <button id="admin-shadow" type="button" aria-pressed="false">Text shadow</button>
      </div>
    </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Page sections</summary>
    <fieldset>
      <div class="admin-full" id="admin-sections"></div>
    </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Version history</summary>
      <fieldset>
        <label class="admin-full" for="admin-version-list">Published versions saved before updates</label>
        <select id="admin-version-list"></select>
        <button class="admin-full" id="admin-version-restore" type="button">Restore selected version to draft</button>
        <small class="admin-full">Restoring loads a recoverable draft; it does not change the public preview until you publish.</small>
      </fieldset>
    </details>
    <button class="admin-danger" id="admin-delete" type="button" disabled>Delete selected element</button>
    <button id="admin-restore" type="button">Restore hidden elements</button>
    <button id="admin-reset-draft" type="button">Discard local draft</button>
    <small>Drafts stay in this browser. Update website changes this computer's paired preview; publishing to GitHub Pages is a separate step.</small>
    <input id="admin-media-file" type="file" accept="image/*,video/mp4,video/webm" hidden>
    <input id="admin-font-file" type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" hidden>
  `;
  const toolbarResize = document.createElement("div");
  toolbarResize.className = "admin-toolbar-resize";
  toolbarResize.id = "admin-toolbar-resize";
  toolbarResize.setAttribute("role", "separator");
  toolbarResize.setAttribute("aria-label", "Resize editor sidebar");
  toolbarResize.setAttribute("aria-orientation", "vertical");
  toolbarResize.setAttribute("tabindex", "0");
  document.body.append(toolbar, toolbarResize);
  const sidebarWidthKey = "liam-portfolio-admin-sidebar-width-v1";
  const setSidebarWidth = (width, persist = false) => {
    const bounded = Math.max(278, Math.min(640, Math.round(width)));
    document.body.style.setProperty("--admin-sidebar-width", `${bounded}px`);
    toolbarResize.setAttribute("aria-valuenow", String(bounded));
    if (persist) {
      try {
        localStorage.setItem(sidebarWidthKey, String(bounded));
      } catch (error) {
        const statusNode = document.getElementById("admin-status");
        if (statusNode) {
          statusNode.textContent = `Sidebar resized, but its width could not be remembered: ${error.message}`;
          statusNode.dataset.state = "error";
        }
      }
    }
  };
  try {
    const savedWidth = Number(localStorage.getItem(sidebarWidthKey));
    if (savedWidth >= 278 && savedWidth <= 640) setSidebarWidth(savedWidth);
    else setSidebarWidth(278);
  } catch (error) {
    setSidebarWidth(278);
  }
  let resizePointerId = null;
  toolbarResize.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 760px)").matches) return;
    resizePointerId = event.pointerId;
    toolbarResize.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  toolbarResize.addEventListener("pointermove", (event) => {
    if (resizePointerId !== event.pointerId) return;
    setSidebarWidth(event.clientX);
  });
  const endSidebarResize = (event) => {
    if (resizePointerId !== event.pointerId) return;
    resizePointerId = null;
    setSidebarWidth(event.clientX, true);
  };
  toolbarResize.addEventListener("pointerup", endSidebarResize);
  toolbarResize.addEventListener("pointercancel", endSidebarResize);
  toolbarResize.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const current = Number(toolbarResize.getAttribute("aria-valuenow")) || 278;
    setSidebarWidth(current + (event.key === "ArrowRight" ? 20 : -20), true);
  });
  document.body.classList.add("cms-administrator");

  const byId = (id) => document.getElementById(id);
  const status = byId("admin-status");
  const textInput = byId("admin-text");
  const mediaInput = byId("admin-media-file");
  const fontInput = byId("admin-font-file");
  const selectionName = byId("admin-selection-name");
  const main = document.querySelector("main");
  let state = { version: 1, edits: {}, sections: [], sectionCopies: [], sectionOrder: [], projects: [], contentBlocks: [], elementCopies: [], buttons: [], mediaElements: [], groups: [], heroVideos: null, theme: "original", fontFamily: "inherit", googleFont: "", fontFile: null };
  let selected = null;
  const selectedElements = new Set();
  let elementClipboard = null;
  let selectionGroupId = null;
  let editMode = true;
  let dragMode = false;
  let draftTimer;
  let undoHistory = [];
  let redoHistory = [];
  let lastHistorySnapshot = null;
  let historyReady = false;
  let extensionRenderer = () => {};
  const originalSections = [...main.querySelectorAll(":scope > section")];
  const originalElements = new Map();

  const setStatus = (message, kind = "") => {
    status.textContent = message;
    status.dataset.state = kind;
  };

  const currentEdit = () => {
    if (!selected?.dataset.cmsId) return null;
    state.edits[selected.dataset.cmsId] ||= { styles: {} };
    state.edits[selected.dataset.cmsId].styles ||= {};
    return state.edits[selected.dataset.cmsId];
  };

  const applyStyle = (element, styles = {}) => {
    const numeric = { width: 2400, height: 1800, fontSize: 160, left: 1200, top: 1200, zIndex: 9999 };
    for (const [name, maximum] of Object.entries(numeric)) {
      if (styles[name] !== undefined) element.style[name] = name === "zIndex"
        ? String(Math.max(-9999, Math.min(maximum, Number(styles[name]))))
        : `${Math.max(name === "left" || name === "top" ? -1200 : 8, Math.min(maximum, Number(styles[name])))}px`;
    }
    if (/^#[0-9a-f]{3,8}$/i.test(styles.color || "")) element.style.color = styles.color;
    if (/^#[0-9a-f]{3,8}$/i.test(styles.backgroundColor || "")) element.style.backgroundColor = styles.backgroundColor;
    if (["400", "600", "700", "800"].includes(String(styles.fontWeight))) element.style.fontWeight = styles.fontWeight;
    if (styles.fontStyle === "italic") element.style.fontStyle = "italic";
    if (styles.textDecoration === "underline") element.style.textDecoration = "underline";
    if (["left", "center", "right", "justify"].includes(styles.textAlign)) element.style.textAlign = styles.textAlign;
    if (styles.textShadow === "1") element.style.textShadow = "0 2px 12px rgba(0,0,0,.38)";
    if (["grayscale(1)", "sepia(1)", "brightness(1.15)", "contrast(1.15)", "none"].includes(styles.filter)) element.style.filter = styles.filter;
    if (styles.zIndex !== undefined && getComputedStyle(element).position === "static") element.style.position = "relative";
    if (styles.maxWidth === "none") element.style.maxWidth = "none";
    if (["inherit", "Georgia, serif", "Arial, sans-serif", "custom"].includes(styles.fontFamily)) {
      element.style.fontFamily = styles.fontFamily === "custom" ? "LiamImportedFont, sans-serif" : styles.fontFamily;
    }
  };

  const allCandidates = () => [...document.querySelectorAll(CANDIDATE_SELECTOR)]
    .filter((element) => !element.closest(".admin-toolbar, .service-dialog, .admin-mark"));

  const assignContentIds = () => allCandidates().forEach((element, index) => {
    if (!element.dataset.cmsId) element.dataset.cmsId = `element-${index}-${element.tagName.toLowerCase()}`;
  });

  const persistDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state, undoHistory, redoHistory }));
      return true;
    } catch (error) {
      setStatus(`Could not save your local draft: ${error.message}`, "error");
      return false;
    }
  };

  const saveDraft = () => {
    const snapshot = JSON.stringify(state);
    if (historyReady && lastHistorySnapshot && snapshot !== lastHistorySnapshot) {
      undoHistory.push(lastHistorySnapshot);
      if (undoHistory.length > 50) undoHistory.shift();
      redoHistory = [];
    }
    lastHistorySnapshot = snapshot;
    window.clearTimeout(draftTimer);
    if (persistDraft()) {
      draftTimer = window.setTimeout(() => {
        setStatus("Draft saved in this browser.", "saved");
      }, 250);
    }
  };

  const saveField = (edit, name, value) => {
    if (selected instanceof HTMLImageElement && (name === "width" || name === "height")) {
      const frame = imageFrameFor(selected);
      const bounds = frame.getBoundingClientRect();
      const dimensions = { ...(edit.resize || { width: bounds.width, height: bounds.height }), [name]: value };
      edit.resize = dimensions;
      applyImageResize(selected, dimensions);
      byId("admin-width").value = dimensions.width;
      byId("admin-height").value = dimensions.height;
      saveDraft();
      return;
    }
    edit.styles[name] = value;
    if (selected) applyStyle(selected, edit.styles);
    saveDraft();
  };

  const scrollToSection = (section) => section?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sectionTitle = (section) =>
    (section.querySelector("h1,h2,h3")?.textContent || section.id || "Page section").trim();

  const sectionCopyEditId = (copyId, index) => `${copyId}-element-${index + 1}`;

  const renderSectionList = () => {
    const list = byId("admin-sections");
    list.replaceChildren();
    [...document.querySelectorAll("main > section")].forEach((section) => {
      const row = document.createElement("div");
      row.className = "admin-section-row";
      row.dataset.sectionId = section.dataset.cmsId;
      if (section.hidden) row.classList.add("is-hidden");
      const label = document.createElement("span");
      label.className = "admin-section-title";
      label.textContent = sectionTitle(section);
      const actions = document.createElement("div");
      actions.className = "admin-section-actions";
      const addAction = (name, labelText, action, className = "") => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = labelText;
        button.setAttribute("aria-label", `${name} section ${sectionTitle(section)}`);
        if (className) button.className = className;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          action(section, row);
        });
        actions.append(button);
      };
      addAction("Select", "Select", (target) => {
        selectElement(target);
        scrollToSection(target);
      });
      addAction("Move up", "↑", (target) => moveSection(target, -1));
      addAction("Move down", "↓", (target) => moveSection(target, 1));
      addAction("Duplicate", "Duplicate", duplicateSection);
      addAction("Rename", "Rename", renameSection);
      addAction(section.hidden ? "Show" : "Hide", section.hidden ? "Show" : "Hide", toggleSectionVisibility);
      if (section.classList.contains("cms-new-section") || section.classList.contains("cms-section-copy")) {
        addAction("Delete", "Delete", deleteAddedSection, "admin-section-delete");
      }
      row.append(label, actions);
      list.append(row);
    });
  };

  const imageFrameFor = (media) => {
    if (media instanceof HTMLVideoElement) return media.closest(".hero") || media;
    return media?.closest(
      ".service-image-wrap, .project-image-wrap, .about-image-wrap, .featured-image, .dialog-image",
    ) || media;
  };
  const applyImageResize = (media, dimensions) => {
    if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement) || !dimensions) return;
    const width = Math.max(40, Math.min(2400, Number(dimensions.width) || 0));
    const height = Math.max(30, Math.min(1800, Number(dimensions.height) || 0));
    if (!width || !height) return;
    const frame = imageFrameFor(media);
    frame.style.width = `${width}px`;
    frame.style.height = "auto";
    frame.style.aspectRatio = `${width} / ${height}`;
    frame.style.maxWidth = "none";
    frame.style.left = "";
    frame.style.top = "";
    frame.style.position = "";
    if (Number.isFinite(Number(dimensions.offsetX)) || Number.isFinite(Number(dimensions.offsetY))) {
      const offsetX = Number.isFinite(Number(dimensions.offsetX))
        ? Math.max(-20_000, Math.min(20_000, Number(dimensions.offsetX)))
        : 0;
      const offsetY = Number.isFinite(Number(dimensions.offsetY))
        ? Math.max(-20_000, Math.min(20_000, Number(dimensions.offsetY)))
        : 0;
      frame.style.left = `${offsetX}px`;
      frame.style.top = `${offsetY}px`;
      if (offsetX || offsetY) frame.style.position = "relative";
    }
    if (frame !== media) {
      media.style.width = "100%";
      media.style.height = "100%";
      media.style.maxWidth = "none";
    } else {
      media.style.width = `${width}px`;
      media.style.height = "auto";
      media.style.aspectRatio = `${width} / ${height}`;
      media.style.maxWidth = "none";
    }
  };
  const renderElementCopies = () => {
    (state.elementCopies || []).forEach((copy) => {
      if (!copy || !/^element-copy-[\w-]+$/.test(copy.id || "") || document.getElementById(copy.id)) return;
      const parent = document.querySelector(`[data-cms-id="${CSS.escape(copy.parentId || "")}"]`);
      if (!parent || !["p", "h2", "h3", "h4", "span", "a", "button", "img"].includes(copy.tag)) return;
      const element = document.createElement(copy.tag);
      element.id = copy.id;
      element.dataset.cmsId = copy.id;
      if (copy.tag === "img") {
        if (!/^(?:\/uploads\/[\w.-]+|\/assets\/[\w./-]+)$/.test(copy.src || "") || copy.src.includes("..")) return;
        element.src = copy.src;
        element.alt = copy.alt || "";
      } else {
        element.textContent = copy.text || "";
        if (copy.tag === "a" && /^(https?:|mailto:|\/(?!\/)|#)/i.test(copy.href || "")) element.href = copy.href;
      }
      if (copy.afterId) document.querySelector(`[data-cms-id="${CSS.escape(copy.afterId)}"]`)?.after(element);
      else parent.append(element);
    });
  };
  const addContentBlock = (block) => {
    const section = document.getElementById(block.sectionId);
    if (!section || document.getElementById(block.id)) return;
    const element = block.type === "image" ? document.createElement("figure") :
      document.createElement(block.type === "heading" ? "h3" : "p");
    element.className = `cms-added-content-block cms-added-${block.type}`;
    element.id = block.id;
    element.dataset.cmsId = block.id;
    if (block.type === "image") {
      const image = document.createElement("img");
      image.dataset.cmsId = `${block.id}-image`;
      image.src = block.image;
      image.alt = block.alt || "";
      image.loading = "lazy";
      element.append(image);
    } else {
      element.textContent = block.text || (block.type === "heading" ? "New heading" : "Write your text here.");
    }
    section.append(element);
  };

  const duplicateSelected = (source = selected) => {
    if (!source || selectedElements.size > 1) {
      setStatus("Copy one element at a time. You can group selected elements and move them together.", "error");
      return null;
    }
    if (!source.dataset.cmsId) assignContentIds();
    const tag = source.tagName.toLowerCase();
    if (tag === "img" && !/^(?:\/uploads\/[\w.-]+|\/assets\/[\w./-]+)$/.test(source.getAttribute("src") || "")) {
      setStatus("This image cannot be copied because its media path is not a local site asset.", "error");
      return null;
    }
    if (tag !== "img" && !source.matches(TEXT_SELECTOR)) {
      setStatus("Copy supports text and local images. Select a text or image element.", "error");
      return null;
    }
    const parent = source.parentElement;
    if (!parent) return null;
    if (!parent.dataset.cmsId) assignContentIds();
    const id = `element-copy-${crypto.randomUUID()}`;
    const copy = {
      id,
      parentId: parent.dataset.cmsId,
      afterId: source.dataset.cmsId,
      tag,
      text: tag === "img" ? "" : source.textContent,
      src: tag === "img" ? source.getAttribute("src") : "",
      alt: tag === "img" ? source.alt : "",
      href: source instanceof HTMLAnchorElement ? source.getAttribute("href") : "",
    };
    state.elementCopies.push(copy);
    renderElementCopies();
    const clone = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
    const sourceEdit = JSON.parse(JSON.stringify(state.edits[source.dataset.cmsId] || { styles: {} }));
    sourceEdit.locked = false;
    delete sourceEdit.groupId;
    state.edits[id] = sourceEdit;
    if (clone) {
      if (typeof sourceEdit.text === "string" && clone.matches(TEXT_SELECTOR)) clone.textContent = sourceEdit.text;
      applyStyle(clone, sourceEdit.styles);
      selectElement(clone);
    }
    saveDraft();
    setStatus("Element copied. The copy is saved in your draft.");
    return clone;
  };

  const captureOriginalPage = () => {
    originalElements.clear();
    allCandidates().forEach((element) => {
      originalElements.set(element, {
        html: element.matches(TEXT_SELECTOR) ? element.innerHTML : null,
        src: element.getAttribute("src"),
        alt: element.getAttribute("alt"),
        href: element.getAttribute("href"),
        style: element.getAttribute("style"),
        hidden: element.hasAttribute("hidden"),
        serviceImage: element.dataset.serviceImage,
        serviceDescription: element.dataset.serviceDescription,
        serviceExample: element.dataset.serviceExample,
      });
    });
  };
  const restoreOriginalPage = () => {
    originalElements.forEach((original, element) => {
      if (!element.isConnected) return;
      if (original.html !== null) element.innerHTML = original.html;
      for (const [attribute, value] of [["src", original.src], ["alt", original.alt], ["href", original.href], ["style", original.style]]) {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      }
      if (original.hidden) element.setAttribute("hidden", "");
      else {
        element.removeAttribute("hidden");
        element.hidden = false;
      }
      for (const [name, value] of [["serviceImage", original.serviceImage], ["serviceDescription", original.serviceDescription], ["serviceExample", original.serviceExample]]) {
        if (value === undefined) delete element.dataset[name];
        else element.dataset[name] = value;
      }
    });
    originalSections.forEach((section) => main.append(section));
    document.querySelectorAll(".cms-stock-credit").forEach((caption) => caption.remove());
  };
  const populateBlockTargets = () => {
    const target = byId("admin-block-target");
    if (!target) return;
    const previous = target.value;
    target.replaceChildren(new Option("Examples from the field", "work"));
    document.querySelectorAll("main > section[id]").forEach((section) => {
      if (section.id === "work") return;
      target.append(new Option((section.querySelector("h1,h2,h3")?.textContent || section.id).trim(), section.id));
    });
    if ([...target.options].some((option) => option.value === previous)) target.value = previous;
  };

  const appendSectionCopies = () => {
    state.sectionCopies.forEach((copy) => {
      const source = [...main.querySelectorAll(":scope > section")]
        .find((section) => section.dataset.cmsId === copy.sourceId);
      if (!source) return;
      const clone = source.cloneNode(true);
      clone.classList.add("cms-section-copy");
      clone.id = copy.id;
      clone.dataset.cmsId = copy.id;
      clone.hidden = false;
      const sourceIds = [source, ...source.querySelectorAll("[id]")];
      const cloneIds = [clone, ...clone.querySelectorAll("[id]")];
      const idMap = new Map();
      sourceIds.forEach((sourceNode, index) => {
        if (sourceNode.id) idMap.set(sourceNode.id, index === 0 ? copy.id : `${copy.id}-item-${index}`);
      });
      cloneIds.forEach((cloneNode, index) => {
        const sourceNode = sourceIds[index];
        if (sourceNode?.id) cloneNode.id = idMap.get(sourceNode.id);
      });
      clone.querySelectorAll("*").forEach((element) => {
        for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "headers"]) {
          const value = element.getAttribute(attribute);
          if (value) element.setAttribute(attribute, value.split(/\s+/).map((id) => idMap.get(id) || id).join(" "));
        }
        const href = element.getAttribute("href");
        if (href?.startsWith("#") && idMap.has(href.slice(1))) element.setAttribute("href", `#${idMap.get(href.slice(1))}`);
      });
      const sourceNodes = [source, ...source.querySelectorAll("[data-cms-id]")];
      const cloneNodes = [clone, ...clone.querySelectorAll("[data-cms-id]")];
      sourceNodes.forEach((sourceNode, index) => {
        const cloneNode = cloneNodes[index];
        if (!cloneNode) return;
        cloneNode.dataset.cmsId = index === 0 ? copy.id : sectionCopyEditId(copy.id, index - 1);
      });
      clone.querySelectorAll("form,iframe,video").forEach((element) => element.remove());
      main.append(clone);
    });
  };

  const moveSection = (section, direction) => {
    const sections = [...main.querySelectorAll(":scope > section")];
    const index = sections.indexOf(section);
    const destination = sections[index + direction];
    if (!destination) return;
    if (direction < 0) main.insertBefore(section, destination);
    else main.insertBefore(destination, section);
    state.sectionOrder = [...main.querySelectorAll(":scope > section")]
      .map((item) => item.dataset.cmsId).filter(Boolean);
    saveDraft();
    renderSectionList();
  };

  const renameSection = (section, row) => {
    const heading = section.querySelector("h1,h2,h3");
    if (!heading) {
      setStatus("This section has no heading to rename.", "error");
      return;
    }
    const label = row.querySelector(".admin-section-title");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 160;
    input.value = sectionTitle(section);
    input.setAttribute("aria-label", `New title for ${sectionTitle(section)}`);
    label.replaceWith(input);
    const actions = row.querySelector(".admin-section-actions");
    actions.replaceChildren();
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    save.addEventListener("click", () => {
      const value = input.value.trim();
      if (!value) {
        setStatus("Enter a section title before saving.", "error");
        input.focus();
        return;
      }
      selectElement(heading);
      currentEdit().text = value;
      heading.textContent = value;
      heading.style.whiteSpace = "pre-line";
      const addedSection = state.sections.find((item) => item.id === section.id);
      if (addedSection) addedSection.title = value;
      const copiedSection = state.sectionCopies.find((item) => item.id === section.id);
      if (copiedSection) copiedSection.title = value;
      saveDraft();
      renderSectionList();
      setStatus("Section title updated.");
    });
    cancel.addEventListener("click", renderSectionList);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") save.click();
      if (event.key === "Escape") renderSectionList();
    });
    actions.append(save, cancel);
    input.focus();
    input.select();
  };

  const toggleSectionVisibility = (section) => {
    const edit = state.edits[section.dataset.cmsId] ||= { styles: {} };
    edit.styles ||= {};
    if (section.hidden) {
      section.hidden = false;
      delete edit.deleted;
    } else {
      section.hidden = true;
      edit.deleted = true;
    }
    saveDraft();
    renderSectionList();
    setStatus(section.hidden ? "Section hidden. Use Show or Restore hidden elements to bring it back." : "Section restored.");
  };

  const duplicateSection = (section) => {
    if (section.querySelector("form,iframe,video")) {
      setStatus("This section contains an interactive form, embed, or video and cannot be duplicated safely.", "error");
      return;
    }
    const id = `section-copy-${crypto.randomUUID()}`;
    const title = `${sectionTitle(section)} (Copy)`.slice(0, 160);
    const sourceNodes = [section, ...section.querySelectorAll("[data-cms-id]")];
    sourceNodes.forEach((sourceNode, index) => {
      const edit = state.edits[sourceNode.dataset.cmsId];
      if (edit) {
        const copyId = index === 0 ? id : sectionCopyEditId(id, index - 1);
        state.edits[copyId] = JSON.parse(JSON.stringify(edit));
      }
    });
    if (state.edits[id]) delete state.edits[id].deleted;
    const sourceHeading = section.querySelector("h1,h2,h3");
    if (sourceHeading?.dataset.cmsId) {
      const headingIndex = sourceNodes.indexOf(sourceHeading);
      const headingEdit = state.edits[sectionCopyEditId(id, headingIndex - 1)] ||= { styles: {} };
      headingEdit.text = title;
    }
    state.sectionCopies.push({
      id,
      sourceId: section.dataset.cmsId,
      title,
    });
    renderEditorState();
    const duplicate = main.querySelector(`:scope > section[data-cms-id="${CSS.escape(id)}"]`);
    if (duplicate) {
      const order = [...main.querySelectorAll(":scope > section")]
        .map((item) => item.dataset.cmsId).filter(Boolean);
      const copyIndex = order.indexOf(id);
      const sourceIndex = order.indexOf(section.dataset.cmsId);
      if (copyIndex !== -1 && sourceIndex !== -1) {
        order.splice(copyIndex, 1);
        order.splice(order.indexOf(section.dataset.cmsId) + 1, 0, id);
      }
      state.sectionOrder = order;
      state.sectionOrder.forEach((sectionId) => {
        const orderedSection = main.querySelector(`:scope > section[data-cms-id="${CSS.escape(sectionId)}"]`);
        if (orderedSection) main.append(orderedSection);
      });
      selectElement(duplicate);
      scrollToSection(duplicate);
    }
    saveDraft();
    renderSectionList();
    setStatus("Section duplicated with its existing layout and content. Edit the copy independently.");
  };

  const deleteAddedSection = (section) => {
    if (!window.confirm(`Permanently remove "${sectionTitle(section)}" and any copies based on it? You can undo this change.`)) return;
    const removed = new Set([section.dataset.cmsId]);
    let expanded = true;
    while (expanded) {
      expanded = false;
      state.sectionCopies.forEach((copy) => {
        if (removed.has(copy.sourceId) && !removed.has(copy.id)) {
          removed.add(copy.id);
          expanded = true;
        }
      });
    }
    state.sections = state.sections.filter((item) => !removed.has(item.id));
    state.sectionCopies = state.sectionCopies.filter((item) => !removed.has(item.id));
    state.contentBlocks = state.contentBlocks.filter((item) => !removed.has(item.sectionId));
    state.buttons = state.buttons.filter((item) => !removed.has(item.sectionId));
    state.mediaElements = state.mediaElements.filter((item) => !removed.has(item.sectionId));
    Object.keys(state.edits).forEach((id) => {
      if ([...removed].some((removedId) => id === removedId || id.startsWith(`${removedId}-`))) delete state.edits[id];
    });
    state.sectionOrder = state.sectionOrder.filter((id) => !removed.has(id));
    if (selected && [...removed].includes(selected.closest("main > section")?.dataset.cmsId)) selected = null;
    renderEditorState();
    saveDraft();
    setStatus("Added section removed. Use Undo to restore it if needed.");
  };

  const renderEditorState = () => {
    restoreOriginalPage();
    assignContentIds();
    state.sections.forEach((section) => {
      if (document.getElementById(section.id)) return;
      const node = document.createElement("section");
      node.className = `added-page-section section-pad cms-new-section${section.layout === "case-study" ? " cms-section-layout-case-study" : ""}`;
      node.id = section.id;
      node.dataset.cmsId = section.id;
      const inner = document.createElement("div");
      inner.className = "page-width";
      const heading = document.createElement("h2");
      heading.textContent = section.title;
      heading.dataset.cmsId = `${section.id}-title`;
      const paragraph = document.createElement("p");
      paragraph.textContent = section.text;
      paragraph.dataset.cmsId = `${section.id}-text`;
      inner.append(heading, paragraph);
      node.append(inner);
      main.append(node);
    });
    state.projects.forEach(addProjectCard);
    state.contentBlocks.forEach(addContentBlock);
    (state.shapes || []).forEach(renderShape);
    renderElementCopies();
    assignContentIds();
    appendSectionCopies();
    assignContentIds();
    for (const [id, edit] of Object.entries(state.edits || {})) {
      const element = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (!element) continue;
      edit.styles ||= {};
      if (edit.deleted) element.hidden = true;
      if (typeof edit.text === "string" && element.matches(TEXT_SELECTOR)) {
        element.textContent = edit.text;
        element.style.whiteSpace = "pre-line";
      }
      if (typeof edit.alt === "string" && element instanceof HTMLImageElement) element.alt = edit.alt;
      if (typeof edit.href === "string" && element instanceof HTMLAnchorElement && /^(https?:|mailto:|\/|#)/i.test(edit.href)) {
        element.setAttribute("href", edit.href);
      }
      if (typeof edit.src === "string" && element instanceof HTMLIFrameElement && /^(https:\/\/|\/(?!\/))/i.test(edit.src)) {
        element.src = edit.src;
      }
      if (element.matches(".service-open")) {
        if (typeof edit.serviceDescription === "string") element.dataset.serviceDescription = edit.serviceDescription;
        if (typeof edit.serviceExample === "string") element.dataset.serviceExample = edit.serviceExample;
      }
      if (typeof edit.media === "string" && /^\/uploads\/[\w.-]+$/.test(edit.media)) {
        if (element instanceof HTMLImageElement) {
          element.src = edit.media;
          const serviceButton = element.closest(".service-open");
          if (serviceButton) serviceButton.dataset.serviceImage = edit.media;
        }
        if (element instanceof HTMLVideoElement) element.src = edit.media;
      }
      if (element instanceof HTMLImageElement && (edit.resize || (edit.styles?.width && edit.styles?.height))) {
        edit.resize ||= { width: edit.styles.width, height: edit.styles.height };
        edit.resize.offsetX ??= edit.styles.left;
        edit.resize.offsetY ??= edit.styles.top;
        delete edit.styles.width;
        delete edit.styles.height;
        delete edit.styles.maxWidth;
        delete edit.styles.left;
        delete edit.styles.top;
        applyImageResize(element, edit.resize);
      }
      applyStyle(element, edit.styles);
      element.classList.toggle("cms-editor-locked", Boolean(edit.locked));
    }
    state.sectionOrder.forEach((id) => {
      const section = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (section?.tagName === "SECTION") main.append(section);
    });
    applyTheme();
    setToolbarAppearance();
    renderSectionList();
    populateBlockTargets();
    extensionRenderer();
    selected?.classList.remove("cms-highlight");
    selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
    selectedElements.clear();
    selected = null;
    selectionGroupId = null;
    selectionName.innerHTML = "<small>Choose something in the page to edit it.</small>";
    textInput.value = "";
    textInput.disabled = true;
    byId("admin-delete").disabled = true;
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = true; });
  };

  const hydrateState = async () => {
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load website edits (${response.status}).`);
    const published = await response.json();
    Object.assign(state, { ...state, ...published, edits: published.edits || {}, sections: published.sections || [], projects: published.projects || [] });

    state.sectionCopies ||= [];
    const draftText = localStorage.getItem(STORAGE_KEY);
    if (draftText) {
      const draft = JSON.parse(draftText);
      if (draft.savedAt && draft.state) {
        Object.assign(state, { ...state, ...draft.state, edits: draft.state.edits || {}, sections: draft.state.sections || [], projects: draft.state.projects || [] });
        state.sectionCopies = draft.state.sectionCopies || [];
        undoHistory = Array.isArray(draft.undoHistory) ? draft.undoHistory.slice(-50) : [];
        redoHistory = Array.isArray(draft.redoHistory) ? draft.redoHistory.slice(-50) : [];
        setStatus("Restored an unpublished draft from this browser.");
      }
    }

    state.edits ||= {};
    state.sections ||= [];
    state.sectionCopies ||= [];
    state.projects ||= [];
    state.contentBlocks ||= [];
    state.buttons ||= [];
    state.mediaElements ||= [];
    state.elementCopies ||= [];
    state.shapes ||= [];
    captureOriginalPage();
    renderEditorState();
    lastHistorySnapshot = JSON.stringify(state);
    historyReady = true;
    if (!draftText) setStatus("Editor ready. Changes save in this browser.");
  };

  const moveHistory = (from, to) => {
    window.clearTimeout(draftTimer);
    if (!from.length) {
      setStatus(from === undoHistory ? "Nothing to undo yet." : "Nothing to redo yet.");
      return;
    }
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    const selectedId = selected?.dataset.cmsId;
    to.push(JSON.stringify(state));
    const restored = JSON.parse(from.pop());
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, restored);
    state.edits ||= {};
    state.sections ||= [];
    state.sectionCopies ||= [];
    state.projects ||= [];
    state.contentBlocks ||= [];
    state.buttons ||= [];
    state.mediaElements ||= [];
    state.elementCopies ||= [];
    renderEditorState();
    lastHistorySnapshot = JSON.stringify(state);
    if (selectedId) {
      const restoredSelection = document.querySelector(`[data-cms-id="${CSS.escape(selectedId)}"]`);
      if (restoredSelection) selectElement(restoredSelection);
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(scrollPosition.x, scrollPosition.y)));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state, undoHistory, redoHistory }));
      setStatus(from === undoHistory ? "Undid the last change." : "Redid the last change.", "saved");
    } catch (error) {
      setStatus(`History restored, but the browser could not save it: ${error.message}`, "error");
    }
  };

  const applyTheme = () => {
    const themes = {
      original: { "--site-font": '"Avenir Next", Avenir, "Segoe UI", sans-serif' },
      coastal: { "--forest": "#1c3038", "--forest-deep": "#122128", "--lime": "#82d4ce", "--lime-dark": "#55a8a2", "--paper": "#f0f3ef" },
      sunset: { "--forest": "#3b2825", "--forest-deep": "#241a19", "--lime": "#f4b77a", "--lime-dark": "#d68d59", "--paper": "#f7eee7" },
      violet: { "--forest": "#302641", "--forest-deep": "#1d1728", "--lime": "#c7a6ed", "--lime-dark": "#9f7bc9", "--paper": "#f3eef8" },
    };
    for (const property of ["--forest", "--forest-deep", "--lime", "--lime-dark", "--paper", "--site-font"]) {
      document.documentElement.style.removeProperty(property);
    }
    Object.entries(themes[state.theme] || themes.original).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    if (state.theme !== "original") {
      document.documentElement.style.setProperty("--site-font", '"Avenir Next", Avenir, "Segoe UI", sans-serif');
    }
    if (state.fontFile) {
      document.documentElement.style.setProperty("--site-font", "LiamImportedFont, sans-serif");
      const style = document.querySelector("#imported-site-font") || document.createElement("style");
      style.id = "imported-site-font";
      style.textContent = `@font-face{font-family:LiamImportedFont;src:url("${state.fontFile.url}") format("${state.fontFile.format}");font-display:swap}`;
      document.head.append(style);
    } else if (state.fontFamily && state.fontFamily !== "inherit") {
      document.documentElement.style.setProperty("--site-font", state.fontFamily);
    }
  };

  const setToolbarAppearance = () => {
    byId("admin-theme").value = state.theme || "original";
    byId("admin-font").value = state.fontFile ? "custom" : (state.fontFamily || "inherit");
  };

  const projectForElement = (element) => {
    const card = element?.closest(".project-card");
    return card ? state.projects.find((project) => card.id === `project-${project.id}`) : null;
  };

  const updateProjectField = (field, value) => {
    const project = projectForElement(selected);
    if (!project) return;
    project[field] = value;
    const card = selected.closest(".project-card");
    if (field === "title") {
      card.querySelector("h3").textContent = value;
      card.setAttribute("aria-label", `View case study: ${value}`);
    } else if (field === "client") {
      card.querySelector(".project-meta span:first-child").textContent = value;
    } else if (field === "location") {
      card.querySelector(".project-meta span:last-child").textContent = value;
    } else if (field === "category") {
      card.dataset.category = value;
    } else if (field === "description") {
      card.querySelector(".project-description").textContent = value;
    } else if (field === "role") {
      const role = card.querySelector(".project-role");
      role.replaceChildren(role.firstElementChild.cloneNode(true), document.createTextNode(value));
    } else if (field === "alt") {
      card.querySelector("img").alt = value;
    }
    saveDraft();
  };

  const previewCaseStudy = () => {
    const project = projectForElement(selected);
    if (!project) return;
    try {
      localStorage.setItem(CASE_STUDY_PREVIEW_KEY, JSON.stringify(state));
      const previewUrl = `${siteBaseUrl}/projects/?project=${encodeURIComponent(project.id)}&preview=draft`;
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      setStatus("Draft case study preview opened. This does not publish your changes.");
    } catch (error) {
      setStatus(`Could not prepare the case-study preview: ${error.message}`, "error");
    }
  };

  const selectElement = (element, { toggle = false, preserve = false } = {}) => {
    if (!element || toolbar.contains(element)) return;
    if (!preserve && !toggle) {
      selectedElements.forEach((item) => item.classList.remove("cms-highlight", "cms-multi-selected"));
      selectedElements.clear();
    }
    if (toggle && selectedElements.has(element)) {
      element.classList.remove("cms-highlight", "cms-multi-selected");
      selectedElements.delete(element);
      selected = [...selectedElements].at(-1) || null;
      if (!selected) {
        selectionName.textContent = "Choose something in the page to edit it.";
        byId("admin-delete").disabled = true;
        ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = true; });
        return;
      }
    } else {
      selectedElements.add(element);
      selected = element;
    }
    if (!selected.dataset.cmsId) assignContentIds();
    selectedElements.add(selected);
    selectedElements.forEach((item) => {
      item.classList.add("cms-highlight");
      item.classList.toggle("cms-multi-selected", selectedElements.size > 1);
    });
    const edit = state.edits[selected.dataset.cmsId] || { styles: {} };
    selectionGroupId = edit.groupId || null;
    selectionName.textContent = `${selected.tagName.toLowerCase()}${selected.id ? ` #${selected.id}` : ""}${selectedElements.size > 1 ? ` · ${selectedElements.size} selected` : ""}`;
    byId("admin-selection-label").textContent = selectedElements.size > 1 ? "Multiple elements selected" : "Selected element";
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = false; });
    byId("admin-group").textContent = selectionGroupId ? "Ungroup" : "Group";
    byId("admin-lock").textContent = edit.locked ? "Unlock" : "Lock";
    textInput.value = typeof edit.text === "string" ? edit.text : (selected.matches(TEXT_SELECTOR) ? selected.innerText : "");
    textInput.disabled = [...selectedElements].some((item) => !item.matches(TEXT_SELECTOR));
    byId("admin-replace-media").disabled = !(selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement);
    byId("admin-alt").disabled = !(selected instanceof HTMLImageElement);
    byId("admin-alt").value = typeof edit.alt === "string" ? edit.alt : (selected instanceof HTMLImageElement ? selected.alt : "");
    byId("admin-href").disabled = !(selected instanceof HTMLAnchorElement || selected instanceof HTMLIFrameElement);
    byId("admin-href").value = selected instanceof HTMLIFrameElement
      ? (edit.src || selected.getAttribute("src") || "")
      : (typeof edit.href === "string" ? edit.href : (selected instanceof HTMLAnchorElement ? selected.getAttribute("href") : ""));
    const serviceButton = selected.matches(".service-open") ? selected : selected.closest(".service-open");
    byId("admin-service-description").disabled = !selected.matches(".service-open");
    byId("admin-service-description").value = edit.serviceDescription ?? (serviceButton?.dataset.serviceDescription || "");
    byId("admin-service-example").disabled = !selected.matches(".service-open");
    byId("admin-service-example").value = edit.serviceExample ?? (serviceButton?.dataset.serviceExample || "");
    const project = projectForElement(selected);
    const projectFields = byId("admin-project-fields");
    projectFields.hidden = !project;
    if (project) {
      byId("admin-project-title").value = project.title || "";
      byId("admin-project-client").value = project.client || "";
      byId("admin-project-location").value = project.location || "";
      byId("admin-project-category").value = project.category || "activation";
      byId("admin-project-description").value = project.description || "";
      byId("admin-project-role").value = project.role || "";
      byId("admin-project-alt").value = project.alt || "";
    }
    byId("admin-parent").disabled = !selected.parentElement?.matches(CANDIDATE_SELECTOR);
    byId("admin-delete").disabled = selected.tagName === "MAIN";
    for (const [id, name] of [["admin-width", "width"], ["admin-height", "height"], ["admin-font-size", "fontSize"], ["admin-left", "left"], ["admin-top", "top"], ["admin-z-index", "zIndex"]]) {
      byId(id).value = (name === "width" || name === "height" ? edit.resize?.[name] : undefined) ?? edit.styles?.[name] ?? "";
    }
    byId("admin-color").value = edit.styles?.color || "#172019";
    byId("admin-background").value = edit.styles?.backgroundColor || "#f4f2e9";
    byId("admin-filter").value = edit.styles?.filter || "";
    for (const [id, name] of [["admin-bold", "fontWeight"], ["admin-italic", "fontStyle"], ["admin-underline", "textDecoration"], ["admin-shadow", "textShadow"]]) {
      byId(id).setAttribute("aria-pressed", String(Boolean(edit.styles?.[name] && edit.styles[name] !== "400")));
    }
  };
  const selectionTargets = () => [...selectedElements].filter((element) => element.isConnected);
  const updateSelectedStyles = (name, value) => {
    const targets = selectionTargets();
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].styles ||= {};
      if (value === undefined) delete state.edits[element.dataset.cmsId].styles[name];
      else state.edits[element.dataset.cmsId].styles[name] = value;
      applyStyle(element, state.edits[element.dataset.cmsId].styles);
    });
    if (targets.length) saveDraft();
  };

  const addProjectCard = (project) => {
    const grid = document.querySelector(".portfolio-grid");
    if (!grid || !project?.id || document.getElementById(`project-${project.id}`)) return;
    const card = document.createElement("article");
    card.className = "project-card";
    card.id = `project-${project.id}`;
    card.dataset.category = project.category || "activation";
    card.dataset.projectUrl = `${siteBaseUrl}/projects/?project=${encodeURIComponent(project.id)}`;
    card.setAttribute("role", "link");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `View case study: ${project.title}`);
    const imageWrap = document.createElement("div");
    imageWrap.className = "project-image-wrap";
    const image = document.createElement("img");
    image.src = project.image;
    image.alt = project.alt || project.title;
    image.loading = "lazy";
    image.width = 1200;
    image.height = 800;
    const index = document.createElement("span");
    index.className = "project-index";
    index.textContent = String(grid.children.length + 1).padStart(2, "0");
    imageWrap.append(image, index);
    const meta = document.createElement("div");
    meta.className = "project-meta";
    const client = document.createElement("span");
    client.textContent = project.client;
    const location = document.createElement("span");
    location.textContent = project.location;
    meta.append(client, location);
    const title = document.createElement("h3");
    title.textContent = project.title;
    const description = document.createElement("p");
    description.className = "project-description";
    description.textContent = project.description;
    const role = document.createElement("p");
    role.className = "project-role";
    const roleLabel = document.createElement("span");
    roleLabel.textContent = "MY ROLE";
    role.append(roleLabel, document.createTextNode(project.role));
    card.append(imageWrap, meta, title, description, role);
    grid.append(card);
    card.dataset.cmsId = `project-${project.id}`;
  };

  const addTextBlock = (type) => {
    const sectionId = byId("admin-block-target").value || "work";
    const block = {
      id: `content-block-${crypto.randomUUID()}`,
      sectionId,
      type,
      text: type === "heading" ? "New heading" : "Write your text here.",
    };
    state.contentBlocks.push(block);
    addContentBlock(block);
    saveDraft();
    const element = document.getElementById(block.id);
    if (element) {
      selectElement(element);
      scrollToSection(element);
    }
    setStatus("Editable content added. Select Update website to publish it.");
  };

  const addImageBlock = async (file) => {
    if (!file) return;
    try {
      const uploaded = await uploadFile(file);
      const sectionId = byId("admin-block-target").value || "work";
      const block = {
        id: `content-block-${crypto.randomUUID()}`,
        sectionId,
        type: "image",
        image: uploaded.url,
        alt: file.name.replace(/\.[^.]+$/, ""),
      };
      state.contentBlocks.push(block);
      addContentBlock(block);
      assignContentIds();
      saveDraft();
      const image = document.querySelector(`[data-cms-id="${CSS.escape(block.id)}-image"]`);
      if (image) {
        selectElement(image);
        scrollToSection(image);
      }
      setStatus("Photo added. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not add photo: ${error.message}`, "error");
    }
  };

  const moveContentBlock = (direction) => {
    const block = selected?.closest(".cms-added-content-block");
    if (!block) {
      setStatus("Select an added heading, text block, or photo to move it.", "error");
      return;
    }
    const siblings = [...block.parentElement.querySelectorAll(":scope > .cms-added-content-block")];
    const index = siblings.indexOf(block);
    const destination = siblings[index + direction];
    if (!destination) return;
    if (direction < 0) block.parentElement.insertBefore(block, destination);
    else block.parentElement.insertBefore(destination, block);
    const orderedIds = [...block.parentElement.querySelectorAll(":scope > .cms-added-content-block")].map((element) => element.id);
    const orderedBlocks = orderedIds.map((id) => state.contentBlocks.find((item) => item.id === id)).filter(Boolean);
    state.contentBlocks = [
      ...state.contentBlocks.filter((item) => item.sectionId !== block.closest("section")?.id),
      ...orderedBlocks,
    ];
    saveDraft();
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, data }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Upload failed (${response.status}).`);
    return result;
  };

  const resizeSelectedMedia = (dimension, value) => {
    const targets = selectionTargets().filter((element) => element instanceof HTMLImageElement || element instanceof HTMLVideoElement);
    if (!targets.length) return;
    targets.forEach((element) => {
      const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
      const frame = imageFrameFor(element);
      const bounds = frame.getBoundingClientRect();
      edit.resize = {
        ...(edit.resize || { width: bounds.width, height: bounds.height }),
        [dimension]: value,
      };
      applyImageResize(element, edit.resize);
    });
    saveDraft();
  };

  const requestMedia = (kind) => {
    mediaInput.accept = kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/gif,image/avif";
    mediaInput.click();
  };

  const updateText = (value) => {
    const targets = selectionTargets().filter((element) => element.matches(TEXT_SELECTOR));
    if (!targets.length) return;
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].text = value;
      element.textContent = value;
      element.style.whiteSpace = "pre-line";
    });
    saveDraft();
  };

  const beginTextEditing = (element) => {
    if (!element.matches(TEXT_SELECTOR) || element.isContentEditable) return;
    selectElement(element);
    element.contentEditable = "plaintext-only";
    element.classList.add("cms-text-editing");
    element.focus();
    const finish = () => {
      const edit = currentEdit();
      edit.text = element.innerText;
      element.textContent = edit.text;
      element.style.whiteSpace = "pre-line";
      element.contentEditable = "false";
      element.classList.remove("cms-text-editing");
      textInput.value = edit.text;
      saveDraft();
      element.removeEventListener("blur", finish);
    };
    element.addEventListener("input", () => {
      const edit = currentEdit();
      edit.text = element.innerText;
      textInput.value = edit.text;
      saveDraft();
    }, { once: true });
    element.addEventListener("blur", finish);
  };

  const publish = async () => {
    window.clearTimeout(draftTimer);
    const recoveryDraftSaved = persistDraft();
    const button = byId("admin-publish");
    button.disabled = true;
    setStatus("Saving a recovery version, then updating the paired preview…");
    try {
      await savePublishedVersion();
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Publish failed (${response.status}).`);
      localStorage.removeItem(STORAGE_KEY);
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("liam-site-updates");
        channel.postMessage("published");
        channel.close();
      }
      renderVersionList();
      setStatus("Updated the paired preview. Your GitHub Pages site changes after a separate GitHub deployment.", "saved");
    } catch (error) {
      const recoveryNotice = recoveryDraftSaved ? "" : " Your browser could not save a recovery draft.";
      setStatus(`Could not update the website: ${error.message}.${recoveryNotice}`, "error");
    } finally {
      button.disabled = false;
    }
  };

  const addSection = () => {
    const titleInput = byId("admin-new-section-title");
    const title = titleInput.value.trim();
    if (!title) {
      setStatus("Enter a name for the new section first.", "error");
      titleInput.focus();
      return;
    }
    const id = `page-${crypto.randomUUID()}`;
    const layout = byId("admin-section-template").value;
    const section = {
      id,
      title,
      text: "Add your introduction here.",
      layout: layout === "case-study" ? "case-study" : "editorial",
    };
    state.sections.push(section);
    if (state.sectionOrder.length) state.sectionOrder.push(id);
    if (section.layout === "case-study") {
      for (const [heading, text] of [
        ["Challenge", "Describe the audience or brand challenge."],
        ["Approach", "Explain the creative experience and execution."],
        ["Result", "Share the outcome and what made it successful."],
      ]) {
        state.contentBlocks.push(
          { id: `content-block-${crypto.randomUUID()}`, sectionId: id, type: "heading", text: heading },
          { id: `content-block-${crypto.randomUUID()}`, sectionId: id, type: "text", text },
        );
      }
    }
    renderEditorState();
    titleInput.value = "";
    saveDraft();
    const node = document.getElementById(id);
    if (node) {
      selectElement(node);
      scrollToSection(node);
    }
    setStatus(section.layout === "case-study"
      ? "Project story section added. Replace the challenge, approach, and result prompts with your details."
      : "Editorial section added. Select its heading or text to edit it.");
  };

  const addPortfolioProject = async () => {
    try {
      const image = await new Promise((resolve) => {
        const chooser = document.createElement("input");
        chooser.type = "file";
        chooser.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
        chooser.addEventListener("change", () => resolve(chooser.files[0] || null), { once: true });
        chooser.addEventListener("cancel", () => resolve(null), { once: true });
        chooser.click();
      });
      if (!image) return;
      const project = {
        id: `custom-${crypto.randomUUID()}`,
        title: window.prompt("Project title:")?.trim(),
        client: window.prompt("Brand or client:")?.trim() || "Independent",
        location: window.prompt("Event or location:")?.trim() || "",
        category: window.prompt("Category: activation, tour, content, or hosting", "activation")?.trim() || "activation",
        description: window.prompt("Short project description:")?.trim() || "",
        role: window.prompt("Your role:")?.trim() || "",
      };
      if (!project.title) return;
      project.category = ["activation", "tour", "content", "hosting"].includes(project.category) ? project.category : "activation";
      const uploaded = await uploadFile(image);
      project.image = uploaded.url;
      project.alt = project.title;
      state.projects.push(project);
      addProjectCard(project);
      saveDraft();
      selectElement(document.getElementById(`project-${project.id}`));
      setStatus("Project added. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not add project: ${error.message}`, "error");
    }
  };

  const readVersionSnapshots = () => {
    const saved = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!saved) return [];
    const versions = JSON.parse(saved);
    if (!Array.isArray(versions) || versions.length > 10 || versions.some((version) =>
      !version || !Number.isFinite(version.savedAt) || version.state?.version !== 1)) {
      throw new Error("The saved version history is invalid. It was left untouched.");
    }
    return versions;
  };

  const renderVersionList = () => {
    const list = byId("admin-version-list");
    const selected = list.value;
    try {
      const versions = readVersionSnapshots();
      list.replaceChildren();
      versions.forEach((version, index) => {
        const option = new Option(
          `${new Date(version.savedAt).toLocaleString()} — before update`,
          String(index),
        );
        list.append(option);
      });
      if (versions.some((_version, index) => String(index) === selected)) list.value = selected;
      byId("admin-version-restore").disabled = versions.length === 0;
    } catch (error) {
      list.replaceChildren(new Option("Version history could not be read", ""));
      byId("admin-version-restore").disabled = true;
      setStatus(error.message, "error");
    }
  };

  const savePublishedVersion = async () => {
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read the currently published version (${response.status}).`);
    const published = await response.json();
    if (!published || published.version !== 1 || typeof published.edits !== "object") {
      throw new Error("The currently published content is invalid; publishing was stopped to protect it.");
    }
    const versions = readVersionSnapshots();
    const snapshot = JSON.stringify(published);
    if (versions[0] && JSON.stringify(versions[0].state) === snapshot) return;
    versions.unshift({ savedAt: Date.now(), state: published });
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions.slice(0, 5)));
    renderVersionList();
  };

  const restorePublishedVersion = () => {
    let versions;
    try {
      versions = readVersionSnapshots();
    } catch (error) {
      setStatus(error.message, "error");
      return;
    }
    const index = Number(byId("admin-version-list").value);
    const version = versions[index];
    if (!version) {
      setStatus("Choose a saved version first.", "error");
      return;
    }
    if (!window.confirm("Load this previous published version as an editable draft? The current published preview will not change.")) return;
    const previousDraft = JSON.stringify(state);
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, JSON.parse(JSON.stringify(version.state)));
    state.edits ||= {};
    state.sections ||= [];
    state.sectionCopies ||= [];
    state.sectionOrder ||= [];
    state.projects ||= [];
    state.contentBlocks ||= [];
    state.buttons ||= [];
    state.mediaElements ||= [];
    undoHistory = [previousDraft];
    redoHistory = [];
    renderEditorState();
    lastHistorySnapshot = JSON.stringify(state);
    historyReady = true;
    window.clearTimeout(draftTimer);
    if (persistDraft()) {
      setStatus("Previous version loaded as a saved draft. Publish when you are ready to restore it.", "saved");
    }
  };

  const bindNumberField = (id, styleName) => {
    byId(id).addEventListener("input", (event) => {
      if (!selected) return;
      const value = event.currentTarget.value;
      if (selectedElements.size > 1) {
        selectionTargets().forEach((element) => {
          const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
          if ((element instanceof HTMLImageElement || element instanceof HTMLVideoElement) && (styleName === "width" || styleName === "height")) {
            if (value === "") {
              delete edit.resize;
              for (const property of ["width", "height", "aspect-ratio", "max-width"]) imageFrameFor(element).style.removeProperty(property);
            } else {
              resizeSelectedMedia(styleName, Number(value));
              return;
            }
          } else if (value === "") {
            delete edit.styles[styleName];
            element.style.removeProperty(styleName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
          } else {
            edit.styles[styleName] = Number(value);
            applyStyle(element, edit.styles);
          }
        });
        saveDraft();
        return;
      }
      if ((selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement) && (styleName === "width" || styleName === "height")) {
        const edit = currentEdit();
        if (value === "") {
          const frame = imageFrameFor(selected);
          for (const property of ["width", "height", "aspect-ratio", "max-width"]) frame.style.removeProperty(property);
          if (frame !== selected) {
            for (const property of ["width", "height", "max-width"]) selected.style.removeProperty(property);
          }
          delete edit.resize;
          delete edit.styles.width;
          delete edit.styles.height;
          delete edit.styles.maxWidth;
          byId("admin-width").value = "";
          byId("admin-height").value = "";
          saveDraft();
          return;
        }
        resizeSelectedMedia(styleName, Number(value));
        const updated = currentEdit().resize;
        byId("admin-width").value = Math.round(updated?.width || 0);
        byId("admin-height").value = Math.round(updated?.height || 0);
        return;
      }
      if (value === "") {
        const edit = currentEdit();
        delete edit.styles[styleName];
        selected.style.removeProperty(styleName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
        saveDraft();
        return;
      }
      saveField(currentEdit(), styleName, Number(value));
    });
  };

  toolbar.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", (event) => {
    if (toolbar.contains(event.target) || event.target.closest("[data-cms-control]") || !editMode) return;
    const element = event.target.closest(CANDIDATE_SELECTOR);
    if (!element || element.closest(".service-dialog") || element.isContentEditable) return;
    if (element.matches("a,button")) event.preventDefault();
    event.stopPropagation();
    if (event.shiftKey) event.preventDefault();
    selectElement(element, { toggle: event.shiftKey });
    if (event.detail === 2) beginTextEditing(element);
  }, true);

  document.addEventListener("dblclick", (event) => {
    if (toolbar.contains(event.target) || event.target.closest("[data-cms-control]") || !editMode) return;
    const element = event.target.closest(CANDIDATE_SELECTOR);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(element);
    if (element.matches(TEXT_SELECTOR)) {
      beginTextEditing(element);
    } else if (element instanceof HTMLImageElement || element instanceof HTMLVideoElement) {
      requestMedia(element instanceof HTMLVideoElement ? "video" : "image");
    }
  }, true);

  byId("admin-edit-mode").addEventListener("click", () => {
    editMode = true;
    byId("admin-edit-mode").setAttribute("aria-pressed", "true");
    byId("admin-preview-toggle").setAttribute("aria-pressed", "false");
    byId("admin-preview-toggle").textContent = "Preview draft";
    setStatus("Edit mode: select an item or double-click text and media.");
  });
  byId("admin-preview-toggle").addEventListener("click", () => {
    editMode = !editMode;
    byId("admin-edit-mode").setAttribute("aria-pressed", String(editMode));
    byId("admin-preview-toggle").setAttribute("aria-pressed", String(!editMode));
    byId("admin-preview-toggle").textContent = editMode ? "Preview draft" : "Return to editing";
    if (!editMode) selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
    else selectedElements.forEach((element) => element.classList.add("cms-highlight"));
    setStatus(editMode ? "Editing draft. Preview modes show the current unsaved design." : "Draft preview is active. The public website has not changed.");
  });
  byId("admin-publish").addEventListener("click", publish);
  byId("admin-collapse").addEventListener("click", () => {
    const collapsed = toolbar.classList.toggle("is-collapsed");
    byId("admin-collapse").textContent = collapsed ? "Show tools" : "Hide tools";
    byId("admin-collapse").setAttribute("aria-expanded", String(!collapsed));
    document.body.classList.toggle("cms-administrator-collapsed", collapsed);
    if (collapsed) document.body.style.setProperty("--admin-sidebar-width", "33px");
    else {
      let savedWidth = 278;
      try {
        savedWidth = Number(localStorage.getItem(sidebarWidthKey)) || 278;
      } catch (error) {
        setStatus(`Could not restore the saved sidebar width: ${error.message}`, "error");
      }
      setSidebarWidth(savedWidth);
    }
  });
  document.querySelectorAll("[data-preview-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.previewMode;
      document.body.classList.remove("cms-preview-tablet", "cms-preview-mobile");
      if (mode === "tablet") document.body.classList.add("cms-preview-tablet");
      if (mode === "mobile") document.body.classList.add("cms-preview-mobile");
      document.querySelectorAll("[data-preview-mode]").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
    });
  });
  textInput.addEventListener("input", () => updateText(textInput.value));
  byId("admin-theme").addEventListener("change", (event) => {
    state.theme = event.currentTarget.value;
    applyTheme();
    saveDraft();
  });
  byId("admin-font").addEventListener("change", (event) => {
    state.fontFamily = event.currentTarget.value;
    state.googleFont = "";
    document.querySelector("#editor-google-font-stylesheet")?.remove();
    if (state.fontFamily === "custom" && !state.fontFile) {
      state.fontFamily = "inherit";
      setToolbarAppearance();
      setStatus("Import a font file before choosing the imported font.");
      return;
    }
    if (state.fontFamily !== "custom") state.fontFile = null;
    applyTheme();
    saveDraft();
  });
  byId("admin-import-font").addEventListener("click", () => fontInput.click());
  fontInput.addEventListener("change", async () => {
    if (!fontInput.files?.[0]) return;
    try {
      const uploaded = await uploadFile(fontInput.files[0]);
      state.fontFile = uploaded;
      state.fontFamily = "custom";
      state.googleFont = "";
      document.querySelector("#editor-google-font-stylesheet")?.remove();
      const googleFontInput = document.querySelector("#editor-google-font");
      if (googleFontInput) googleFontInput.value = "";
      applyTheme();
      setToolbarAppearance();
      saveDraft();
      setStatus("Font imported and applied to the preview.");
    } catch (error) {
      setStatus(`Could not import font: ${error.message}`, "error");
    } finally {
      fontInput.value = "";
    }
  });
  byId("admin-replace-media").addEventListener("click", () => {
    if (selected) requestMedia(selected instanceof HTMLVideoElement ? "video" : "image");
  });
  mediaInput.addEventListener("change", async () => {
    if (!selected || !mediaInput.files?.[0]) return;
    try {
      const uploaded = await uploadFile(mediaInput.files[0]);
      const project = selected instanceof HTMLImageElement ? projectForElement(selected) : null;
      const edit = currentEdit();
      edit.media = uploaded.url;
      if (selected instanceof HTMLImageElement) {
        selected.src = uploaded.url;
        if (project) {
          project.image = uploaded.url;
          delete edit.media;
        }
      }
      if (selected instanceof HTMLVideoElement) {
        selected.src = uploaded.url;
        selected.load();
        if (selected.matches(".hero-video")) {
          state.heroVideos ||= { items: [], interval: 8 };
          state.heroVideos.items ||= [];
          if (state.heroVideos.items.length) state.heroVideos.items[0] = uploaded.url;
          else state.heroVideos.items.push(uploaded.url);
        }
        await selected.play().catch((error) => {
          if (error.name !== "NotAllowedError") throw error;
        });
      }
      saveDraft();
      setStatus("Media replaced. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not replace the media: ${error.message}`, "error");
    } finally {
      mediaInput.value = "";
    }
  });

  bindNumberField("admin-width", "width");
  bindNumberField("admin-height", "height");
  bindNumberField("admin-font-size", "fontSize");
  bindNumberField("admin-left", "left");
  bindNumberField("admin-top", "top");
  bindNumberField("admin-z-index", "zIndex");
  byId("admin-send-to-front").addEventListener("click", () => updateSelectedStyles("zIndex", 9999));
  byId("admin-send-to-back").addEventListener("click", () => updateSelectedStyles("zIndex", -9999));
  byId("admin-color").addEventListener("input", (event) => updateSelectedStyles("color", event.currentTarget.value));
  byId("admin-background").addEventListener("input", (event) => updateSelectedStyles("backgroundColor", event.currentTarget.value));
  byId("admin-filter").addEventListener("change", (event) => updateSelectedStyles("filter", event.currentTarget.value || undefined));
  byId("admin-alt").addEventListener("input", (event) => {
    if (!(selected instanceof HTMLImageElement)) return;
    currentEdit().alt = event.currentTarget.value;
    selected.alt = event.currentTarget.value;
    const project = projectForElement(selected);
    if (project) project.alt = event.currentTarget.value;
    saveDraft();
  });
  byId("admin-href").addEventListener("change", (event) => {
    if (!(selected instanceof HTMLAnchorElement || selected instanceof HTMLIFrameElement)) return;
    const value = event.currentTarget.value.trim();
    const valid = selected instanceof HTMLIFrameElement
      ? /^(https:\/\/|\/(?!\/))/i.test(value)
      : /^(https?:\/\/|mailto:|\/|#)/i.test(value);
    if (!valid) {
      setStatus("Use a secure HTTPS embed, http/https link, email link, or page anchor.", "error");
      event.currentTarget.value = selected instanceof HTMLIFrameElement ? selected.getAttribute("src") : selected.getAttribute("href");
      return;
    }
    if (selected instanceof HTMLIFrameElement) {
      currentEdit().src = value;
      selected.src = value;
    } else {
      currentEdit().href = value;
      selected.setAttribute("href", value);
    }
    saveDraft();
  });
  byId("admin-service-description").addEventListener("input", (event) => {
    if (!selected?.matches(".service-open")) return;
    currentEdit().serviceDescription = event.currentTarget.value;
    selected.dataset.serviceDescription = event.currentTarget.value;
    saveDraft();
  });
  byId("admin-service-example").addEventListener("input", (event) => {
    if (!selected?.matches(".service-open")) return;
    currentEdit().serviceExample = event.currentTarget.value;
    selected.dataset.serviceExample = event.currentTarget.value;
    saveDraft();
  });
  for (const [id, field] of [
    ["admin-project-title", "title"],
    ["admin-project-client", "client"],
    ["admin-project-location", "location"],
    ["admin-project-category", "category"],
    ["admin-project-description", "description"],
    ["admin-project-role", "role"],
    ["admin-project-alt", "alt"],
  ]) {
    byId(id).addEventListener("input", (event) => updateProjectField(field, event.currentTarget.value));
    byId(id).addEventListener("change", (event) => updateProjectField(field, event.currentTarget.value));
  }
  byId("admin-project-preview").addEventListener("click", previewCaseStudy);
  byId("admin-parent").addEventListener("click", () => {
    const parent = selected?.parentElement?.closest(CANDIDATE_SELECTOR);
    if (parent) selectElement(parent);
  });

  for (const [id, name, value] of [
    ["admin-bold", "fontWeight", "700"],
    ["admin-italic", "fontStyle", "italic"],
    ["admin-underline", "textDecoration", "underline"],
    ["admin-shadow", "textShadow", "1"],
  ]) {
    byId(id).addEventListener("click", () => {
      if (!selected) return;
      const active = byId(id).getAttribute("aria-pressed") !== "true";
      byId(id).setAttribute("aria-pressed", String(active));
      updateSelectedStyles(name, active ? value : undefined);
    });
  }
  byId("admin-duplicate").addEventListener("click", () => duplicateSelected());
  byId("admin-group").addEventListener("click", () => {
    const targets = selectionTargets();
    if (!targets.length) return;
    const groupId = selectionGroupId || `group-${crypto.randomUUID()}`;
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      if (selectionGroupId) delete state.edits[element.dataset.cmsId].groupId;
      else state.edits[element.dataset.cmsId].groupId = groupId;
    });
    selectionGroupId = selectionGroupId ? null : groupId;
    byId("admin-group").textContent = selectionGroupId ? "Ungroup" : "Group";
    saveDraft();
    setStatus(selectionGroupId ? "Selected elements grouped for joint movement." : "Selected elements ungrouped.");
  });
  byId("admin-lock").addEventListener("click", () => {
    const targets = selectionTargets();
    if (!targets.length) return;
    const lock = !state.edits[selected.dataset.cmsId]?.locked;
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].locked = lock;
      element.classList.toggle("cms-editor-locked", lock);
    });
    byId("admin-lock").textContent = lock ? "Unlock" : "Lock";
    saveDraft();
    setStatus(lock ? "Selected elements locked against dragging." : "Selected elements unlocked.");
  });
  byId("admin-send-backward").addEventListener("click", () => {
    selectionTargets().forEach((element) => {
      const current = Number(state.edits[element.dataset.cmsId]?.styles?.zIndex ?? getComputedStyle(element).zIndex) || 0;
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].styles.zIndex = current - 1;
      applyStyle(element, state.edits[element.dataset.cmsId].styles);
    });
    saveDraft();
  });
  byId("admin-bring-forward").addEventListener("click", () => {
    selectionTargets().forEach((element) => {
      const current = Number(state.edits[element.dataset.cmsId]?.styles?.zIndex ?? getComputedStyle(element).zIndex) || 0;
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].styles.zIndex = current + 1;
      applyStyle(element, state.edits[element.dataset.cmsId].styles);
    });
    saveDraft();
  });

  byId("admin-delete").addEventListener("click", () => {
    if (!selected || selected.tagName === "MAIN") return;
    selectionTargets().forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].deleted = true;
      element.hidden = true;
      element.classList.remove("cms-highlight", "cms-multi-selected");
    });
    selectedElements.clear();
    selectionName.textContent = "Hidden element(s)";
    byId("admin-delete").disabled = true;
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = true; });
    selected = null;
    saveDraft();
    renderSectionList();
  });
  byId("admin-restore").addEventListener("click", () => {
    for (const [id, edit] of Object.entries(state.edits)) {
      if (!edit.deleted) continue;
      const element = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (element) element.hidden = false;
      delete edit.deleted;
    }
    saveDraft();
    renderSectionList();
    setStatus("Hidden elements restored.");
  });
  byId("admin-add-section").addEventListener("click", addSection);
  byId("admin-new-section-title").addEventListener("keydown", (event) => {
    if (event.key === "Enter") addSection();
  });
  byId("admin-add-project").addEventListener("click", addPortfolioProject);
  byId("admin-add-heading-block").addEventListener("click", () => addTextBlock("heading"));
  byId("admin-add-text-block").addEventListener("click", () => addTextBlock("text"));
  byId("admin-add-image-block").addEventListener("click", () => byId("admin-block-image-file").click());
  byId("admin-block-image-file").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    await addImageBlock(input.files?.[0]);
    input.value = "";
  });
  byId("admin-block-up").addEventListener("click", () => moveContentBlock(-1));
  byId("admin-block-down").addEventListener("click", () => moveContentBlock(1));
  byId("admin-version-restore").addEventListener("click", restorePublishedVersion);
  byId("admin-reset-draft").addEventListener("click", () => {
    if (!window.confirm("Discard your unpublished browser draft and reload the last published website?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  byId("admin-drag").addEventListener("click", () => {
    dragMode = !dragMode;
    byId("admin-drag").setAttribute("aria-pressed", String(dragMode));
    setStatus("Every selected element can already be dragged directly. Alt-drag creates a copy; this toggle is kept for compatibility.");
  });
  let dragStart = null;
  document.addEventListener("pointerdown", (event) => {
    if (!editMode || toolbar.contains(event.target) || event.button !== 0) return;
    const clicked = event.target.closest(CANDIDATE_SELECTOR);
    if (!clicked || clicked.closest(".service-dialog")) return;
    if (!selectedElements.has(clicked)) selectElement(clicked, { toggle: event.shiftKey });
    if (!selectedElements.has(clicked)) return;
    const clickedEdit = state.edits[clicked.dataset.cmsId] || {};
    if (clickedEdit.locked) {
      setStatus("This element is locked. Unlock it before moving.", "error");
      return;
    }
    const clickedGroup = clickedEdit.groupId;
    const moving = clickedGroup
      ? selectionTargets().filter((element) => state.edits[element.dataset.cmsId]?.groupId === clickedGroup)
      : [clicked];
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      items: moving.map((element) => {
        const edit = state.edits[element.dataset.cmsId] || { styles: {} };
        const target = element instanceof HTMLImageElement ? imageFrameFor(element) : element;
        return {
          element,
          target,
          left: element instanceof HTMLImageElement
            ? Number.parseFloat(target.style.left) || 0
            : Number(edit.styles?.left || 0),
          top: element instanceof HTMLImageElement
            ? Number.parseFloat(target.style.top) || 0
            : Number(edit.styles?.top || 0),
        };
      }),
    };
    event.preventDefault();
  });
  document.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    dragStart.items.forEach(({ element, target, left: startLeft, top: startTop }) => {
      const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
      const left = Math.round(startLeft + event.clientX - dragStart.x);
      const top = Math.round(startTop + event.clientY - dragStart.y);
      if (element instanceof HTMLImageElement) {
        const bounds = target.getBoundingClientRect();
        edit.resize = {
          ...(edit.resize || { width: bounds.width, height: bounds.height }),
          offsetX: left,
          offsetY: top,
        };
        applyImageResize(element, edit.resize);
      } else {
        edit.styles.left = left;
        edit.styles.top = top;
        applyStyle(element, edit.styles);
      }
      if (element === selected) {
        byId("admin-left").value = left;
        byId("admin-top").value = top;
      }
    });
  });
  document.addEventListener("pointerup", () => {
    if (!dragStart) return;
    dragStart = null;
    saveDraft();
  });
  const handleEditorShortcut = (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const typing = event.target.matches("input, textarea, select") || event.target.isContentEditable;
    if (modifier && key === "s") {
      event.preventDefault();
      saveDraft();
      setStatus("Saving your draft…");
      return;
    }
    if (typing) return;
    if (modifier && key === "z") {
      event.preventDefault();
      event.shiftKey ? moveHistory(redoHistory, undoHistory) : moveHistory(undoHistory, redoHistory);
      return;
    }
    if (modifier && key === "y") {
      event.preventDefault();
      moveHistory(redoHistory, undoHistory);
      return;
    }
    if (modifier && key === "delete") {
      event.preventDefault();
      const section = selected?.closest("main > section");
      if (section && (section.classList.contains("cms-new-section") || section.classList.contains("cms-section-copy"))) {
        deleteAddedSection(section);
      } else if (section && window.confirm(`Hide "${sectionTitle(section)}" from the published page? You can restore it later.`)) {
        toggleSectionVisibility(section);
      }
      return;
    }
    if ((key === "delete" || key === "backspace") && selectedElements.size) {
      event.preventDefault();
      byId("admin-delete").click();
      return;
    }
    if (modifier && event.shiftKey && key === "g") {
      event.preventDefault();
      if (selectionGroupId) byId("admin-group").click();
      else setStatus("Select a grouped element first to ungroup it.", "error");
      return;
    }
    if (modifier && (key === "[" || key === "]")) {
      event.preventDefault();
      const amount = event.altKey ? 9999 : 1;
      updateSelectedStyles("zIndex", key === "]" ? amount : -amount);
      return;
    }
    if (event.shiftKey && modifier && [">", "."].includes(key)) {
      event.preventDefault();
      const field = byId("admin-font-size");
      field.value = String((Number(field.value) || 16) + 2);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (event.shiftKey && modifier && ["<", ","].includes(key)) {
      event.preventDefault();
      const field = byId("admin-font-size");
      field.value = String(Math.max(8, (Number(field.value) || 16) - 2));
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (event.shiftKey && modifier && key === "8") {
      event.preventDefault();
      updateSelectedStyles("whiteSpace", undefined);
      if (selected?.matches(TEXT_SELECTOR)) {
        const edit = currentEdit();
        edit.text = selected.textContent
          .split(/\s*\n\s*/).filter(Boolean).map((line) => `• ${line.trim()}`).join("\n");
        selected.textContent = edit.text;
        selected.style.whiteSpace = "pre-line";
      }
      saveDraft();
      return;
    }
    if (event.altKey && event.shiftKey && key === "t" && selectedElements.size > 1) {
      event.preventDefault();
      const targets = selectionTargets();
      const lefts = targets.map((element) => Number(state.edits[element.dataset.cmsId]?.styles?.left || 0));
      const tops = targets.map((element) => Number(state.edits[element.dataset.cmsId]?.styles?.top || 0));
      const avgLeft = Math.round(lefts.reduce((sum, value) => sum + value, 0) / targets.length);
      const avgTop = Math.round(tops.reduce((sum, value) => sum + value, 0) / targets.length);
      targets.forEach((element) => {
        state.edits[element.dataset.cmsId] ||= { styles: {} };
        state.edits[element.dataset.cmsId].styles.left = avgLeft;
        state.edits[element.dataset.cmsId].styles.top = avgTop;
        applyStyle(element, state.edits[element.dataset.cmsId].styles);
      });
      saveDraft();
      setStatus("Selected elements tidied to a shared position.");
      return;
    }
    if (modifier && key === "a") {
      event.preventDefault();
      const candidates = allCandidates().filter((element) => !element.hidden && element.getClientRects().length);
      selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
      selectedElements.clear();
      candidates.forEach((element) => selectedElements.add(element));
      selected = candidates.at(-1) || null;
      if (selected) selectElement(selected, { preserve: true });
      setStatus(`${selectedElements.size} visible elements selected.`);
      return;
    }
    if (modifier && key === "c") {
      event.preventDefault();
      if (selectedElements.size === 1) elementClipboard = selected;
      else setStatus("Copy one element at a time; multi-element copying is not supported yet.", "error");
      return;
    }
    if (modifier && key === "x") {
      event.preventDefault();
      if (selectedElements.size === 1) {
        elementClipboard = selected;
        byId("admin-delete").click();
      } else setStatus("Cut one element at a time.", "error");
      return;
    }
    if (modifier && key === "v") {
      event.preventDefault();
      if (elementClipboard) duplicateSelected(elementClipboard);
      return;
    }
    if (modifier && key === "d") {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    if (modifier && key === "g") {
      event.preventDefault();
      if (selectedElements.size > 1) byId("admin-group").click();
      else setStatus("Select multiple elements with Shift-click before grouping.", "error");
      return;
    }
    if (modifier && key === "enter") {
      event.preventDefault();
      addSection();
      return;
    }
    if (modifier && key === "/") {
      event.preventDefault();
      byId("admin-collapse").click();
      return;
    }
    if ((modifier && key === "e") || key === "/") {
      event.preventDefault();
      document.getElementById("editor-elements-tab")?.click();
      document.getElementById("editor-elements-search")?.focus();
      return;
    }
    if (modifier && key === "b") {
      event.preventDefault();
      byId("admin-bold").click();
      return;
    }
    if (modifier && key === "i") {
      event.preventDefault();
      byId("admin-italic").click();
      return;
    }
    if (modifier && key === "u") {
      event.preventDefault();
      byId("admin-underline").click();
      return;
    }
    if (event.shiftKey && modifier && key === "k" && selected?.matches(TEXT_SELECTOR)) {
      event.preventDefault();
      selectionTargets().filter((element) => element.matches(TEXT_SELECTOR)).forEach((element) => {
        const text = element.textContent;
        state.edits[element.dataset.cmsId] ||= { styles: {} };
        state.edits[element.dataset.cmsId].text = text === text.toUpperCase() ? text.toLowerCase() : text.toUpperCase();
        element.textContent = state.edits[element.dataset.cmsId].text;
      });
      saveDraft();
      return;
    }
    if (modifier && key === "k") {
      event.preventDefault();
      const link = window.prompt("Enter a secure URL, email link, or page anchor:", selected?.getAttribute("href") || "");
      if (link !== null && selected instanceof HTMLAnchorElement) byId("admin-href").value = link;
      if (link !== null && selected instanceof HTMLAnchorElement) byId("admin-href").dispatchEvent(new Event("change"));
      return;
    }
    if (event.shiftKey && modifier && ["l", "c", "r"].includes(key)) {
      event.preventDefault();
      updateSelectedStyles("textAlign", { l: "left", c: "center", r: "right" }[key]);
      return;
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && selectedElements.size) {
      event.preventDefault();
      const distance = event.shiftKey ? 10 : 1;
      selectionTargets().forEach((element) => {
        const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
        if (element instanceof HTMLImageElement) {
          const frame = imageFrameFor(element);
          const bounds = frame.getBoundingClientRect();
          edit.resize ||= { width: bounds.width, height: bounds.height };
          if (key === "arrowleft") edit.resize.offsetX = (edit.resize.offsetX || 0) - distance;
          if (key === "arrowright") edit.resize.offsetX = (edit.resize.offsetX || 0) + distance;
          if (key === "arrowup") edit.resize.offsetY = (edit.resize.offsetY || 0) - distance;
          if (key === "arrowdown") edit.resize.offsetY = (edit.resize.offsetY || 0) + distance;
          applyImageResize(element, edit.resize);
        } else {
          if (key === "arrowleft") edit.styles.left = (edit.styles.left || 0) - distance;
          if (key === "arrowright") edit.styles.left = (edit.styles.left || 0) + distance;
          if (key === "arrowup") edit.styles.top = (edit.styles.top || 0) - distance;
          if (key === "arrowdown") edit.styles.top = (edit.styles.top || 0) + distance;
          applyStyle(element, edit.styles);
        }
      });
      saveDraft();
      return;
    }
    if (!modifier && key === "t") {
      addTextBlock("text");
    } else if (!modifier && ["r", "c", "l", "s"].includes(key)) {
      addShape(key);
    }
  };

  const renderShape = (shape) => {
    const section = document.getElementById(shape.sectionId) || document.querySelector("main");
    if (!section || document.getElementById(shape.id)) return;
    const kinds = { rectangle: "div", circle: "div", line: "div", note: "p" };
    const element = document.createElement(kinds[shape.kind] || "div");
    element.className = `cms-added-content-block cms-shape cms-shape-${shape.kind}`;
    element.id = shape.id;
    element.dataset.cmsId = shape.id;
    if (shape.text) element.textContent = shape.text;
    section.append(element);
  };

  const addShape = (kind) => {
    const section = selected?.closest("main > section") || document.querySelector("main > section");
    if (!section) return;
    const shape = {
      id: `shape-${crypto.randomUUID()}`,
      sectionId: section.id || "home",
      kind: kind === "s" ? "note" : { r: "rectangle", c: "circle", l: "line" }[kind] || "rectangle",
      text: kind === "s" ? "Sticky note" : "",
    };
    state.shapes ||= [];
    if (state.shapes.length >= 100) {
      setStatus("The page supports up to 100 added shapes.", "error");
      return;
    }
    state.shapes.push(shape);
    renderShape(shape);
    assignContentIds();
    const element = document.getElementById(shape.id);
    if (element) {
      selectElement(element);
      scrollToSection(element);
    }
    saveDraft();
    setStatus({ rectangle: "Rectangle", circle: "Circle", line: "Line", note: "Sticky note" }[shape.kind] +
      " added. Drag it anywhere; select Update website to publish it.");
  };
  document.addEventListener("keydown", handleEditorShortcut);

  const portfolio = document.querySelector(".portfolio-section");
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "admin-add-project-button";
  addButton.textContent = "＋ Add project";
  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    addPortfolioProject();
  });
  portfolio?.querySelector(".section-heading")?.append(addButton);

  const filterNewCards = () => {
    const filter = document.querySelector(".filter-button.is-active")?.dataset.filter || "all";
    const customCards = [...document.querySelectorAll(".project-card[id^='project-custom-']")];
    customCards.forEach((card) => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
  };
  document.querySelectorAll(".filter-button").forEach((button) => button.addEventListener("click", filterNewCards));

  assignContentIds();
  populateBlockTargets();
  const ready = hydrateState().catch((error) => {
    setStatus(`Could not load editor data: ${error.message}`, "error");
    throw error;
  });
  renderVersionList();
  let imageResizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(imageResizeTimer);
    imageResizeTimer = window.setTimeout(() => {
      Object.entries(state.edits || {}).forEach(([id, edit]) => {
        const image = document.querySelector(`img[data-cms-id="${CSS.escape(id)}"]`);
        const legacyResize = edit.styles?.width && edit.styles?.height
          ? { width: edit.styles.width, height: edit.styles.height, offsetX: edit.styles.left, offsetY: edit.styles.top }
          : null;
        if (image && (edit.resize || legacyResize)) applyImageResize(image, edit.resize || legacyResize);
      });
    }, 100);
  });
  window.liamAdminEditor = {
    get state() { return state; },
    get selected() { return selected; },
    get ready() { return ready; },
    byId,
    currentEdit,
    selectElement,
    applyStyle,
    applyTheme,
    assignContentIds,
    saveDraft,
    uploadFile,
    setStatus,
    addProjectCard,
    renderSectionList,
    addContentBlock,
    applyImageResize,
    imageFrameFor,
    setExtensionRenderer: (renderer) => { extensionRenderer = renderer; },
    undo: () => moveHistory(undoHistory, redoHistory),
    redo: () => moveHistory(redoHistory, undoHistory),
  };
})();
