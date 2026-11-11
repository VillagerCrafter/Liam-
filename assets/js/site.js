(() => {
  const heroVideo = document.querySelector(".hero-video");
  if (heroVideo && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    heroVideo.play().catch((error) => {
      console.error("The background video could not start.", error);
    });
  }

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-navigation");

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      navigation.classList.toggle("is-open", !isExpanded);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuToggle.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
      });
    });
  }

  const serviceDialog = document.querySelector("#service-dialog");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogDescription = document.querySelector("#dialog-description");
  const dialogExample = document.querySelector("#dialog-example");
  const dialogImage = document.querySelector("#dialog-image");

  if (serviceDialog) {
    document.querySelectorAll(".service-open").forEach((button) => {
      button.addEventListener("click", () => {
        dialogTitle.textContent = button.dataset.serviceTitle;
        dialogDescription.textContent = button.dataset.serviceDescription;
        dialogExample.textContent = button.dataset.serviceExample;
        dialogImage.src = button.dataset.serviceImage;
        dialogImage.alt = button.dataset.serviceAlt;
        serviceDialog.showModal();
      });
    });

    serviceDialog.querySelector(".dialog-close").addEventListener("click", () => serviceDialog.close());
    serviceDialog.addEventListener("click", (event) => {
      if (event.target === serviceDialog) serviceDialog.close();
    });
    serviceDialog.querySelector("[data-dialog-book]").addEventListener("click", () => serviceDialog.close());
  }

  const filterButtons = document.querySelectorAll(".filter-button");
  const emptyMessage = document.querySelector(".portfolio-empty");
  const portfolioGrid = document.querySelector(".portfolio-grid");

  const openProjectPage = (card) => {
    if (card?.dataset.projectUrl) window.location.assign(card.dataset.projectUrl);
  };

  portfolioGrid?.addEventListener("click", (event) => {
    if (event.target.closest("a,button")) return;
    openProjectPage(event.target.closest(".project-card[role='link']"));
  });
  portfolioGrid?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const card = event.target.closest(".project-card[role='link']");
    if (!card) return;
    event.preventDefault();
    openProjectPage(card);
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      let visibleCount = 0;

      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });

      document.querySelectorAll(".project-card").forEach((card) => {
        const isVisible = filter === "all" || card.dataset.category === filter;
        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
    });
  });

  const slides = Array.from(document.querySelectorAll(".featured-slide"));
  const dots = Array.from(document.querySelectorAll(".carousel-dot"));
  let activeSlide = 0;
  let carouselTimer;

  const showSlide = (index) => {
    if (!slides.length) return;
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeSlide;
      slide.hidden = !isActive;
      slide.classList.toggle("is-active", isActive);
    });
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeSlide;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });
  };

  const stopCarousel = () => window.clearInterval(carouselTimer);
  const startCarousel = () => {
    stopCarousel();
    if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !document.hidden) {
      carouselTimer = window.setInterval(() => showSlide(activeSlide + 1), 5000);
    }
  };

  document.querySelector("[data-carousel-prev]")?.addEventListener("click", () => {
    showSlide(activeSlide - 1);
    startCarousel();
  });
  document.querySelector("[data-carousel-next]")?.addEventListener("click", () => {
    showSlide(activeSlide + 1);
    startCarousel();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.goTo));
      startCarousel();
    });
  });

  const carousel = document.querySelector(".featured-carousel");
  if (carousel) {
    slides.forEach((slide) => {
      slide.addEventListener("click", () => {
        const target = document.querySelector(slide.hash);
        if (target?.hidden) document.querySelector('.filter-button[data-filter="all"]')?.click();
      });
    });
    carousel.addEventListener("mouseenter", stopCarousel);
    carousel.addEventListener("mouseleave", startCarousel);
    carousel.addEventListener("focusin", stopCarousel);
    carousel.addEventListener("focusout", startCarousel);
  }
  document.addEventListener("visibilitychange", startCarousel);
  startCarousel();

  const inquiryForm = document.querySelector("#inquiry-form");
  if (inquiryForm) {
    inquiryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!inquiryForm.reportValidity()) return;

      const formData = new FormData(inquiryForm);
      const subject = `Website inquiry from ${formData.get("name")}`;
      const body = [
        `Name: ${formData.get("name")}`,
        `Company: ${formData.get("company") || "Not provided"}`,
        `Email: ${formData.get("email")}`,
        "",
        "Project details:",
        formData.get("project"),
      ].join("\n");
      const emailLink = `mailto:${inquiryForm.dataset.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      document.querySelector("#form-status").textContent = "Your email app should open with the inquiry ready to send. If it does not, email liam.bennicoff@gmail.com directly.";
      window.location.href = emailLink;
    });
  }
})();
