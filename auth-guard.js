(() => {
  "use strict";
  const auth = window.CWSession,
    qs = new URLSearchParams(location.search),
    guest = qs.get("guest") === "1";
  const person =
    qs.get("person") || localStorage.getItem("cw-person") || "";
  const login = () =>
    location.replace(guest ? "./?guest=1" : `./?person=${encodeURIComponent(person)}`);
  const reveal = () => {
    document.documentElement.classList.add("cw-auth-ready");
    if (guest) document.documentElement.classList.add("cw-guest-mode");
    window.__CW_AUTH_OK = true;
    window.dispatchEvent(new Event("cw-auth-ready"));
  };
  const setAdmin = () =>
    sessionStorage.setItem(
      "cw-admin",
      !guest && (person === "瑞子" || auth.get("瑞子")) ? "1" : "0",
    );
  async function checkGuest() {
    if (!auth) return login();
    if (auth.qa) {
      sessionStorage.setItem("cw-admin", "0");
      reveal();
      return;
    }
    let localSession = auth.get(auth.GUEST);
    if (!localSession) {
      try {
        localSession = await auth.issueGuest();
      } catch {
        login();
        return;
      }
    }
    try {
      const session = await auth.validate(auth.GUEST);
      if (!session) return login();
      auth.activateGuestShadow(session);
      setAdmin();
      reveal();
    } catch {
      login();
    }
  }
  async function check() {
    if (guest) return checkGuest();
    if (!auth || !auth.PEOPLE.includes(person)) {
      location.replace("./");
      return;
    }
    if (auth.qa) {
      sessionStorage.setItem("cw-admin", person === "瑞子" ? "1" : "0");
      reveal();
      return;
    }
    const localSession = auth.get(person);
    if (!localSession) {
      login();
      return;
    }
    try {
      const session = await auth.validate(person);
      if (!session) {
        login();
        return;
      }
      setAdmin();
      reveal();
    } catch {
      if (auth.get(person)) {
        window.__CW_OFFLINE_AUTH = true;
        setAdmin();
        reveal();
        return;
      }
      const showError = () => {
        document.documentElement.classList.add("cw-auth-ready");
        const boot = document.getElementById("boot");
        boot.innerHTML =
          '<div class="bootmark">川</div><b>暂时无法验证登录</b><span>登录记忆已保留，请连接网络后重试</span><button type="button" class="primary" id="authRetry">重新连接</button><a href="./?choose=1">返回身份选择</a>';
        document.getElementById("authRetry").onclick = () => {
          boot.querySelector("b").textContent = "正在重新连接…";
          check();
        };
      };
      if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", showError, { once: true });
      else showError();
    }
  }
  check();
})();