(() => {
  const editor = window.liamAdminEditor;
  if (!editor) return;

  const button = (id, label, extra = "") => `<button type="button" id="${id}" class="${extra}">${label}</button>`;
  const fieldset = (title, body, id) => `<details class="admin-tool-group editor-tool-group"><summary>${title}</summary><div class="editor-feature-body" id="${id}">${body}</div></details>`;
  const tools = document.createElement("section");
  tools.className = "editor-extensions";
  tools.innerHTML = `
    <div class="editor-history">
      ${button("editor-undo", "Undo")}
      ${button("editor-redo", "Redo")}
    </div>
    <div class="editor-tabs" role="tablist" aria-label="Editor tools">
      <button type="button" role="tab" id="editor-design-tab" aria-selected="true">Design</button>
      <button type="button" role="tab" id="editor-elements-tab" aria-selected="false">Elements</button>
    </div>
    <div id="editor-design-panel" role="tabpanel" aria-labelledby="editor-design-tab">
      ${fieldset("Google Fonts", `
        <label for="editor-google-font">Search 1,959 font families</label>
        <input id="editor-google-font" list="editor-google-font-list" autocomplete="off" placeholder="Type a font name">
        <datalist id="editor-google-font-list"></datalist>
        ${button("editor-clear-google-font", "Use original font")}
        <small>Font files are served by Google Fonts when the page loads.</small>
      `, "editor-font-body")}
      ${fieldset("Crop and resize image", `
        <label for="editor-crop-fit">Image fit</label>
        <select id="editor-crop-fit"><option value="cover">Fill / crop</option><option value="contain">Fit whole image</option><option value="fill">Stretch</option></select>
        <label for="editor-crop-x">Crop left / right <output id="editor-crop-x-value">50%</output></label>
        <input id="editor-crop-x" type="range" min="0" max="100" value="50">
        <label for="editor-crop-y">Crop top / bottom <output id="editor-crop-y-value">50%</output></label>
        <input id="editor-crop-y" type="range" min="0" max="100" value="50">
        <small>Select an image, then drag any of its eight handles to resize from an edge or corner.</small>
        <div class="editor-image-mode">
          ${button("editor-image-crop-mode", "Crop by dragging")}
          ${button("editor-image-resize-mode", "Resize by dragging")}
        </div>
      `, "editor-crop-body")}
      ${fieldset("Rotating hero videos", `
        <strong id="editor-video-count" class="editor-video-count">0 / 12 videos</strong>
        <label for="editor-video-interval">Seconds per video</label>
        <input id="editor-video-interval" type="number" min="3" max="300" step="1" value="8">
        <input id="editor-video-files" type="file" accept="video/mp4,video/webm" multiple hidden>
        ${button("editor-add-videos", "Add videos")}
        <div id="editor-video-list" class="editor-item-list"></div>
        <small>Add multiple MP4/WebM files. The hero video rotates through them in order.</small>
      `, "editor-video-body")}
      ${fieldset("Animations and photo rotator", `
        <label for="editor-animation">Selected element animation</label>
        <select id="editor-animation">
          <option value="none">None</option><option value="fade">Fade in</option>
          <option value="float">Float</option><option value="spin">Rotate</option>
          <option value="pulse">Pulse</option><option value="slideshow">Rotating photo array</option>
        </select>
        <label for="editor-photo-interval">Photo interval (seconds)</label>
        <input id="editor-photo-interval" type="number" min="2" max="300" step="1" value="5">
        <input id="editor-photo-files" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple hidden>
        ${button("editor-add-photos", "Add photos to rotator")}
        <div id="editor-photo-list" class="editor-item-list"></div>
        <small>The photo array applies to the selected image. Other animation presets apply to the selected element.</small>
      `, "editor-animation-body")}
      ${fieldset("Add a button", `
        <label for="editor-button-label">Button text</label><input id="editor-button-label" maxlength="80" placeholder="Explore my work">
        <label for="editor-button-link">Page section or secure URL</label><input id="editor-button-link" placeholder="#work or https://example.com">
        <label for="editor-button-target">Place in section</label><select id="editor-button-target"></select>
        ${button("editor-add-button", "Add button")}
        <div id="editor-button-list" class="editor-item-list"></div>
      `, "editor-button-body")}
      ${fieldset("AI copy assistant", `
        <p>Drag across a section’s heading or paragraph to choose the exact copy, then ask Claude for three alternatives. Nothing changes until you choose and apply an option.</p>
        ${button("editor-ai-select", "Select copy on page")}
        <small>Requires an Anthropic API key entered when starting the local editor.</small>
      `, "editor-ai-body")}
    </div>
    <div id="editor-elements-panel" role="tabpanel" aria-labelledby="editor-elements-tab" hidden>
      ${fieldset("Free-use image library", `
        <label for="editor-elements-search">Search Openverse images</label>
        <div class="editor-search-row"><input id="editor-elements-search" maxlength="120" placeholder="e.g. event crowd"><button type="button" id="editor-elements-search-button">Search</button></div>
        <small>Search is filtered to CC0, Public Domain, CC BY, and CC BY-SA for commercial use. Keep the shown credit.</small>
        <div class="editor-stock-links">
          <a target="_blank" rel="noopener noreferrer" href="https://pixabay.com/images/search/">Pixabay</a>
          <a target="_blank" rel="noopener noreferrer" href="https://unsplash.com/images">Unsplash</a>
          <a target="_blank" rel="noopener noreferrer" href="https://www.pexels.com/">Pexels</a>
        </div>
        <label for="editor-elements-page">Results page</label>
        <div class="editor-search-row">
          <select id="editor-elements-page" aria-label="Free-use image results page"></select>
          <button type="button" id="editor-elements-more">See more</button>
        </div>
        <div id="editor-elements-results" class="editor-stock-results" aria-live="polite"></div>
      `, "editor-elements-body")}
    </div>
  `;
  const toolbar = document.querySelector(".admin-toolbar");
  toolbar?.append(tools);

  const byId = (id) => document.getElementById(id);
  const status = (message, kind) => editor.setStatus(message, kind);
  const state = editor.state;
  state.buttons ||= [];
  state.mediaElements ||= [];
  state.heroVideos ||= null;
  state.googleFont ||= "";

  const setBusy = (element, busy, label) => {
    element.disabled = busy;
    if (busy) element.dataset.originalLabel = element.textContent;
    element.textContent = busy ? label : (element.dataset.originalLabel || label);
  };

  const setTab = (name) => {
    const design = name === "design";
    byId("editor-design-panel").hidden = !design;
    byId("editor-elements-panel").hidden = design;
    byId("editor-design-tab").setAttribute("aria-selected", String(design));
    byId("editor-elements-tab").setAttribute("aria-selected", String(!design));
  };
  byId("editor-design-tab").addEventListener("click", () => setTab("design"));
  byId("editor-elements-tab").addEventListener("click", () => setTab("elements"));
  byId("editor-undo").addEventListener("click", editor.undo);
  byId("editor-redo").addEventListener("click", editor.redo);

  const applyGoogleFont = (family, persist = true) => {
    state.googleFont = family;
    const link = byId("editor-google-font-stylesheet") || document.createElement("link");
    link.id = "editor-google-font-stylesheet";
    if (family) {
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}&display=swap`;
      document.head.append(link);
      document.documentElement.style.setProperty("--site-font", `"${family.replace(/["\\]/g, "")}", sans-serif`);
    } else {
      link.remove();
      editor.applyTheme();
    }
    if (persist) editor.saveDraft();
  };
  const loadGoogleFonts = async () => {
    try {
      const response = await fetch("/google-fonts.json", { cache: "force-cache" });
      if (!response.ok) throw new Error(`Font catalog request failed (${response.status}).`);
      const families = await response.json();
      const list = byId("editor-google-font-list");
      tools.querySelector('label[for="editor-google-font"]').textContent = `Search ${families.length.toLocaleString()} font families`;
      list.replaceChildren(...families.map((family) => {
        const option = document.createElement("option");
        option.value = family;
        return option;
      }));
      byId("editor-google-font").value = state.googleFont || "";
      if (state.googleFont) applyGoogleFont(state.googleFont, false);
    } catch (error) {
      status(`Could not load Google Fonts: ${error.message}`, "error");
    }
  };
  byId("editor-google-font").addEventListener("change", (event) => {
    const family = event.currentTarget.value.trim();
    if (![...byId("editor-google-font-list").options].some((option) => option.value === family)) {
      status("Choose a font family from the Google Fonts suggestions.", "error");
      event.currentTarget.value = state.googleFont || "";
      return;
    }
    applyGoogleFont(family);
  });
  byId("editor-clear-google-font").addEventListener("click", () => {
    byId("editor-google-font").value = "";
    applyGoogleFont("");
  });
  byId("admin-theme").addEventListener("change", () => {
    if (state.googleFont) window.setTimeout(() => applyGoogleFont(state.googleFont, false), 0);
  });
  byId("admin-font").addEventListener("change", () => {
    byId("editor-google-font").value = "";
  });

  const cropControls = ["editor-crop-fit", "editor-crop-x", "editor-crop-y"];
  const setCrop = () => {
    const image = editor.selected;
    if (!(image instanceof HTMLImageElement)) return;
    const edit = editor.currentEdit();
    edit.crop = {
      fit: byId("editor-crop-fit").value,
      x: Number(byId("editor-crop-x").value),
      y: Number(byId("editor-crop-y").value),
    };
    image.style.objectFit = edit.crop.fit;
    image.style.objectPosition = `${edit.crop.x}% ${edit.crop.y}%`;
    byId("editor-crop-x-value").value = `${edit.crop.x}%`;
    byId("editor-crop-y-value").value = `${edit.crop.y}%`;
    editor.saveDraft();
  };
  cropControls.forEach((id) => byId(id).addEventListener("input", setCrop));
  const resizeLayer = document.createElement("div");
  resizeLayer.className = "editor-resize-layer";
  resizeLayer.dataset.cmsControl = "true";
  resizeLayer.hidden = true;
  const resizeHandles = new Map();
  for (const direction of ["nw", "n", "ne", "e", "se", "s", "sw", "w"]) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = `editor-resize-handle editor-resize-${direction}`;
    handle.setAttribute("aria-label", `Resize image ${direction}`);
    handle.dataset.direction = direction;
    resizeLayer.append(handle);
    resizeHandles.set(direction, handle);
  }
  document.body.append(resizeLayer);
  const imageContextMenu = document.createElement("div");
  imageContextMenu.className = "editor-image-context-menu";
  imageContextMenu.dataset.cmsControl = "true";
  imageContextMenu.hidden = true;
  imageContextMenu.innerHTML = `
    <strong>Image tools</strong>
    <button type="button" data-image-tool="crop">Crop — drag to focus</button>
    <button type="button" data-image-tool="resize">Resize — drag handles</button>
    <button type="button" data-image-tool="close">Close</button>`;
  document.body.append(imageContextMenu);
  let activeImageTool = "resize";
  const setImageTool = (tool) => {
    activeImageTool = tool;
    document.body.classList.toggle("cms-crop-mode", tool === "crop");
    status(tool === "crop" ? "Crop mode: drag the image to choose its focus." : "Resize mode: drag the image handles.");
    syncResizeHandles();
  };
  const syncResizeHandles = () => {
    const image = editor.selected;
    resizeLayer.hidden = !(activeImageTool === "resize" && image instanceof HTMLImageElement && image.isConnected);
    if (resizeLayer.hidden) return;
    const rect = editor.imageFrameFor(image).getBoundingClientRect();
    const points = {
      nw: [rect.left, rect.top], n: [rect.left + rect.width / 2, rect.top],
      ne: [rect.right, rect.top], e: [rect.right, rect.top + rect.height / 2],
      se: [rect.right, rect.bottom], s: [rect.left + rect.width / 2, rect.bottom],
      sw: [rect.left, rect.bottom], w: [rect.left, rect.top + rect.height / 2],
    };
    resizeHandles.forEach((handle, direction) => {
      const [x, y] = points[direction];
      handle.style.left = `${x}px`;
      handle.style.top = `${y}px`;
    });
  };
  let resizeStart = null;
  resizeHandles.forEach((handle, direction) => {
    handle.addEventListener("pointerdown", (event) => {
      const image = editor.selected;
      if (!(image instanceof HTMLImageElement)) return;
      event.preventDefault();
      event.stopPropagation();
      const frame = editor.imageFrameFor(image);
      const rect = frame.getBoundingClientRect();
      const edit = state.edits[image.dataset.cmsId] || {};
      resizeStart = {
        image, frame, direction, x: event.clientX, y: event.clientY,
        width: rect.width, height: rect.height,
        offsetX: Number.parseFloat(frame.style.left) || 0,
        offsetY: Number.parseFloat(frame.style.top) || 0,
      };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (!resizeStart || resizeStart.direction !== direction) return;
      const dx = event.clientX - resizeStart.x;
      const dy = event.clientY - resizeStart.y;
      const width = Math.max(40, resizeStart.width + (direction.includes("e") ? dx : direction.includes("w") ? -dx : 0));
      const height = Math.max(30, resizeStart.height + (direction.includes("s") ? dy : direction.includes("n") ? -dy : 0));
      const offsetX = resizeStart.offsetX + (direction.includes("w") ? resizeStart.width - width : 0);
      const offsetY = resizeStart.offsetY + (direction.includes("n") ? resizeStart.height - height : 0);
      editor.applyImageResize(resizeStart.image, { width, height, offsetX, offsetY });
      syncResizeHandles();
    });
    handle.addEventListener("pointerup", () => {
      if (!resizeStart || resizeStart.direction !== direction) return;
      const frame = editor.imageFrameFor(resizeStart.image);
      const rect = frame.getBoundingClientRect();
      const edit = state.edits[resizeStart.image.dataset.cmsId] || (state.edits[resizeStart.image.dataset.cmsId] = { styles: {} });
      edit.resize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        offsetX: Number.parseFloat(frame.style.left) || 0,
        offsetY: Number.parseFloat(frame.style.top) || 0,
      };
      delete edit.styles?.width;
      delete edit.styles?.height;
      delete edit.styles?.maxWidth;
      delete edit.styles?.left;
      delete edit.styles?.top;
      byId("admin-width").value = edit.resize.width;
      byId("admin-height").value = edit.resize.height;
      resizeStart = null;
      editor.saveDraft();
      syncResizeHandles();
    });
    handle.addEventListener("pointercancel", () => { resizeStart = null; });
  });
  window.addEventListener("scroll", syncResizeHandles, true);
  window.addEventListener("resize", syncResizeHandles);
  document.addEventListener("click", (event) => {
    if (toolbar.contains(event.target) || event.target.closest("[data-cms-control]")) return;
    window.requestAnimationFrame(syncResizeHandles);
  }, true);
  document.addEventListener("dblclick", (event) => {
    if (toolbar.contains(event.target) || event.target.closest("[data-cms-control]")) return;
    window.requestAnimationFrame(syncResizeHandles);
  }, true);
  document.addEventListener("contextmenu", (event) => {
    const image = event.target.closest("img");
    if (!image || toolbar.contains(image) || image.closest(".editor-stock-card")) return;
    event.preventDefault();
    editor.selectElement(image);
    refreshSelectedControls();
    imageContextMenu.hidden = false;
    const menuWidth = 210;
    const menuHeight = 150;
    imageContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))}px`;
    imageContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))}px`;
  }, true);
  imageContextMenu.addEventListener("click", (event) => {
    const tool = event.target.closest("[data-image-tool]")?.dataset.imageTool;
    if (!tool) return;
    imageContextMenu.hidden = true;
    if (tool === "close") return;
    setImageTool(tool);
  });
  byId("editor-image-crop-mode").addEventListener("click", () => setImageTool("crop"));
  byId("editor-image-resize-mode").addEventListener("click", () => setImageTool("resize"));
  let cropStart = null;
  document.addEventListener("pointerdown", (event) => {
    if (activeImageTool !== "crop" || !(editor.selected instanceof HTMLImageElement) ||
        !editor.selected.contains(event.target) || toolbar.contains(event.target)) return;
    const image = editor.selected;
    const rect = editor.imageFrameFor(image).getBoundingClientRect();
    const edit = state.edits[image.dataset.cmsId] || {};
    cropStart = {
      image,
      x: event.clientX,
      y: event.clientY,
      rect,
      cropX: Number(edit.crop?.x ?? byId("editor-crop-x").value),
      cropY: Number(edit.crop?.y ?? byId("editor-crop-y").value),
    };
    event.preventDefault();
    event.stopPropagation();
    image.setPointerCapture?.(event.pointerId);
  }, true);
  document.addEventListener("pointermove", (event) => {
    if (!cropStart) return;
    const edit = state.edits[cropStart.image.dataset.cmsId] || (state.edits[cropStart.image.dataset.cmsId] = { styles: {} });
    const x = Math.max(0, Math.min(100, cropStart.cropX - ((event.clientX - cropStart.x) / cropStart.rect.width) * 100));
    const y = Math.max(0, Math.min(100, cropStart.cropY - ((event.clientY - cropStart.y) / cropStart.rect.height) * 100));
    edit.crop = { fit: "cover", x, y };
    cropStart.image.style.objectFit = "cover";
    cropStart.image.style.objectPosition = `${x}% ${y}%`;
    byId("editor-crop-fit").value = "cover";
    byId("editor-crop-x").value = x;
    byId("editor-crop-y").value = y;
    byId("editor-crop-x-value").value = `${Math.round(x)}%`;
    byId("editor-crop-y-value").value = `${Math.round(y)}%`;
  }, true);
  document.addEventListener("pointerup", () => {
    if (!cropStart) return;
    cropStart = null;
    editor.saveDraft();
  }, true);

  const videoElement = document.querySelector(".hero-video");
  const originalVideoSource = videoElement?.querySelector("source")?.src || "";
  let videoRotation;
  let previewHasRotatingVideos = Boolean(state.heroVideos?.items?.length);
  const drawVideoList = () => {
    const list = byId("editor-video-list");
    list.replaceChildren();
    const items = state.heroVideos?.items || [];
    byId("editor-video-count").textContent = `${items.length} / 12 videos`;
    items.forEach((src, index) => {
      const row = document.createElement("div");
      row.className = "editor-list-row";
      const label = document.createElement("span");
      label.textContent = `Video ${index + 1}: ${src.split("/").pop()}`;
      const actions = document.createElement("div");
      actions.className = "editor-list-actions";
      const up = document.createElement("button");
      up.type = "button";
      up.textContent = "↑";
      up.setAttribute("aria-label", `Move video ${index + 1} up`);
      up.disabled = index === 0;
      up.addEventListener("click", () => {
        [state.heroVideos.items[index - 1], state.heroVideos.items[index]] =
          [state.heroVideos.items[index], state.heroVideos.items[index - 1]];
        applyHeroVideos();
        editor.saveDraft();
      });
      const down = document.createElement("button");
      down.type = "button";
      down.textContent = "↓";
      down.setAttribute("aria-label", `Move video ${index + 1} down`);
      down.disabled = index === items.length - 1;
      down.addEventListener("click", () => {
        [state.heroVideos.items[index + 1], state.heroVideos.items[index]] =
          [state.heroVideos.items[index], state.heroVideos.items[index + 1]];
        applyHeroVideos();
        editor.saveDraft();
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        state.heroVideos.items.splice(index, 1);
        if (!state.heroVideos.items.length) state.heroVideos = null;
        applyHeroVideos();
        editor.saveDraft();
      });
      actions.append(up, down, remove);
      row.append(label, actions);
      list.append(row);
    });
  };
  const applyHeroVideos = () => {
    if (!videoElement) return;
    window.clearInterval(videoRotation);
    const items = state.heroVideos?.items || [];
    if (!items.length) {
      if (!previewHasRotatingVideos) {
        drawVideoList();
        return;
      }
      videoElement.removeAttribute("src");
      if (originalVideoSource) videoElement.querySelector("source").src = originalVideoSource;
      videoElement.load();
      videoElement.play().catch((error) => console.error("Could not resume the original hero video.", error));
      previewHasRotatingVideos = false;
      drawVideoList();
      return;
    }
    previewHasRotatingVideos = true;
    let index = 0;
    const playCurrent = () => {
      videoElement.src = items[index % items.length];
      videoElement.load();
      videoElement.play().catch((error) => {
        if (error.name !== "AbortError") status(`Could not play hero video: ${error.message}`, "error");
      });
      index += 1;
    };
    playCurrent();
    if (items.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      videoRotation = window.setInterval(playCurrent, Math.max(3, Math.min(300, Number(state.heroVideos.interval) || 8)) * 1000);
    }
    drawVideoList();
  };
  byId("editor-video-interval").value = state.heroVideos?.interval || 8;
  byId("editor-video-interval").addEventListener("change", (event) => {
    state.heroVideos ||= { items: [], interval: 8 };
    state.heroVideos.interval = Number(event.currentTarget.value) || 8;
    applyHeroVideos();
    editor.saveDraft();
  });
  const videoFiles = byId("editor-video-files");
  byId("editor-add-videos").addEventListener("click", () => videoFiles.click());
  videoFiles.addEventListener("change", async () => {
    try {
      state.heroVideos ||= { items: [], interval: Number(byId("editor-video-interval").value) || 8 };
      const availableSlots = Math.max(0, 12 - state.heroVideos.items.length);
      const selectedFiles = [...(videoFiles.files || [])].slice(0, availableSlots);
      if (!selectedFiles.length) throw new Error("The hero rotation supports up to 12 videos.");
      for (const file of selectedFiles) {
        const uploaded = await editor.uploadFile(file);
        state.heroVideos.items.push(uploaded.url);
      }
      applyHeroVideos();
      editor.saveDraft();
      status("Hero videos added. Select Update website to publish them.");
    } catch (error) {
      status(`Could not add hero videos: ${error.message}`, "error");
    } finally {
      videoFiles.value = "";
    }
  });

  const animationTimers = new Map();
  const animationMap = {
    fade: "cmsFadeIn 1.2s ease both",
    float: "cmsFloat 3s ease-in-out infinite",
    spin: "cmsSpin 6s linear infinite",
    pulse: "cmsPulse 2s ease-in-out infinite",
  };
  const applyAnimation = (element, edit) => {
    element.style.animation = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "" : (animationMap[edit.animation] || "");
    if (edit.slideshow?.items?.length && element instanceof HTMLImageElement) {
      window.clearInterval(animationTimers.get(element));
      let index = 0;
      element.src = edit.slideshow.items[0];
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const timer = window.setInterval(() => {
          index = (index + 1) % edit.slideshow.items.length;
          element.src = edit.slideshow.items[index];
        }, Math.max(2, Math.min(300, Number(edit.slideshow.interval) || 5)) * 1000);
        animationTimers.set(element, timer);
      }
    }
  };
  const animationSelect = byId("editor-animation");
  animationSelect.addEventListener("change", () => {
    const element = editor.selected;
    if (!element) {
      status("Select an element before applying an animation.", "error");
      animationSelect.value = "none";
      return;
    }
    if (animationSelect.value === "slideshow" && !(element instanceof HTMLImageElement)) {
      status("Select an image before choosing the rotating photo array.", "error");
      animationSelect.value = "none";
      return;
    }
    const edit = editor.currentEdit();
    edit.animation = animationSelect.value;
    if (edit.animation !== "slideshow" && edit.slideshow) {
      window.clearInterval(animationTimers.get(element));
      delete edit.slideshow;
      if (edit.media && element instanceof HTMLImageElement) element.src = edit.media;
    }
    applyAnimation(element, edit);
    editor.saveDraft();
  });
  const photoFiles = byId("editor-photo-files");
  byId("editor-add-photos").addEventListener("click", () => {
    if (!(editor.selected instanceof HTMLImageElement)) {
      status("Select an image on the page before adding a photo array.", "error");
      return;
    }
    animationSelect.value = "slideshow";
    photoFiles.click();
  });
  photoFiles.addEventListener("change", async () => {
    if (!(editor.selected instanceof HTMLImageElement) || !photoFiles.files?.length) return;
    if (photoFiles.files.length < 2) {
      status("Choose at least two images for a rotating photo array.", "error");
      photoFiles.value = "";
      return;
    }
    try {
      const images = [];
      for (const file of [...photoFiles.files].slice(0, 30)) images.push((await editor.uploadFile(file)).url);
      const edit = editor.currentEdit();
      edit.slideshow = { items: images.slice(0, 30), interval: Number(byId("editor-photo-interval").value) || 5 };
      edit.animation = "slideshow";
      edit.media = edit.slideshow.items[0];
      editor.selected.src = edit.media;
      applyAnimation(editor.selected, edit);
      drawPhotoList(edit);
      animationSelect.value = "slideshow";
      editor.saveDraft();
      status("Photo rotator added. Select Update website to publish it.");
    } catch (error) {
      status(`Could not add photos: ${error.message}`, "error");
    } finally {
      photoFiles.value = "";
    }
  });
  const drawPhotoList = (edit) => {
    const list = byId("editor-photo-list");
    list.replaceChildren();
    (edit.slideshow?.items || []).forEach((src, index) => {
      const row = document.createElement("div");
      row.className = "editor-list-row";
      const label = document.createElement("span");
      label.textContent = `Photo ${index + 1}: ${src.split("/").pop()}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        edit.slideshow.items.splice(index, 1);
        if (!edit.slideshow.items.length) {
          delete edit.slideshow;
          edit.animation = "none";
          animationSelect.value = "none";
          window.clearInterval(animationTimers.get(editor.selected));
          editor.selected.src = edit.media || editor.selected.src;
        } else {
          if (index === 0) {
            edit.media = edit.slideshow.items[0];
            editor.selected.src = edit.media;
          }
          applyAnimation(editor.selected, edit);
        }
        editor.saveDraft();
        drawPhotoList(edit);
      });
      row.append(label, remove);
      list.append(row);
    });
  };
  byId("editor-photo-interval").addEventListener("change", (event) => {
    if (!(editor.selected instanceof HTMLImageElement)) return;
    const edit = editor.currentEdit();
    if (!edit.slideshow) return;
    edit.slideshow.interval = Number(event.currentTarget.value) || 5;
    applyAnimation(editor.selected, edit);
    editor.saveDraft();
  });

  const drawButtons = () => {
    const list = byId("editor-button-list");
    list.replaceChildren();
    (state.buttons || []).forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "editor-list-row";
      const label = document.createElement("span");
      label.textContent = `${item.label} → ${item.href}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        state.buttons.splice(index, 1);
        document.getElementById(item.id)?.remove();
        editor.saveDraft();
        drawButtons();
      });
      row.append(label, remove);
      list.append(row);
    });
  };
  const renderButton = (item) => {
    const section = document.getElementById(item.sectionId) || document.querySelector("main");
    if (!section || document.getElementById(item.id)) return;
    let group = section.querySelector(`.custom-cta-group[data-group-for="${CSS.escape(item.sectionId)}"]`);
    if (!group) {
      group = document.createElement("div");
      group.className = "custom-cta-group";
      group.dataset.groupFor = item.sectionId;
      section.append(group);
    }
    const link = document.createElement("a");
    link.className = "button button-lime custom-cta";
    link.id = item.id;
    link.dataset.cmsId = item.id;
    link.dataset.cmsPublishedAddition = "true";
    link.href = item.href;
    link.textContent = item.label;
    group.append(link);
  };
  const targetSelect = byId("editor-button-target");
  const populateTargets = () => {
    const current = targetSelect.value;
    targetSelect.replaceChildren(new Option("Choose a section", ""));
    document.querySelectorAll("main > section[id]").forEach((section) => {
      const option = new Option((section.querySelector("h1,h2,h3")?.textContent || section.id).trim(), section.id);
      targetSelect.append(option);
    });
    if (current) targetSelect.value = current;
  };
  populateTargets();
  byId("editor-add-button").addEventListener("click", () => {
    const label = byId("editor-button-label").value.trim();
    const href = byId("editor-button-link").value.trim();
    const sectionId = targetSelect.value;
    const validLink = /^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+|\/(?!\/)[^\s]*|#[\w-]+)$/i.test(href) &&
      (!href.startsWith("#") || document.getElementById(href.slice(1)));
    if (!label || !validLink || !sectionId) {
      status("Enter button text, choose a section, and use an HTTPS, email, or existing page-section link.", "error");
      return;
    }
    const item = { id: `custom-cta-${crypto.randomUUID()}`, label, href, sectionId };
    if (state.buttons.length >= 50) {
      status("The page supports up to 50 custom buttons.", "error");
      return;
    }
    state.buttons.push(item);
    renderButton(item);
    byId("editor-button-label").value = "";
    byId("editor-button-link").value = "";
    editor.saveDraft();
    drawButtons();
  });
  const existingButtons = document.querySelectorAll(".custom-cta");
  if (existingButtons.length) populateTargets();

  const elementsSearch = byId("editor-elements-search");
  const resultsContainer = byId("editor-elements-results");
  const elementsPage = byId("editor-elements-page");
  elementsPage.replaceChildren(...Array.from({ length: 99 }, (_value, index) =>
    new Option(String(index + 1), String(index + 1))));
  let stockSearchQuery = "";
  const stockSearch = async () => {
    const query = elementsSearch.value.trim();
    if (query.length < 2) {
      status("Enter at least two characters to search Openverse.", "error");
      return;
    }
    if (query !== stockSearchQuery) {
      stockSearchQuery = query;
      elementsPage.value = "1";
    }
    const page = Number(elementsPage.value);
    if (!Number.isInteger(page) || page < 1 || page > 99) {
      status("Choose a results page from 1 to 99.", "error");
      return;
    }
    const encodedQuery = encodeURIComponent(query);
    const providerSearches = [
      ["https://pixabay.com/images/search/", `https://pixabay.com/images/search/${encodedQuery}/`],
      ["https://unsplash.com/images", `https://unsplash.com/s/photos/${encodedQuery}`],
      ["https://www.pexels.com/", `https://www.pexels.com/search/${encodedQuery}/`],
    ];
    const providerLinks = [...tools.querySelectorAll(".editor-stock-links a")];
    providerSearches.forEach(([, url], index) => {
      if (providerLinks[index]) providerLinks[index].href = url;
    });
    resultsContainer.textContent = "Searching Openverse…";
    const searchButton = byId("editor-elements-search-button");
    setBusy(searchButton, true, "Searching…");
    try {
      const response = await fetch(`/api/elements?q=${encodeURIComponent(query)}&page=${page}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Search failed (${response.status}).`);
      resultsContainer.replaceChildren();
      if (!result.results.length) {
        resultsContainer.textContent = "No images found. Try a broader search.";
        return;
      }
      for (const image of result.results) {
        const card = document.createElement("article");
        card.className = "editor-stock-card";
        const preview = document.createElement("img");
        preview.src = image.thumbnail;
        preview.alt = "";
        preview.loading = "lazy";
        const title = document.createElement("strong");
        title.textContent = image.title || "Untitled image";
        const attribution = document.createElement("small");
        attribution.textContent = `${image.creator || "Unknown creator"} · ${(image.license || "License").toUpperCase()} ${image.license_version || ""}`;
        const source = document.createElement("a");
        const safeSourceUrl = /^https:\/\//i.test(image.source_url || "") ? image.source_url : "";
        if (safeSourceUrl) {
          source.href = safeSourceUrl;
          source.target = "_blank";
          source.rel = "noopener noreferrer";
          source.textContent = "View source and license";
        } else {
          source.textContent = "Source unavailable";
        }
        const add = document.createElement("button");
        add.type = "button";
        add.textContent = "Add to design";
        add.addEventListener("click", async () => {
          if (state.mediaElements.length >= 100 && !(editor.selected instanceof HTMLImageElement)) {
              status("The page supports up to 100 inserted stock images.", "error");
              return;
            }
            const targetImage = editor.selected instanceof HTMLImageElement ? editor.selected : null;
          const section = targetImage?.closest("main > section") || editor.selected?.closest("main > section") ||
            (editor.selected?.matches("main > section") ? editor.selected : null);
          if (!targetImage && !section) {
            status("Select an image to replace, or select a page section where the image should be added.", "error");
            return;
          }
          add.disabled = true;
          try {
            const response = await fetch("/api/import-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: image.id }),
            });
            const imported = await response.json();
            if (!response.ok) throw new Error(imported.error || `Import failed (${response.status}).`);
            if (targetImage) {
              const edit = editor.currentEdit();
              edit.media = imported.url;
              edit.alt = image.title || image.creator || "Creative Commons image";
              edit.credit = imported.credit;
              targetImage.src = imported.url;
              targetImage.alt = edit.alt;
              renderCredit(targetImage, edit.credit);
            } else {
              const item = {
                id: `stock-image-${crypto.randomUUID()}`,
                sectionId: section.id,
                image: imported.url,
                alt: image.title || image.creator || "Creative Commons image",
                credit: imported.credit,
              };
              state.mediaElements.push(item);
              renderStockElement(item);
            }
            editor.saveDraft();
            status("Image added with its license credit. Select Update website to publish it.");
          } catch (error) {
            status(`Could not add image: ${error.message}`, "error");
          } finally {
            add.disabled = false;
          }
        });
        card.append(preview, title, attribution, source, add);
        resultsContainer.append(card);
      }
    } catch (error) {
      resultsContainer.textContent = "";
      status(`Could not search free-use images: ${error.message}`, "error");
    } finally {
      setBusy(searchButton, false, "Search");
    }
  };
  byId("editor-elements-search-button").addEventListener("click", stockSearch);
  elementsPage.addEventListener("change", () => {
    if (elementsSearch.value.trim().length >= 2) stockSearch();
  });
  byId("editor-elements-more").addEventListener("click", () => {
    const nextPage = Math.min(99, Number(elementsPage.value) + 1);
    if (nextPage === Number(elementsPage.value)) {
      status("You are already on the last available results page.", "error");
      return;
    }
    elementsPage.value = String(nextPage);
    elementsPage.dispatchEvent(new Event("change", { bubbles: true }));
  });
  elementsSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      stockSearch();
    }
  });

  function renderCredit(image, credit, creditContainer = image.parentElement?.parentElement) {
    if (!credit || !image.parentElement) return;
    if (!/^https:\/\//i.test(credit.source_url || "") || !/^https:\/\//i.test(credit.license_url || "")) return;
    creditContainer?.querySelector(":scope > .cms-stock-credit")?.remove();
    const caption = document.createElement("small");
    caption.className = "cms-stock-credit";
    const source = document.createElement("a");
    source.href = credit.source_url;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = [credit.title, credit.creator && `by ${credit.creator}`].filter(Boolean).join(" ");
    const license = document.createElement("a");
    license.href = credit.license_url;
    license.target = "_blank";
    license.rel = "noopener noreferrer";
    license.textContent = `${credit.license || "Creative Commons"} ${credit.license_version || ""}`.trim();
    caption.append(source, document.createTextNode(" · "), license);
    creditContainer?.append(caption);
  }

  const renderStockElement = (item) => {
    const section = document.getElementById(item.sectionId);
    if (!section || document.getElementById(item.id)) return;
    const figure = document.createElement("figure");
    figure.className = "cms-stock-image";
    figure.id = item.id;
    figure.dataset.cmsId = item.id;
    const image = document.createElement("img");
    image.dataset.cmsId = `${item.id}-image`;
    image.src = item.image;
    image.alt = item.alt || "";
    image.loading = "lazy";
    figure.append(image);
    if (item.credit) renderCredit(image, item.credit, figure);
    section.append(figure);
    editor.assignContentIds();
  };

  const dialog = document.createElement("dialog");
  dialog.className = "editor-ai-dialog";
  dialog.dataset.cmsControl = "true";
  dialog.innerHTML = `
    <form method="dialog">
      <button class="editor-ai-close" value="cancel" aria-label="Close">×</button>
      <h2>Improve selected copy</h2>
      <p class="editor-ai-context"></p>
      <label for="editor-ai-prompt">What should change?</label>
      <textarea id="editor-ai-prompt" maxlength="1000" required placeholder="Make this clearer, warmer, shorter, or more focused on bookings."></textarea>
      <button type="button" class="editor-ai-generate">Generate three options</button>
      <fieldset class="editor-ai-options" hidden><legend>Choose an option to preview</legend><div></div></fieldset>
      <div class="editor-ai-actions">
        <button type="button" class="editor-ai-apply" disabled>Apply selected option</button>
        <button value="cancel">Cancel</button>
      </div>
      <p class="editor-ai-status" role="status" aria-live="polite"></p>
      <small>Your selected copy and prompt are sent to Anthropic only when you request suggestions. The text is not saved by this editor.</small>
    </form>`;
  document.body.append(dialog);
  let aiTarget = null;
  const aiSelectButton = byId("editor-ai-select");
  const aiGenerate = dialog.querySelector(".editor-ai-generate");
  const aiStatus = dialog.querySelector(".editor-ai-status");
  const aiOptions = dialog.querySelector(".editor-ai-options");
  const aiApply = dialog.querySelector(".editor-ai-apply");
  let optionValues = [];

  const finishAiSelection = (start, end) => {
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    const section = document.elementFromPoint(end.x, end.y)?.closest("main > section");
    if (!section) {
      status("Drag inside a page section to select its copy.", "error");
      return;
    }
    const candidates = [...section.querySelectorAll("h1,h2,h3,h4,p,.service-summary,.project-description,.step-copy")];
    aiTarget = candidates.map((element) => {
      const rect = element.getBoundingClientRect();
      const area = Math.max(0, Math.min(right, rect.right) - Math.max(left, rect.left)) *
        Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top));
      return { element, area };
    }).filter((candidate) => candidate.area > 0 && candidate.element.innerText.trim())
      .sort((a, b) => b.area - a.area)[0]?.element;
    if (!aiTarget) {
      status("Drag over a heading or paragraph inside the section.", "error");
      return;
    }
    editor.selectElement(aiTarget);
    dialog.querySelector(".editor-ai-context").textContent = `Selected copy: “${aiTarget.innerText.trim().slice(0, 180)}”`;
    dialog.querySelector("#editor-ai-prompt").value = "";
    dialog.querySelector("#editor-ai-prompt").focus();
    aiOptions.hidden = true;
    aiApply.disabled = true;
    dialog.showModal();
  };

  let selectionStart = null;
  const selectionBox = document.createElement("div");
  selectionBox.className = "editor-ai-selection-box";
  selectionBox.dataset.cmsControl = "true";
  selectionBox.hidden = true;
  document.body.append(selectionBox);
  aiSelectButton.addEventListener("click", () => {
    selectionStart = null;
    document.body.classList.add("editor-ai-selecting");
    status("Drag across the heading or paragraph you want Claude to improve.");
  });
  document.addEventListener("pointerdown", (event) => {
    if (!document.body.classList.contains("editor-ai-selecting") || toolbar.contains(event.target) || event.target.closest("[data-cms-control]")) return;
    if (!event.target.closest("main > section")) return;
    selectionStart = { x: event.clientX, y: event.clientY };
    selectionBox.hidden = false;
    selectionBox.style.left = `${event.clientX}px`;
    selectionBox.style.top = `${event.clientY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    event.preventDefault();
  }, true);
  document.addEventListener("pointermove", (event) => {
    if (!selectionStart) return;
    const left = Math.min(selectionStart.x, event.clientX);
    const top = Math.min(selectionStart.y, event.clientY);
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${Math.abs(event.clientX - selectionStart.x)}px`;
    selectionBox.style.height = `${Math.abs(event.clientY - selectionStart.y)}px`;
  }, true);
  document.addEventListener("pointerup", (event) => {
    if (!selectionStart) return;
    const start = selectionStart;
    selectionStart = null;
    selectionBox.hidden = true;
    document.body.classList.remove("editor-ai-selecting");
    finishAiSelection(start, { x: event.clientX, y: event.clientY });
    event.preventDefault();
  }, true);
  dialog.querySelector("#editor-ai-prompt").addEventListener("input", () => {
    aiOptions.hidden = true;
    aiApply.disabled = true;
    optionValues = [];
  });
  aiGenerate.addEventListener("click", async () => {
    if (!aiTarget) return;
    const prompt = dialog.querySelector("#editor-ai-prompt").value.trim();
    if (!prompt) {
      aiStatus.textContent = "Describe what you want to improve first.";
      return;
    }
    setBusy(aiGenerate, true, "Generating…");
    aiStatus.textContent = "Asking Claude for three alternatives…";
    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, selected_text: aiTarget.innerText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `AI request failed (${response.status}).`);
      optionValues = result.options;
      const choices = aiOptions.querySelector("div");
      choices.replaceChildren();
      optionValues.forEach((option, index) => {
        const label = document.createElement("label");
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "editor-ai-option";
        radio.value = String(index);
        radio.checked = false;
        const text = document.createElement("span");
        text.textContent = option;
        radio.addEventListener("change", () => { aiApply.disabled = false; });
        label.append(radio, text);
        choices.append(label);
      });
      aiOptions.hidden = false;
      aiApply.disabled = true;
      aiStatus.textContent = "Review the options. Nothing has changed yet.";
    } catch (error) {
      aiStatus.textContent = error.message;
    } finally {
      setBusy(aiGenerate, false, "Generate three options");
    }
  });
  aiApply.addEventListener("click", () => {
    const option = dialog.querySelector('input[name="editor-ai-option"]:checked');
    if (!aiTarget || !option || !optionValues[Number(option.value)]) return;
    const text = optionValues[Number(option.value)];
    const edit = editor.currentEdit();
    edit.text = text;
    aiTarget.textContent = text;
    aiTarget.style.whiteSpace = "pre-line";
    editor.saveDraft();
    dialog.close();
    status("Selected AI copy applied to the draft. Select Update website to publish it.");
  });

  const refreshSelectedControls = () => {
    const element = editor.selected;
    const image = element instanceof HTMLImageElement;
    tools.querySelectorAll("#editor-crop-body input,#editor-crop-body select,#editor-add-photos,#editor-animation,#editor-image-crop-mode,#editor-image-resize-mode")
      .forEach((control) => { control.disabled = !image; });
    if (image) {
      const edit = state.edits[element.dataset.cmsId] || {};
      byId("editor-crop-fit").value = edit.crop?.fit || element.style.objectFit || "cover";
      byId("editor-crop-x").value = edit.crop?.x ?? (Number.parseFloat(element.style.objectPosition) || 50);
      byId("editor-crop-y").value = edit.crop?.y ?? 50;
      byId("editor-animation").value = edit.animation || "none";
      byId("editor-photo-interval").value = edit.slideshow?.interval || 5;
    } else if (element) {
      byId("editor-animation").disabled = false;
      byId("editor-animation").value = state.edits[element.dataset.cmsId]?.animation || "none";
    }
    syncResizeHandles();
  };
  const refreshEditorExtensions = () => {
    animationTimers.forEach((timer) => window.clearInterval(timer));
    animationTimers.clear();
    applyHeroVideos();
    drawButtons();
    (state.buttons || []).forEach(renderButton);
    (state.mediaElements || []).forEach(renderStockElement);
    Object.entries(state.edits || {}).forEach(([id, edit]) => {
      const element = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (!element) return;
      if (edit.crop && element instanceof HTMLImageElement) {
        element.style.objectFit = edit.crop.fit || "cover";
        element.style.objectPosition = `${edit.crop.x ?? 50}% ${edit.crop.y ?? 50}%`;
      }
      if (edit.animation || edit.slideshow) applyAnimation(element, edit);
      if (edit.slideshow && element instanceof HTMLImageElement) drawPhotoList(edit);
      if (edit.credit && element instanceof HTMLImageElement) renderCredit(element, edit.credit);
    });
    refreshSelectedControls();
  };
  editor.setExtensionRenderer(refreshEditorExtensions);
  document.addEventListener("click", (event) => {
    if (toolbar.contains(event.target) || event.target.closest("[data-cms-control]")) return;
    window.requestAnimationFrame(refreshSelectedControls);
  }, true);
  document.addEventListener("dblclick", (event) => {
    if (toolbar.contains(event.target) || event.target.closest("[data-cms-control]")) return;
    window.requestAnimationFrame(refreshSelectedControls);
  }, true);
  byId("admin-add-section").addEventListener("click", () => window.setTimeout(populateTargets, 0));
  window.addEventListener("resize", populateTargets);

  editor.ready.then(() => {
    state.buttons ||= [];
    state.mediaElements ||= [];
    state.heroVideos ||= null;
    state.googleFont ||= "";
    loadGoogleFonts();
    refreshEditorExtensions();
  }).catch((error) => status(`Editor tools could not load: ${error.message}`, "error"));
})();
