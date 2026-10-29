/* 芒果之神｜預購流程 */
const COUNTIES = ["臺北市","新北市","基隆市","桃園市","新竹市","新竹縣","苗栗縣","臺中市","彰化縣","南投縣","雲林縣","嘉義市","嘉義縣","臺南市","高雄市","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const WHEN = ["不限","僅平日","僅週末","平日上午","平日下午"];

const emptyItems = () => Object.fromEntries(PRODUCTS.map(p => [p.id, 0]));
const newRcpt = () => ({ name:"", phone:"", county:"", addr:"", when:"不限", items: emptyItems() });
let O, step, errors, busy, dupWarn, result;
function resetOrder(){
  O = { buyer:{ name:"", phone:"", email:"", line:"" }, mode:"self", rcpts:[newRcpt()], agree:false, hp:"" };
  step = 1; errors = {}; busy = false; dupWarn = false; result = null;
}
resetOrder();

const root = document.getElementById("orderRoot");
const boxesOf = r => PRODUCTS.reduce((s,p) => s + r.items[p.id], 0);
const totalBoxes = () => O.rcpts.reduce((s,r) => s + boxesOf(r), 0);
const itemLabel = r => PRODUCTS.filter(p => r.items[p.id] > 0).map(p => `${p.label} ${r.items[p.id]} 箱`).join("、");
function totals(){
  const boxes = totalBoxes();
  const subtotal = O.rcpts.reduce((s,r) => s + PRODUCTS.reduce((t,p) => t + p.price * r.items[p.id], 0), 0);
  const discount = boxes * CONFIG.DISCOUNT_PER_BOX;
  const packages = O.rcpts.reduce((s,r) => s + Math.ceil(boxesOf(r) / CONFIG.BOXES_PER_PACKAGE), 0);
  return { boxes, subtotal, discount, pay: subtotal - discount, packages };
}
function syncSelf(){ if (O.mode === "self") { O.rcpts[0].name = O.buyer.name; O.rcpts[0].phone = O.buyer.phone; } }

const errMsg = k => errors[k] ? `<span class="err" id="e-${k}">${errors[k]}</span>` : "";
const inv = k => errors[k] ? ` class="invalid" aria-invalid="true" aria-describedby="e-${k}"` : "";

function stepbar(){
  const names = ["訂購人","收件與品項","確認送出"];
  return `<ol class="stepbar" aria-label="預購步驟">${names.map((n,i) => {
    const k = i + 1, cls = k === step ? "on" : k < step ? "done" : "";
    return `<li class="${cls}"${k === step ? ' aria-current="step"' : ""}>${k}. ${n}</li>`; }).join("")}</ol>`;
}

function render(){
  if (!STATES[season].open) { root.innerHTML = renderClosed(); const f = root.querySelector("form[data-notify]"); if (f) bindNotify(f); return; }
  if (result) { root.innerHTML = renderDone(); return; }
  root.innerHTML = stepbar() + (step === 1 ? step1() : step === 2 ? step2() : step3());
}

function renderClosed(){
  const st = STATES[season];
  return `<div class="closed">
    <span class="status off">${st.label}</span>
    <h1>目前沒有開放預購</h1>
    <p>${st.lede}</p>
    <form class="notify" data-notify novalidate style="margin-top:4px">
      <label class="sr" for="closedEmail">Email</label>
      <input type="email" id="closedEmail" placeholder="您的 Email" autocomplete="email">
      <input type="text" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn" type="submit">開賣時通知我</button>
      <p class="msg">只用來寄開賣通知，不會寄廣告。</p>
    </form>
    <a class="textlink" href="mango.html">先看看三種芒果</a>
  </div>`;
}

function step1(){
  const b = O.buyer;
  return `<h1>訂購人</h1>
  <p class="muted" style="margin-top:6px">確認信和匯款通知會寄給您。現在不用付款。</p>
  <div class="panel">
    <div class="row2">
      <div class="field"><label for="b-name">姓名 <span class="req">*</span></label>
        <input type="text" id="b-name" data-b="name" value="${esc(b.name)}" autocomplete="name"${inv("b-name")}>${errMsg("b-name")}</div>
      <div class="field"><label for="b-phone">手機 <span class="req">*</span></label>
        <input type="tel" id="b-phone" data-b="phone" value="${esc(b.phone)}" autocomplete="tel" inputmode="tel" placeholder="0912345678"${inv("b-phone")}>${errMsg("b-phone")}</div>
    </div>
    <div class="field"><label for="b-email">Email <span class="hint">寄確認信與匯款通知</span></label>
      <input type="email" id="b-email" data-b="email" value="${esc(b.email)}" autocomplete="email" inputmode="email"${inv("b-email")}>${errMsg("b-email")}</div>
    <div class="field"><label for="b-line">LINE ID <span class="hint">選填。Email 和 LINE 至少填一個</span></label>
      <input type="text" id="b-line" data-b="line" value="${esc(b.line)}" autocapitalize="off"${inv("b-line")}>${errMsg("b-line")}</div>
  </div>
  <div class="navrow"><button class="btn big" type="button" data-act="next">下一步</button></div>`;
}

function rcptBlock(r, i){
  const self = O.mode === "self", left = CONFIG.MAX_BOXES - totalBoxes(), id = k => `r${i}-${k}`;
  return `<section class="rcpt" aria-labelledby="${id("h")}">
    <div class="rcpt-head"><h2 id="${id("h")}">${self ? "寄到訂購人" : "收件人 " + (i + 1)}</h2>
      ${!self && O.rcpts.length > 1 ? `<button class="del" type="button" data-act="del" data-i="${i}">移除</button>` : ""}</div>
    ${self ? `<p class="muted">${esc(O.buyer.name)}　${esc(O.buyer.phone)}</p>` : `
    <div class="row2">
      <div class="field"><label for="${id("name")}">收件人姓名 <span class="req">*</span></label>
        <input type="text" id="${id("name")}" data-r="${i}" data-k="name" value="${esc(r.name)}"${inv(id("name"))}>${errMsg(id("name"))}</div>
      <div class="field"><label for="${id("phone")}">收件人電話 <span class="req">*</span></label>
        <input type="tel" id="${id("phone")}" data-r="${i}" data-k="phone" value="${esc(r.phone)}" inputmode="tel"${inv(id("phone"))}>${errMsg(id("phone"))}</div>
    </div>`}
    <div class="row-addr">
      <div class="field"><label for="${id("county")}">縣市 <span class="req">*</span></label>
        <select id="${id("county")}" data-r="${i}" data-k="county"${inv(id("county"))}>
          <option value="">請選擇</option>${COUNTIES.map(c => `<option${c === r.county ? " selected" : ""}>${c}</option>`).join("")}
        </select>${errMsg(id("county"))}</div>
      <div class="field"><label for="${id("addr")}">地址 <span class="req">*</span> <span class="hint">鄉鎮區、路名、門牌</span></label>
        <input type="text" id="${id("addr")}" data-r="${i}" data-k="addr" value="${esc(r.addr)}" autocomplete="street-address"${inv(id("addr"))}>${errMsg(id("addr"))}</div>
    </div>
    <div class="field"><span class="legend" id="${id("items-l")}">品種與箱數 <span class="req">*</span></span>
      <div class="items" role="group" aria-labelledby="${id("items-l")}">${PRODUCTS.map(p => {
        const n = r.items[p.id];
        return `<div class="item"><div><div class="nm">${p.label}</div><div class="pr">${money(p.price)} / 箱<span class="tag">示意</span></div></div>
          <div class="stepper">
            <button type="button" data-act="minus" data-i="${i}" data-p="${p.id}" ${n <= 0 ? "disabled" : ""} aria-label="${p.label} 減一箱">−</button>
            <output aria-live="polite" aria-label="${p.label} 箱數">${n}</output>
            <button type="button" data-act="plus" data-i="${i}" data-p="${p.id}" ${left <= 0 ? "disabled" : ""} aria-label="${p.label} 加一箱">+</button>
          </div></div>`; }).join("")}
      </div>${errMsg(id("items"))}</div>
    <div class="field"><label for="${id("when")}">方便收貨的時間 <span class="hint">寫在包裹備註，無法指定日期</span></label>
      <select id="${id("when")}" data-r="${i}" data-k="when">${WHEN.map(w => `<option${w === r.when ? " selected" : ""}>${w}</option>`).join("")}</select></div>
  </section>`;
}

function sumBox(t){
  return `<div class="sum" aria-live="polite">
    <div class="ln"><span>小計（${t.boxes} 箱）</span><span>${money(t.subtotal)}</span></div>
    <div class="ln"><span>預購折扣（每箱 $${CONFIG.DISCOUNT_PER_BOX}）</span><span>−${money(t.discount)}</span></div>
    <div class="ln"><span>運費（郵局 ${t.packages} 件）</span><span class="muted">計算方式確定後補上</span></div>
    <div class="ln total"><span>預估金額</span><span>${money(t.pay)}</span></div>
    <p class="small muted">現在不用付款。寄出前一天會寄匯款通知。</p>
  </div>`;
}

function step2(){
  syncSelf();
  const t = totals(), full = t.boxes >= CONFIG.MAX_BOXES;
  return `<h1>收件與品項</h1>
  <div class="panel">
    <fieldset style="border:0;padding:0;margin:0"><legend class="sr">收件方式</legend>
    <div class="modes">
      <label class="mode"><input type="radio" name="mode" value="self" ${O.mode === "self" ? "checked" : ""}><b>寄到訂購人</b><small>寄給自己</small></label>
      <label class="mode"><input type="radio" name="mode" value="multi" ${O.mode === "multi" ? "checked" : ""}><b>不同地址（送禮用、合購）</b><small>可以分寄給不同收件人</small></label>
    </div></fieldset>
    ${O.rcpts.map(rcptBlock).join("")}
    ${O.mode === "multi" ? `<div><button class="btn line" type="button" data-act="add" ${full || O.rcpts.length >= CONFIG.MAX_BOXES ? "disabled" : ""}>新增收件人</button></div>` : ""}
    <div class="count ${full ? "full" : ""}"><span>已選 <b>${t.boxes}</b> / ${CONFIG.MAX_BOXES} 箱</span><span>${full ? "已到每筆上限" : `還可以選 ${CONFIG.MAX_BOXES - t.boxes} 箱`}</span></div>
    ${errMsg("total")}
    ${sumBox(t)}
  </div>
  <div class="navrow"><button class="btn big line" type="button" data-act="back">上一步</button><button class="btn big" type="button" data-act="next">下一步</button></div>`;
}

function ticket(r, i, editable){
  const title = O.mode === "self" ? "托運單" : `托運單　${i + 1} / ${O.rcpts.length}`;
  return `<div class="ticket">
    <div class="ticket-head"><b>${title}</b>${editable ? `<button type="button" data-act="goto" data-s="2">修改</button>` : ""}</div>
    <dl class="ticket-grid">
      <dt>收件人</dt><dd class="big">${esc(r.name)}</dd>
      <dt>電話</dt><dd>${esc(r.phone)}</dd>
      <dt>地址</dt><dd>${esc(r.county)}${esc(r.addr)}</dd>
      <dt>品名</dt><dd>${itemLabel(r)}</dd>
      <dt>件數</dt><dd>${Math.ceil(boxesOf(r) / CONFIG.BOXES_PER_PACKAGE)} 件（${boxesOf(r)} 箱）</dd>
      <dt>收貨時間</dt><dd>${esc(r.when)}</dd>
    </dl>
  </div>`;
}

function step3(){
  syncSelf();
  const t = totals(), b = O.buyer;
  return `<h1>確認送出</h1>
  <p class="muted" style="margin-top:6px">下面就是寄出時包裹上的資料。地址和電話請再看一次。</p>
  <div class="panel">
    ${O.rcpts.map((r,i) => ticket(r, i, true)).join("")}
    <div class="ticket">
      <div class="ticket-head"><b>訂購人</b><button type="button" data-act="goto" data-s="1">修改</button></div>
      <dl class="ticket-grid">
        <dt>姓名</dt><dd>${esc(b.name)}</dd><dt>手機</dt><dd>${esc(b.phone)}</dd>
        <dt>通知方式</dt><dd>${[b.email && "Email " + esc(b.email), b.line && "LINE " + esc(b.line)].filter(Boolean).join("<br>")}</dd>
      </dl>
    </div>
    ${sumBox(t)}
    <label class="check"><input type="checkbox" id="agree" ${O.agree ? "checked" : ""}><span>我了解這是預購登記。寄出前一天會收到匯款通知；芒果是生鮮，寄出後不能取消。</span></label>
    ${errMsg("agree")}
    <input type="text" class="hp" id="orderHp" tabindex="-1" autocomplete="off" aria-hidden="true">
    ${dupWarn ? `<div class="alert" role="alert"><b>這支手機已經有一筆預購</b><span>要再訂一筆，請按「再送一筆」。要修改原本的訂單，請直接 LINE 我們，不用重送。</span>
      <div class="btns"><button class="btn" type="button" data-act="force">再送一筆</button><a class="btn line" href="about.html">LINE 聯絡方式</a></div></div>` : ""}
    ${errMsg("submit")}
  </div>
  <div class="navrow"><button class="btn big line" type="button" data-act="back">上一步</button>
    <button class="btn big" type="button" data-act="submit" ${busy ? "disabled" : ""}>${busy ? "送出中…" : "送出預購"}</button></div>`;
}

function renderDone(){
  const t = totals(), b = O.buyer;
  return `<div class="panel" style="margin-top:0">
    <span class="status">預購已登記</span>
    <h1>謝謝您的預購</h1>
    <div><div class="small muted">訂單編號</div><div class="orderno">${esc(result.orderId)}</div></div>
    <p>${b.email ? `確認信已寄到 ${esc(b.email)}。` : "我們會用 LINE 跟您確認。"}寄出前一天會再通知您匯款。要修改，LINE 我們並告訴我們訂單編號。</p>
    ${result.demo ? `<p class="small muted">示範模式：這筆資料沒有真的送出。</p>` : ""}
    ${O.rcpts.map((r,i) => ticket(r, i, false)).join("")}
    ${sumBox(t)}
    <div class="navrow"><a class="btn big line" href="index.html">回首頁</a><button class="btn big" type="button" data-act="again">再訂一筆</button></div>
  </div>`;
}

/* ---- 驗證 ---- */
const phoneOk = s => s.replace(/\D/g,"").length >= 9 && /^[0-9\-\s()#+轉分機]+$/.test(s.trim());
const emailOk = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
function validate(s){
  errors = {};
  const b = O.buyer;
  if (s === 1){
    if (!b.name.trim()) errors["b-name"] = "請填寫姓名";
    if (!phoneOk(b.phone)) errors["b-phone"] = "請填寫聯絡得到您的電話，例如 0912345678";
    if (b.email.trim() && !emailOk(b.email)) errors["b-email"] = "Email 格式不對，請檢查有沒有少了 @";
    if (!b.email.trim() && !b.line.trim()) errors["b-email"] = "Email 和 LINE ID 至少填一個，才能通知您匯款";
  }
  if (s === 2){
    syncSelf();
    O.rcpts.forEach((r,i) => {
      if (O.mode === "multi"){
        if (!r.name.trim()) errors[`r${i}-name`] = "請填寫收件人姓名";
        if (!phoneOk(r.phone)) errors[`r${i}-phone`] = "請填寫收件人電話";
      }
      if (!r.county) errors[`r${i}-county`] = "請選擇縣市";
      if (r.addr.trim().length < 6) errors[`r${i}-addr`] = "請填完整地址，包含鄉鎮區和門牌";
      if (boxesOf(r) === 0) errors[`r${i}-items`] = "這位收件人還沒選芒果";
    });
    if (totalBoxes() > CONFIG.MAX_BOXES) errors.total = `每筆預購最多 ${CONFIG.MAX_BOXES} 箱`;
  }
  if (s === 3 && !O.agree) errors.agree = "請勾選後再送出";
  return Object.keys(errors).length === 0;
}
function focusFirstError(){
  const k = Object.keys(errors)[0]; if (!k) return;
  const el = document.getElementById(k) || document.getElementById("e-" + k);
  if (el) { el.scrollIntoView({ block:"center" }); if (el.focus) el.focus({ preventScroll:true }); }
}
const toTop = () => { window.scrollTo(0,0); const h = root.querySelector("h1"); if (h) { h.tabIndex = -1; h.focus({ preventScroll:true }); } };

/* ---- 事件 ---- */
root.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.b) O.buyer[el.dataset.b] = el.value;
  if (el.dataset.r) O.rcpts[+el.dataset.r][el.dataset.k] = el.value;
  if (el.id === "orderHp") O.hp = el.value;
});
root.addEventListener("change", e => {
  const el = e.target;
  if (el.id === "agree") O.agree = el.checked;
  if (el.dataset.r) O.rcpts[+el.dataset.r][el.dataset.k] = el.value;
  if (el.name === "mode") {
    O.mode = el.value;
    if (O.mode === "self") {
      const items = emptyItems(); O.rcpts.forEach(r => PRODUCTS.forEach(p => items[p.id] += r.items[p.id]));
      const r0 = O.rcpts[0]; r0.items = items; O.rcpts = [r0];
    } else { O.rcpts[0].name = ""; O.rcpts[0].phone = ""; }
    errors = {}; render();
    const r = root.querySelector(`input[name=mode][value=${O.mode}]`); if (r) r.focus();
  }
});
root.addEventListener("click", e => {
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const act = btn.dataset.act, i = +btn.dataset.i;
  if (act === "plus" && totalBoxes() < CONFIG.MAX_BOXES) { O.rcpts[i].items[btn.dataset.p]++; delete errors[`r${i}-items`]; keepFocus(btn); }
  if (act === "minus" && O.rcpts[i].items[btn.dataset.p] > 0) { O.rcpts[i].items[btn.dataset.p]--; keepFocus(btn); }
  if (act === "add") { O.rcpts.push(newRcpt()); render(); const h = root.querySelectorAll(".rcpt h2"); const last = h[h.length - 1]; if (last) { last.tabIndex = -1; last.scrollIntoView({ block:"start" }); last.focus({ preventScroll:true }); } }
  if (act === "del") { O.rcpts.splice(i,1); errors = {}; render(); }
  if (act === "next") { if (validate(step)) { step++; errors = {}; render(); toTop(); } else { render(); focusFirstError(); } }
  if (act === "back") { step--; errors = {}; dupWarn = false; render(); toTop(); }
  if (act === "goto") { step = +btn.dataset.s; errors = {}; dupWarn = false; render(); toTop(); }
  if (act === "submit") submit(false);
  if (act === "force") submit(true);
  if (act === "again") { resetOrder(); render(); toTop(); }
});
function keepFocus(btn){
  const { act, i, p } = btn.dataset, y = window.scrollY;
  render(); window.scrollTo(0, y);
  let next = root.querySelector(`[data-act="${act}"][data-i="${i}"][data-p="${p}"]`);
  if (next && next.disabled) next = root.querySelector(`[data-act="${act === "plus" ? "minus" : "plus"}"][data-i="${i}"][data-p="${p}"]`);
  if (next) next.focus({ preventScroll:true });
}

async function submit(force){
  if (!validate(3)) { render(); focusFirstError(); return; }
  if (O.hp) return;
  busy = true; dupWarn = false; render();
  syncSelf();
  const res = await api({ action:"order", confirmDuplicate: force, buyer: O.buyer,
    recipients: O.rcpts.map(r => ({ name:r.name, phone:r.phone, county:r.county, addr:r.addr, when:r.when, items:r.items })) });
  busy = false;
  if (res.ok) { result = res; render(); toTop(); }
  else if (res.status === "duplicate") { dupWarn = true; render(); const a = root.querySelector(".alert"); if (a) a.scrollIntoView({ block:"center" }); }
  else { errors = { submit: res.message || "送出沒有成功。請稍後再試，或直接 LINE 我們。" }; render(); }
}

/* 離開前提醒：填到一半 */
window.addEventListener("beforeunload", e => {
  if (!result && (O.buyer.name || O.buyer.phone || totalBoxes() > 0)) { e.preventDefault(); e.returnValue = ""; }
});

onSeason(() => render());
