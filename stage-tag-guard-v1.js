(() => {
  "use strict";
  let queued = false;
  function expected() {
    const s = window.CWTripStageV2?.stage?.();
    if (!s) return null;
    if (s.mode === "pre") return `出发前 · ${s.days}天`;
    if (s.mode === "trip") return `旅途中 · Day ${s.index + 1}`;
    return "旅程完成";
  }
  function apply() {
    queued = false;
    const tag = document.querySelector("#todayTag"),
      value = expected();
    if (tag && value && tag.textContent !== value) tag.textContent = value;
  }
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }
  const wait = () => {
    const tag = document.querySelector("#todayTag");
    if (!tag || !window.CWTripStageV2) return setTimeout(wait, 80);
    new MutationObserver(schedule).observe(tag, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    window.addEventListener("cw:state", schedule);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) schedule();
    });
    schedule();
  };
  wait();
})();
