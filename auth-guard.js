(() => {
  "use strict";
  const auth = window.CWSession;
  const person =
    new URLSearchParams(location.search).get("person") ||
    localStorage.getItem("cw-person") ||
    "";
  const login = () =>
    location.replace(`./?person=${encodeURIComponent(person)}`);
  const reveal = () => {
    document.documentElement.classList.add("cw-auth-ready");
    window.__CW_AUTH_OK = true;
    window.dispatchEvent(new Event("cw-auth-ready"));
  };
  const setAdmin = () =>
    sessionStorage.setItem(
      "cw-admin",
      person === "瑞子" || auth.get("瑞子") ? "1" : "0",
    );
  async function check() {
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
      // 无网络时，只要本机仍有未过期的登录记忆，就允许进入离线模式。
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
        document.addEventListener("DOMContentLoaded", showError, {
          once: true,
        });
      else showError();
    }
  }
  check();
})();