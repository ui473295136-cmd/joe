(() => {
  "use strict";
  if (typeof globalThis.structuredClone === "function") return;
  globalThis.structuredClone = (value) => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  };
})();