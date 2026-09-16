(() => {
  "use strict";
  // itinerary-admin-v1 currently reads the active chip while repainting.
  // Mark the tapped chip active before its capture listener runs so it reads
  // the intended day instead of the previous .on chip.
  document.addEventListener(
    "click",
    (event) => {
      const chip = event.target.closest?.("#simpleItinerary [data-day]");
      if (!chip) return;
      const box = chip.closest("#simpleItinerary");
      if (!box) return;
      box.querySelectorAll(".day-chip.on").forEach((node) => {
        if (node !== chip) node.classList.remove("on");
      });
      chip.classList.add("on");
    },
    true,
  );
})();