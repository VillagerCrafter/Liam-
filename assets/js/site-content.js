(() => {
  const contentScript = document.querySelector('script[data-content-url]');
  const contentUrl = contentScript?.dataset.contentUrl;
  const siteBaseUrl = contentScript?.dataset.siteBaseurl || "";
  const resolveSitePath = (path) => typeof path === "string" && path.startsWith("/")
    ? `${siteBaseUrl}${path}`
    : path;
  const textSelector = [
    "h1", "h2", "h3", "h4", "p", ".brand-name", ".brand-band-heading",
    ".hero-note", ".section-number", ".story-kicker", ".step-number",
    ".step-arrow", ".service-number", ".service-title", ".service-summary",
    ".service-image-action", ".project-meta > span", ".project-index",
    ".project-role", ".project-description", ".about-image-caption",
    ".featured-client", ".featured-project-title", ".footer-bottom > span",
    ".footer-bottom > a", ".primary-navigation > a", ".hero-actions > a",
    ".intro-actions > a", "a", "button:not(.service-open)",
  ].join(",");
  const getCandidates = (root = document) => [
    ...root.querySelectorAll(`${textSelector}, img, video, section, article, div, form, nav, footer, header, iframe, .service-open, button`),
  ].filter((element) => !element.closest(".admin-toolbar, .service-dialog, .admin-mark"));

  const assignContentIds = () => {
    getCandidates().forEach((element, index) => {
      if (!element.dataset.cmsId) {
        element.dataset.cmsId = `element-${index}-${element.tagName.toLowerCase()}`;
      }
    });
  };

  const getContentElement = (id) => {
    if (!/^[\w-]+$/.test(id)) return null;
    return document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
  };
  assignContentIds();
  const baseline = new Map(getCandidates().map((element) => [element.dataset.cmsId, {
    html: element.matches(textSelector) ? element.innerHTML : null,
    src: element.getAttribute("src"),
    alt: element.getAttribute("alt"),
    href: element.getAttribute("href"),
    style: element.getAttribute("style"),
    hidden: element.hasAttribute("hidden"),
    serviceImage: element.dataset.serviceImage,
    serviceDescription: element.dataset.serviceDescription,
    serviceExample: element.dataset.serviceExample,
  }]));
  const originalSections = [...document.querySelectorAll("main > section")];
  const heroVideo = document.querySelector(".hero-video");
  const originalHeroVideo = heroVideo?.querySelector("source")?.src || "";
  let heroVideoTimer;
  const slideshowTimers = new Map();
  let appliedContent = null;
  let imageResizeTimer;

  const applyAnimation = (element, animation) => {
    const animations = {
      fade: "cmsFadeIn 1.2s ease both",
      float: "cmsFloat 3s ease-in-out infinite",
      spin: "cmsSpin 6s linear infinite",
      pulse: "cmsPulse 2s ease-in-out infinite",
    };
    element.style.animation = animations[animation] || "";
  };

  const applyGoogleFont = (family) => {
    const link = document.querySelector("#published-google-font");
    if (!family || typeof family !== "string" || family.length > 100 || /["<>;]/.test(family)) {
      link?.remove();
      return;
    }
    const stylesheet = link || document.createElement("link");
    stylesheet.id = "published-google-font";
    stylesheet.rel = "stylesheet";
    stylesheet.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}&display=swap`;
    document.head.append(stylesheet);
    document.documentElement.style.setProperty("--site-font", `"${family}", sans-serif`);
  };

  const renderCredit = (image, credit, creditContainer = image.parentElement?.parentElement) => {
    if (!credit || !image.parentElement) return;
    const parent = creditContainer;
    if (!parent) return;
    parent.querySelector(":scope > .cms-stock-credit")?.remove();
    const sourceUrl = /^https:\/\//i.test(credit.source_url || "") ? credit.source_url : "";
    const licenseUrl = /^https:\/\//i.test(credit.license_url || "") ? credit.license_url : "";
    if (!sourceUrl || !licenseUrl) return;
    const caption = document.createElement("small");
    caption.className = "cms-stock-credit";
    const source = document.createElement("a");
    source.href = sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = [credit.title, credit.creator && `by ${credit.creator}`].filter(Boolean).join(" ");
    const license = document.createElement("a");
    license.href = licenseUrl;
    license.target = "_blank";
    license.rel = "noopener noreferrer";
    license.textContent = `${credit.license || "Creative Commons"} ${credit.license_version || ""}`.trim();
    caption.append(source, document.createTextNode(" · "), license);
    parent.append(caption);
  };

  const applyHeroVideos = (settings) => {
    if (!heroVideo) return;
    window.clearInterval(heroVideoTimer);
    const items = Array.isArray(settings?.items)
      ? settings.items.filter((item) => typeof item === "string" && /^\/uploads\/[\w.-]+$/.test(item)).slice(0, 12)
      : [];
    if (!items.length) {
      const current = heroVideo.getAttribute("src");
      if (current) {
        heroVideo.removeAttribute("src");
        const source = heroVideo.querySelector("source");
        if (source && originalHeroVideo) source.src = originalHeroVideo;
        heroVideo.load();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          heroVideo.play().catch((error) => {
            if (error.name !== "AbortError") console.error("Could not resume the original hero video.", error);
          });
        }
      }
      return;
    }
    let index = 0;
    const playCurrent = () => {
      heroVideo.src = resolveSitePath(items[index % items.length]);
      heroVideo.load();
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        heroVideo.play().catch((error) => {
          if (error.name !== "AbortError") console.error("The rotating hero video could not start.", error);
        });
      }
      index += 1;
    };
    playCurrent();
    if (items.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const interval = Math.max(3, Math.min(300, Number(settings.interval) || 8));
      heroVideoTimer = window.setInterval(playCurrent, interval * 1000);
    }
  };

  const applyStyle = (element, styles = {}) => {
    const allowed = {
      width: (value) => `${Math.max(40, Math.min(2400, Number(value)))}px`,
      height: (value) => `${Math.max(30, Math.min(1800, Number(value)))}px`,
      fontSize: (value) => `${Math.max(8, Math.min(300, Number(value)))}px`,
      left: (value) => `${Math.max(-1200, Math.min(1200, Number(value)))}px`,
      top: (value) => `${Math.max(-1200, Math.min(1200, Number(value)))}px`,
      zIndex: (value) => String(Math.max(-9999, Math.min(9999, Number(value)))),
      color: (value) => /^#[0-9a-f]{3,8}$/i.test(value) ? value : null,
      backgroundColor: (value) => /^#[0-9a-f]{3,8}$/i.test(value) ? value : null,
      fontWeight: (value) => ["400", "600", "700", "800"].includes(String(value)) ? value : null,
      fontStyle: (value) => value === "italic" ? value : null,
      textDecoration: (value) => value === "underline" ? value : null,
      textAlign: (value) => ["left", "center", "right", "justify"].includes(value) ? value : null,
      textShadow: (value) => value === "1" ? "0 2px 12px rgba(0,0,0,.38)" : null,
      filter: (value) => ["grayscale(1)", "sepia(1)", "brightness(1.15)", "contrast(1.15)", "none"].includes(value) ? value : null,
      maxWidth: (value) => value === "none" ? value : null,
      fontFamily: (value) => ["inherit", "Georgia, serif", "Arial, sans-serif", "custom"].includes(value) ? value : null,
    };

    Object.entries(styles).forEach(([name, value]) => {
      if (!Object.hasOwn(allowed, name)) return;
      const cssValue = allowed[name](value);
      if (cssValue) {
        element.style[name] = name === "fontFamily" && value === "custom" ? "LiamImportedFont, sans-serif" : cssValue;
        if (name === "zIndex" && getComputedStyle(element).position === "static") element.style.position = "relative";
      }
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

  const renderContentBlock = (block) => {
    const section = document.getElementById(block.sectionId);
    if (!section || !/^content-block-[\w-]+$/.test(block.id || "") ||
        document.getElementById(block.id)) return;
    const isImage = block.type === "image";
    const element = isImage ? document.createElement("figure") :
      document.createElement(block.type === "heading" ? "h3" : "p");
    element.className = `cms-added-content-block cms-added-${block.type} cms-published-addition`;
    element.id = block.id;
    element.dataset.cmsId = block.id;
    if (isImage && /^\/uploads\/[\w.-]+$/.test(block.image || "")) {
      const image = document.createElement("img");
      image.dataset.cmsId = `${block.id}-image`;
      image.src = resolveSitePath(block.image);
      image.alt = typeof block.alt === "string" ? block.alt : "";
      image.loading = "lazy";
      element.append(image);
    } else if (!isImage) {
      element.textContent = typeof block.text === "string" ? block.text : "";
    } else {
      return;
    }
    section.append(element);
  };

  const renderElementCopies = (copies) => {
    if (!Array.isArray(copies)) return;
    copies.forEach((copy) => {
      if (!copy || !/^element-copy-[\w-]+$/.test(copy.id || "") ||
          !["p", "h2", "h3", "h4", "span", "a", "button", "img"].includes(copy.tag) ||
          document.getElementById(copy.id)) return;
      const parent = getContentElement(copy.parentId);
      if (!parent) return;
      const element = document.createElement(copy.tag);
      element.id = copy.id;
      element.dataset.cmsId = copy.id;
      element.classList.add("cms-published-addition");
      if (copy.tag === "img") {
        if (!/^(?:\/uploads\/[\w.-]+|\/assets\/[\w./-]+)$/.test(copy.src || "") || copy.src.includes("..")) return;
        element.src = resolveSitePath(copy.src);
        element.alt = typeof copy.alt === "string" ? copy.alt : "";
        element.loading = "lazy";
      } else {
        element.textContent = typeof copy.text === "string" ? copy.text : "";
        if (copy.tag === "a" && /^(https?:|mailto:|\/(?!\/)|#)/i.test(copy.href || "")) {
          element.setAttribute("href", copy.href);
        }
      }
      const after = getContentElement(copy.afterId);
      if (after) after.after(element);
      else parent.append(element);
    });
  };

  const renderSectionCopies = (copies) => {
    const root = document.querySelector("main");
    if (!root || !Array.isArray(copies)) return;
    copies.forEach((copy) => {
      if (!copy || !/^section-copy-[\w-]+$/.test(copy.id || "") ||
          !/^[\w-]+$/.test(copy.sourceId || "") || document.getElementById(copy.id)) return;
      const source = [...root.querySelectorAll(":scope > section")]
        .find((section) => section.dataset.cmsId === copy.sourceId);
      if (!source || source.querySelector("form,iframe,video")) return;
      const clone = source.cloneNode(true);
      clone.classList.add("cms-published-addition", "cms-section-copy");
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
      sourceNodes.forEach((_sourceNode, index) => {
        const cloneNode = cloneNodes[index];
        if (cloneNode) cloneNode.dataset.cmsId = index === 0 ? copy.id : `${copy.id}-element-${index}`;
      });
      root.append(clone);
    });
  };

  const renderProject = (project) => {
    const grid = document.querySelector(".portfolio-grid");
    if (!grid || !project?.id || !project.title || !project.image) return;
    const existing = document.getElementById(`project-${project.id}`);
    if (existing) {
      existing.classList.add("cms-published-addition");
      return;
    }
    const card = document.createElement("article");
    card.className = "project-card";
    card.classList.add("cms-published-addition");
    card.id = `project-${project.id}`;
    card.dataset.category = project.category || "activation";
    card.dataset.projectUrl = `${siteBaseUrl}/projects/?project=${encodeURIComponent(project.id)}`;
    card.setAttribute("role", "link");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `View case study: ${project.title}`);
    card.innerHTML = '<div class="project-image-wrap"><img loading="lazy" width="1200" height="800"><span class="project-index"></span></div><div class="project-meta"><span></span><span></span></div><h3></h3><p class="project-description"></p><p class="project-role"><span>MY ROLE</span></p>';
    card.querySelector("img").src = resolveSitePath(project.image);
    card.querySelector("img").alt = project.alt || project.title;
    card.querySelector(".project-index").textContent = String(grid.children.length + 1).padStart(2, "0");
    card.querySelector(".project-meta span:first-child").textContent = project.client || "Independent";
    card.querySelector(".project-meta span:last-child").textContent = project.location || "";
    card.querySelector("h3").textContent = project.title;
    card.querySelector(".project-description").textContent = project.description || "";
    card.querySelector(".project-role").append(document.createTextNode(project.role || ""));
    card.dataset.cmsId = `project-${project.id}`;
    grid.append(card);
  };

  const renderSection = (section) => {
    const main = document.querySelector("main");
    if (!main || !section?.id) return;
    const existing = document.getElementById(section.id);
    if (existing) {
      existing.classList.add("cms-published-addition");
      return;
    }
    const element = document.createElement("section");
    element.className = "added-page-section section-pad cms-published-addition";
    element.id = section.id;
    element.dataset.cmsId = section.id;
    const width = document.createElement("div");
    width.className = "page-width";
    const title = document.createElement("h2");
    title.textContent = section.title || "New page";
    title.dataset.cmsId = `${section.id}-title`;
    const paragraph = document.createElement("p");
    paragraph.textContent = section.text || "Add your content here.";
    paragraph.dataset.cmsId = `${section.id}-text`;
    width.append(title, paragraph);
    element.append(width);
    main.append(element);
  };

  const applyContent = (content) => {
    if (!content || typeof content !== "object") return;
    appliedContent = content;

    baseline.forEach((original, id) => {
      const element = getContentElement(id);
      if (!element) return;
      if (original.html !== null) element.innerHTML = original.html;
      const previousSrc = element.getAttribute("src");
      for (const [attribute, value] of [["src", original.src], ["alt", original.alt], ["href", original.href], ["style", original.style]]) {
        if (element instanceof HTMLVideoElement && attribute === "src" && content.heroVideos?.items?.length) continue;
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      }
      if (original.hidden) element.setAttribute("hidden", "");
      else element.removeAttribute("hidden");
      if (original.serviceImage === undefined) delete element.dataset.serviceImage;
      else element.dataset.serviceImage = original.serviceImage;
      if (original.serviceDescription === undefined) delete element.dataset.serviceDescription;
      else element.dataset.serviceDescription = original.serviceDescription;
      if (original.serviceExample === undefined) delete element.dataset.serviceExample;
      else element.dataset.serviceExample = original.serviceExample;
      if (element instanceof HTMLVideoElement && !content.heroVideos?.items?.length && previousSrc !== original.src) {
        element.load();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          element.play().catch((error) => console.error("The background video could not start.", error));
        }
      }
    });

    const additionIds = new Set([
      ...(content.sections || []).map((section) => section.id),
      ...(content.sectionCopies || []).map((section) => section.id),
      ...(content.projects || []).map((project) => `project-${project.id}`),
      ...(content.contentBlocks || []).map((block) => block.id),
      ...(content.elementCopies || []).map((copy) => copy.id),
      ...(content.buttons || []).map((item) => item.id),
      ...(content.mediaElements || []).map((item) => item.id),
    ]);
    document.querySelectorAll(".cms-published-addition").forEach((element) => {
      if (!additionIds.has(element.dataset.cmsId)) element.remove();
    });
    document.querySelectorAll(".cms-stock-credit").forEach((caption) => caption.remove());
    originalSections.forEach((section) => document.querySelector("main")?.append(section));
    (content.sections || []).forEach(renderSection);
    (content.projects || []).forEach(renderProject);
    (content.contentBlocks || []).forEach(renderContentBlock);
    (content.mediaElements || []).forEach((item) => {
      if (!item || !/^stock-image-[\w-]+$/.test(item.id || "") ||
          !/^\/uploads\/[\w.-]+$/.test(item.image || "")) return;
      const section = document.getElementById(item.sectionId);
      if (!section || document.getElementById(item.id)) return;
      const figure = document.createElement("figure");
      figure.className = "cms-stock-image cms-published-addition";
      figure.id = item.id;
      figure.dataset.cmsId = item.id;
      const image = document.createElement("img");
      image.dataset.cmsId = `${item.id}-image`;
      image.src = resolveSitePath(item.image);
      image.alt = typeof item.alt === "string" ? item.alt : "";
      image.loading = "lazy";
      figure.append(image);
      if (item.credit) renderCredit(image, item.credit, figure);
      section.append(figure);
    });
    assignContentIds();
    renderSectionCopies(content.sectionCopies);
    assignContentIds();
    renderElementCopies(content.elementCopies);
    assignContentIds();

    Object.entries(content.edits || {}).forEach(([id, edit]) => {
      const element = getContentElement(id);
      if (!element) return;
      if (edit.deleted) {
        element.hidden = true;
        return;
      }
      if (typeof edit.text === "string" && element.matches(textSelector)) {
        element.textContent = edit.text;
        element.style.whiteSpace = "pre-line";
      }
      if (element.matches(".service-open")) {
        if (typeof edit.serviceDescription === "string") element.dataset.serviceDescription = edit.serviceDescription;
        if (typeof edit.serviceExample === "string") element.dataset.serviceExample = edit.serviceExample;
      }
      if (typeof edit.alt === "string" && element instanceof HTMLImageElement) element.alt = edit.alt;
      if (edit.crop && element instanceof HTMLImageElement) {
        element.style.objectFit = ["cover", "contain", "fill"].includes(edit.crop.fit) ? edit.crop.fit : "cover";
        const x = Math.max(0, Math.min(100, Number(edit.crop.x) || 0));
        const y = Math.max(0, Math.min(100, Number(edit.crop.y) || 0));
        element.style.objectPosition = `${x}% ${y}%`;
      }
      const legacyResize = edit.styles?.width && edit.styles?.height
        ? { width: edit.styles.width, height: edit.styles.height, offsetX: edit.styles.left, offsetY: edit.styles.top }
        : null;
      if ((element instanceof HTMLImageElement || element instanceof HTMLVideoElement) && (edit.resize || legacyResize)) {
        applyImageResize(element, edit.resize || legacyResize);
      }
      if (typeof edit.href === "string" && element instanceof HTMLAnchorElement && /^(https?:|mailto:|\/|#)/i.test(edit.href)) {
        element.setAttribute("href", edit.href);
      }
      if (typeof edit.src === "string" && element instanceof HTMLIFrameElement && /^(https:\/\/|\/(?!\/))/i.test(edit.src)) {
        element.src = resolveSitePath(edit.src);
      }
      if (typeof edit.media === "string" && /^\/uploads\/[\w.-]+$/.test(edit.media)) {
        if (element instanceof HTMLImageElement) {
          element.src = resolveSitePath(edit.media);
          const serviceButton = element.closest(".service-open");
          if (serviceButton) serviceButton.dataset.serviceImage = edit.media;
        }
        if (element instanceof HTMLVideoElement) {
          element.src = resolveSitePath(edit.media);
          element.load();
          element.play().catch((error) => console.error("The edited background video could not start.", error));
        }
      }
      const styles = { ...(edit.styles || {}) };
      if ((element instanceof HTMLImageElement || element instanceof HTMLVideoElement) && (edit.resize || legacyResize)) {
        delete styles.width;
        delete styles.height;
        delete styles.maxWidth;
        delete styles.left;
        delete styles.top;
      }
      applyStyle(element, styles);
      applyAnimation(element, edit.animation);
      const previousSlideshow = slideshowTimers.get(element);
      if (previousSlideshow) window.clearInterval(previousSlideshow);
      if (edit.slideshow?.items?.length && element instanceof HTMLImageElement) {
        const items = edit.slideshow.items.filter((item) => typeof item === "string" && /^\/uploads\/[\w.-]+$/.test(item)).slice(0, 30);
        if (items.length) {
          let index = 0;
          element.src = resolveSitePath(items[0]);
          const interval = Math.max(2, Math.min(300, Number(edit.slideshow.interval) || 5));
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) slideshowTimers.set(element, window.setInterval(() => {
            index = (index + 1) % items.length;
            element.src = resolveSitePath(items[index]);
          }, interval * 1000));
        }
      }
      if (edit.credit && element instanceof HTMLImageElement) renderCredit(element, edit.credit);
    });

    const themes = {
      original: { "--site-font": '"Avenir Next", Avenir, "Segoe UI", sans-serif' },
      coastal: { "--forest": "#1c3038", "--forest-deep": "#122128", "--lime": "#82d4ce", "--lime-dark": "#55a8a2", "--paper": "#f0f3ef" },
      sunset: { "--forest": "#3b2825", "--forest-deep": "#241a19", "--lime": "#f4b77a", "--lime-dark": "#d68d59", "--paper": "#f7eee7" },
      violet: { "--forest": "#302641", "--forest-deep": "#1d1728", "--lime": "#c7a6ed", "--lime-dark": "#9f7bc9", "--paper": "#f3eef8" },
    };
    ["--forest", "--forest-deep", "--lime", "--lime-dark", "--paper", "--site-font"].forEach((property) => {
      document.documentElement.style.removeProperty(property);
    });
    Object.entries(themes[content.theme] || themes.original || {}).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    document.documentElement.style.setProperty(
      "--site-font",
      content.fontFile ? "LiamImportedFont, sans-serif" :
        (content.fontFamily && content.fontFamily !== "inherit" && content.fontFamily !== "custom" ? content.fontFamily : '"Avenir Next", Avenir, "Segoe UI", sans-serif'),
    );
    applyGoogleFont(content.googleFont);
    if (content.fontFile?.url && /^\/uploads\/[\w.-]+$/.test(content.fontFile.url)) {
      const fontStyle = document.querySelector("#imported-site-font") || document.createElement("style");
      fontStyle.id = "imported-site-font";
      const format = ["woff2", "woff", "truetype", "opentype"].includes(content.fontFile.format) ? content.fontFile.format : "woff2";
      fontStyle.textContent = `@font-face{font-family:LiamImportedFont;src:url("${resolveSitePath(content.fontFile.url)}") format("${format}");font-display:swap}`;
      document.head.append(fontStyle);
    } else {
      document.querySelector("#imported-site-font")?.remove();
    }

    (content.sectionOrder || []).forEach((id) => {
      const section = getContentElement(id);
      if (section?.tagName === "SECTION") document.querySelector("main")?.append(section);
    });
    (content.shapes || []).forEach((shape) => {
      if (!shape || !/^shape-[\w-]+$/.test(shape.id || "")) return;
      const section = document.getElementById(shape.sectionId) || document.querySelector("main");
      if (!section || document.getElementById(shape.id)) return;
      if (!["rectangle", "circle", "line", "note"].includes(shape.kind)) return;
      const kinds = { rectangle: "div", circle: "div", line: "div", note: "p" };
      const element = document.createElement(kinds[shape.kind] || "div");
      element.className = `cms-added-content-block cms-shape cms-shape-${shape.kind} cms-published-addition`;
      element.id = shape.id;
      element.dataset.cmsId = shape.id;
      if (shape.text) element.textContent = shape.text;
      section.append(element);
    });
    assignContentIds();
    (content.buttons || []).forEach((item) => {
      if (!item || !/^custom-cta-[\w-]+$/.test(item.id || "") ||
          !/^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+|\/(?!\/)[^\s]*|#[\w-]+)$/i.test(item.href || "") ||
          typeof item.label !== "string" || !item.label.trim()) return;
      const section = document.getElementById(item.sectionId) || document.querySelector("main");
      if (!section || document.getElementById(item.id)) return;
      let group = section.querySelector(".custom-cta-group");
      if (!group) {
        group = document.createElement("div");
        group.className = "custom-cta-group";
        section.append(group);
      }
      const link = document.createElement("a");
      link.className = "button button-lime custom-cta cms-published-addition";
      link.id = item.id;
      link.dataset.cmsId = item.id;
      link.href = item.href;
      link.textContent = item.label;
      group.append(link);
    });
    applyHeroVideos(content.heroVideos);
    document.querySelectorAll(".filter-button").forEach((button) => {
      if (button.dataset.cmsFilterBound) return;
      button.dataset.cmsFilterBound = "true";
      button.addEventListener("click", () => {
        const filter = document.querySelector(".filter-button.is-active")?.dataset.filter || "all";
        const customCards = [...document.querySelectorAll(".project-card[id^='project-custom-']")];
        customCards.forEach((card) => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
        const visibleCards = [...document.querySelectorAll(".project-card")].filter((card) => !card.hidden);
        const emptyMessage = document.querySelector(".portfolio-empty");
        if (emptyMessage) emptyMessage.hidden = visibleCards.length > 0;
      });
    });
  };

  window.addEventListener("resize", () => {
    window.clearTimeout(imageResizeTimer);
    imageResizeTimer = window.setTimeout(() => {
      Object.entries(appliedContent?.edits || {}).forEach(([id, edit]) => {
        const image = getContentElement(id);
        const legacyResize = edit.styles?.width && edit.styles?.height
          ? { width: edit.styles.width, height: edit.styles.height, offsetX: edit.styles.left, offsetY: edit.styles.top }
          : null;
        if (image instanceof HTMLImageElement && (edit.resize || legacyResize)) {
          applyImageResize(image, edit.resize || legacyResize);
        }
        const video = getContentElement(id);
        if (video instanceof HTMLVideoElement && (edit.resize || legacyResize)) {
          applyImageResize(video, edit.resize || legacyResize);
        }
      });
    }, 100);
  });

  const updatePublishedContent = async () => {
    if (!contentUrl) return;
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Could not load published site edits (${response.status}).`);
    applyContent(await response.json());
  };

  assignContentIds();
  updatePublishedContent().catch((error) => console.error(error));

  if ("BroadcastChannel" in window) {
    const updates = new BroadcastChannel("liam-site-updates");
    updates.addEventListener("message", (event) => {
      if (event.data === "published") updatePublishedContent().catch((error) => console.error(error));
    });
  }
})();
