(() => {
  "use strict";
  const style = document.createElement("style");
  style.textContent = "#cwInspiration{display:none!important}";
  document.head.appendChild(style);

  const remove = () => document.getElementById("cwInspiration")?.remove();
  remove();

  const observer = new MutationObserver(remove);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();