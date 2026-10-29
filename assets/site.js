/* 芒果之神｜共用腳本 */
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzaXt8GMUX6PdAhAAxm_DTPEAQGKMFMeRofRoiJnsZPea_8415OhrPfJziT01kNee98Pw/exec",          // Apps Script 網址；空白 = 示範模式
  SHOW_DEMO_BAR: false,  // 正式上線改成 false
  MAX_BOXES: 3,
  DISCOUNT_PER_BOX: 50,
  BOXES_PER_PACKAGE: 2,
  LINE_ID: "@mangogod（待補）"
};
const PRODUCTS = [      // 價格為示意，正式上線前改；名稱要跟 Code.gs 一致
  { id:"aiwen",    name:"愛文",       label:"愛文",         price:1000 },
  { id:"aiwen15",  name:"愛文15顆裝", label:"愛文 15 顆裝", price:1100 },
  { id:"jinhuang", name:"金煌",       label:"金煌",         price:900 },
  { id:"xishi",    name:"西施",       label:"西施",         price:900 }
];
const STATES = {
  offseason:{ open:false, label:"2026 產季已結束", short:"非產季", bar:"下一季約 5 月底開放預購",
    lede:"下一季約 5 月底開放預購。留下 Email，開放當天寄信通知您。", step:0 },
  preorder: { open:true,  label:"2027 預購開放中", short:"預購開放中", bar:"出貨前才付款",
    lede:"先登記，出貨前一天才通知匯款。每筆最多 3 箱，可以分寄不同地址。", step:1 },
  shipping: { open:true,  label:"陸續出貨中", short:"陸續出貨中", bar:"仍可預購，依序出貨",
    lede:"已預購的訂單依登記順序寄出，寄出前一天通知匯款。還沒預購的，現在登記仍會安排。", step:2 },
  full:     { open:false, label:"今年預購已額滿", short:"預購已額滿", bar:"明年開賣通知",
    lede:"今年的量已經訂滿。留下 Email，明年開放預購時通知您。", step:3 }
};

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => "$" + Number(n).toLocaleString("en-US");
const store = {
  get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { sessionStorage.setItem(k,v); } catch(e){} }
};

/* ---- 後端 ---- */
async function api(payload){
  if (!CONFIG.API_URL) return demoApi(payload);
  try {
    const r = await fetch(CONFIG.API_URL, { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    return await r.json();
  } catch (err) {
    return { ok:false, message:"連線沒有成功。請確認網路後再送一次，或直接 LINE 我們。" };
  }
}
let demoSeq = 1;
async function demoApi(payload){
  await new Promise(r => setTimeout(r, 500));
  if (payload.action === "order") {
    const ph = payload.buyer.phone.replace(/\D/g,"");
    const seen = (store.get("demoPhones") || "").split(",");
    if (!payload.confirmDuplicate && seen.includes(ph)) return { ok:false, status:"duplicate" };
    store.set("demoPhones", seen.concat(ph).join(","));
    return { ok:true, orderId:"MG270601-" + String(demoSeq++).padStart(3,"0"), demo:true };
  }
  return { ok:true, demo:true };
}

/* ---- 產季狀態 ---- */
let season = store.get("season") || (CONFIG.API_URL ? "offseason" : "preorder");
const seasonListeners = [];
function onSeason(fn){ seasonListeners.push(fn); fn(season); }
function setSeason(s){
  if (!STATES[s]) return;
  season = s; store.set("season", s);
  seasonListeners.forEach(fn => fn(s));
}
async function loadSeason(){
  if (!CONFIG.API_URL) return;
  try {
    const r = await fetch(CONFIG.API_URL + "?action=status");
    const j = await r.json();
    if (STATES[j.season]) setSeason(j.season);
  } catch(e){}
}

/* 有 data-show="preorder shipping" 的元素只在這些狀態出現；data-season="label|lede|short" 填文字 */
onSeason(s => {
  const st = STATES[s];
  $$("[data-show]").forEach(el => { el.hidden = !el.dataset.show.split(" ").includes(s); });
  $$("[data-open]").forEach(el => { el.hidden = (el.dataset.open === "yes") !== st.open; });
  $$("[data-season]").forEach(el => { el.textContent = st[el.dataset.season]; });
  $$(".status").forEach(el => el.classList.toggle("off", !st.open));
  const list = $("#seasonList");
  if (list) {
    const items = $$("li", list);
    items.forEach((li,i) => { li.className = i < st.step ? "done" : i === st.step ? "now" : ""; });
    const pct = items.length > 1 ? (st.step / (items.length - 1)) * 100 : 0;
    list.style.setProperty("--fill", pct + "%");
  }
  $$("#demoBar button").forEach(b => b.setAttribute("aria-pressed", b.dataset.state === s));
});

/* ---- 頁首選單（手機） ---- */
(function menu(){
  const head = $(".site-head"), btn = $(".menu-btn");
  if (!head || !btn) return;
  btn.addEventListener("click", () => {
    const open = head.classList.toggle("open");
    btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "關閉" : "選單";
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && head.classList.contains("open")) btn.click(); });
})();

/* ---- 示範列 ---- */
(function demo(){
  const bar = $("#demoBar");
  if (!bar) return;
  if (!CONFIG.SHOW_DEMO_BAR) { bar.remove(); return; }
  bar.hidden = false;
  bar.addEventListener("click", e => { const b = e.target.closest("[data-state]"); if (b) setSeason(b.dataset.state); });
})();

/* ---- 開賣通知表單（可放在任何頁） ---- */
function bindNotify(form){
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const input = $("input[type=email]", form), msg = $(".msg", form), hp = $(".hp", form);
    const email = input.value.trim();
    if (hp && hp.value) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Email 格式不對，請檢查有沒有少了 @ 或網域。"; msg.style.color = "var(--warn)"; input.focus(); return; }
    msg.style.color = ""; msg.textContent = "登記中…";
    const res = await api({ action:"notify", email });
    msg.textContent = res.ok ? "已登記。開放預購當天會寄信到 " + email + "。" : (res.message || "登記沒有成功，請稍後再試。");
    if (res.ok) input.value = "";
  });
}
$$("form[data-notify]").forEach(bindNotify);

/* ---- LINE ID 複製 ---- */
$$("[data-line-id]").forEach(el => el.textContent = CONFIG.LINE_ID);
$$("[data-copy-line]").forEach(btn => btn.addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(CONFIG.LINE_ID); btn.textContent = "已複製"; }
  catch(e){ const code = btn.previousElementSibling; const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "已選取，請按複製"; }
  setTimeout(() => btn.textContent = "複製", 1800);
}));

/* ---- 年份 ---- */
$$("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

loadSeason();
