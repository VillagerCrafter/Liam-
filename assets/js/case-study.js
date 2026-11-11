(() => {
  const config = document.querySelector("#case-study-config");
  const status = document.querySelector("#case-study-status");
  const title = document.querySelector("#case-study-title");
  const requestedId = new URLSearchParams(window.location.search).get("project") || "";
  const isDraftPreview = new URLSearchParams(window.location.search).get("preview") === "draft";
  const previewKey = "liam-portfolio-case-study-preview-v1";

  const showError = (message) => {
    title.textContent = "This project could not be displayed.";
    status.textContent = message;
  };

  const imagePath = (path, baseUrl) => {
    if (typeof path !== "string" || !/^\/(?:assets|uploads)\/[\w./-]+$/.test(path) ||
        path.split("/").includes("..")) {
      throw new Error("The project image path is invalid.");
    }
    return `${baseUrl}${path}`;
  };

  const renderProject = (project, baseUrl) => {
    if (!project || typeof project !== "object" || !/^[\w-]{1,120}$/.test(project.id || "")) {
      showError("Choose a project from the portfolio to view its case study.");
      return;
    }
    const projectTitle = typeof project.title === "string" ? project.title : "";
    const description = typeof project.description === "string" ? project.description : "";
    document.title = `${projectTitle || "Project case study"} | Liam Bennicoff`;
    document.querySelector('meta[name="description"]').content = description.slice(0, 300);
    title.textContent = projectTitle;
    document.querySelector("#case-study-client").textContent = project.client || "PROJECT CASE STUDY";
    document.querySelector("#case-study-description").textContent = description;
    document.querySelector("#case-study-location").textContent = project.location || "";
    document.querySelector("#case-study-category").textContent = (project.category || "activation").replace(/^\w/, (letter) => letter.toUpperCase());
    document.querySelector("#case-study-role").textContent = project.role || "";
    const image = document.querySelector("#case-study-image");
    image.src = imagePath(project.image, baseUrl);
    image.alt = typeof project.alt === "string" ? project.alt : projectTitle;
    document.querySelector("#case-study-preview-notice").hidden = !isDraftPreview;
    status.textContent = "";
  };

  const loadProject = async () => {
    try {
      if (!config || !status || !title) throw new Error("The case-study page is missing required content.");
      if (!/^[\w-]{1,120}$/.test(requestedId)) {
        showError("Choose a project from the portfolio to view its case study.");
        return;
      }
      const baseProjects = JSON.parse(config.textContent);
      if (!Array.isArray(baseProjects)) throw new Error("The portfolio project list is invalid.");
      let content;
      if (isDraftPreview) {
        const draft = localStorage.getItem(previewKey);
        localStorage.removeItem(previewKey);
        if (!draft) throw new Error("No local draft preview is available. Open this page from the editor.");
        content = JSON.parse(draft);
      } else {
        const response = await fetch(config.dataset.contentUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load portfolio details (${response.status}).`);
        content = await response.json();
      }
      if (!content || content.version !== 1) throw new Error("The portfolio content has an unsupported version.");
      const customProject = (content.projects || []).find((project) => project.id === requestedId);
      const project = customProject || baseProjects.find((item) => item.id === requestedId);
      if (!project) {
        showError("That case study is no longer available. Return to the portfolio to browse current work.");
        return;
      }
      renderProject(project, config.dataset.siteBaseurl || "");
    } catch (error) {
      showError(error.message);
    }
  };

  loadProject();
})();
