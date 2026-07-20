(() => {
  const topbar = document.querySelector(".topbar");
  const toggle = document.querySelector(".mobile-menu-toggle");
  const nav = topbar?.querySelector(".nav");
  if (!topbar || !toggle || !nav) return;

  const media = window.matchMedia("(max-width: 900px)");
  let returnFocus = null;

  [...nav.children].forEach((item, index) => {
    item.style.setProperty("--menu-order", index);
  });

  function setOpen(open, { restoreFocus = true } = {}) {
    const shouldOpen = open && media.matches;
    topbar.classList.toggle("is-menu-open", shouldOpen);
    document.body.classList.toggle("mobile-menu-active", shouldOpen);
    toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    toggle.setAttribute("aria-label", shouldOpen ? "メニューを閉じる" : "メニューを開く");
    nav.setAttribute("aria-hidden", shouldOpen || !media.matches ? "false" : "true");

    if (shouldOpen) {
      returnFocus = document.activeElement;
    } else {
      nav.querySelectorAll(".nav-item.is-open").forEach((item) => item.classList.remove("is-open"));
      if (restoreFocus && returnFocus instanceof HTMLElement) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  }

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    setOpen(!topbar.classList.contains("is-menu-open"));
  }, true);

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link || !media.matches) return;
    const item = link.closest(".nav-item");
    const submenu = item?.querySelector(".nav-menu");

    if (link.classList.contains("nav-trigger") && submenu) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const willOpen = !item.classList.contains("is-open");
      nav.querySelectorAll(".nav-item.is-open").forEach((openItem) => {
        if (openItem !== item) openItem.classList.remove("is-open");
      });
      item.classList.toggle("is-open", willOpen);
      return;
    }

    setOpen(false, { restoreFocus: false });
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!topbar.classList.contains("is-menu-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [toggle, ...nav.querySelectorAll("a[href]:not([tabindex='-1'])")]
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function syncViewport() {
    if (!media.matches) setOpen(false, { restoreFocus: false });
    else nav.setAttribute("aria-hidden", topbar.classList.contains("is-menu-open") ? "false" : "true");
  }

  media.addEventListener?.("change", syncViewport);
  syncViewport();
})();
