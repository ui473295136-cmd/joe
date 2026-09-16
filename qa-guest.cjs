const puppeteer = require("puppeteer-core");

(async () => {
  const chrome = process.env.CHROME;
  const base = process.env.QA_BASE || "http://127.0.0.1:8000";
  if (!chrome) throw new Error("CHROME is required");
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/app-v4.html?person=%E7%91%9E%E5%AD%90&guest=1&qa=1`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForFunction(
      () =>
        window.CWGuest?.active === true &&
        !!document.querySelector("#cwGuestBanner") &&
        !document.querySelector("#app")?.hidden,
      { timeout: 10000 },
    );
    const result = await page.evaluate(() => {
      const display = (sel) => {
        const e = document.querySelector(sel);
        return e ? getComputedStyle(e).display : "missing";
      };
      document.querySelector('#bottomNav button[data-view="me"]')?.click();
      const probe = document.createElement("button");
      probe.dataset.ledger = "add-repay";
      probe.textContent = "写操作";
      document.body.appendChild(probe);
      probe.click();
      return {
        guest: window.CWGuest?.active === true,
        banner: document.querySelector("#cwGuestBanner")?.textContent || "",
        expenseForm: display("#expenseForm"),
        bookingForm: display("#bookingForm"),
        profileCard: display(".profile-card"),
        ledgerActions: [...document.querySelectorAll(".ledger-actions")].every(
          (x) => getComputedStyle(x).display === "none",
        ),
        allLedger: document
          .querySelector('[data-ledgerview="all"]')
          ?.classList.contains("on"),
        navText:
          document.querySelector('#bottomNav button[data-view="me"]')?.textContent || "",
        toast: document.querySelector("#toast")?.textContent || "",
      };
    });
    if (!result.guest) throw new Error("guest flag missing");
    if (!result.banner.includes("只读浏览")) throw new Error("guest banner missing");
    if (result.expenseForm !== "none" || result.bookingForm !== "none")
      throw new Error("write forms are visible in guest mode");
    if (result.profileCard !== "none") throw new Error("profile editor visible to guest");
    if (!result.ledgerActions) throw new Error("ledger write actions visible to guest");
    if (!result.allLedger) throw new Error("guest ledger is not on all records");
    if (!result.navText.includes("账本")) throw new Error("guest ledger nav label missing");
    if (!result.toast.includes("访客模式只能查看"))
      throw new Error("guest write guard did not block action");
    console.log("GUEST_OK", JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
