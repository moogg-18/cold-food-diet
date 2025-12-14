// week.js — 週曆相片紀錄（整合 diet_logs_v1 的照片）
(function () {
  const LS_KEY_LOGS = "diet_logs_v1";            // 來自 app.js 的飲食紀錄
  const LS_KEY_WEEK_ROWS = "week_rows_v1";       // 週曆列設定（可自訂）
  const LS_KEY_WEEK_OVERRIDES = "week_photos_v1";// 週曆手動覆蓋照片（可清除）

  const gridEl = document.getElementById("weekGrid");
  const titleEl = document.getElementById("weekTitle");
  const filePicker = document.getElementById("filePicker");

  const btnPrev = document.getElementById("prevWeek");
  const btnNext = document.getElementById("nextWeek");
  const btnAddRow = document.getElementById("addRow");
  const btnReset = document.getElementById("resetRows");

  const DEFAULT_ROWS = [
    { id: "r_breakfast", title: "早餐" },
    { id: "r_lunch", title: "午餐" },
    { id: "r_dinner", title: "晚餐" },
    { id: "r_snack", title: "點心" },
  ];

  const WEEKDAY = ["一", "二", "三", "四", "五", "六", "日"];

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function loadLogs() {
    return safeJSONParse(localStorage.getItem(LS_KEY_LOGS) || "[]", []);
  }

  function loadRows() {
    const rows = safeJSONParse(localStorage.getItem(LS_KEY_WEEK_ROWS) || "null", null);
    if (Array.isArray(rows) && rows.length) return rows;
    saveRows(DEFAULT_ROWS);
    return DEFAULT_ROWS.slice();
  }

  function saveRows(rows) {
    localStorage.setItem(LS_KEY_WEEK_ROWS, JSON.stringify(rows));
  }

  // 覆蓋照片：{ "YYYY-MM-DD": { "rowId": "data:image/..." } }
  function loadOverrides() {
    return safeJSONParse(localStorage.getItem(LS_KEY_WEEK_OVERRIDES) || "{}", {});
  }
  function saveOverrides(obj) {
    localStorage.setItem(LS_KEY_WEEK_OVERRIDES, JSON.stringify(obj));
  }

  function pad2(n) { return String(n).padStart(2, "0"); }
  function toISO(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  }

  // 週起始：以「週一」為第一天
  function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // Sun=0..Sat=6
    const diff = (day === 0 ? -6 : 1 - day); // Monday as start
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  // 從飲食紀錄自動帶入：找「同日期 + meal=列標題」且有 photo 的最後一筆
  function getLogPhotoByDateAndMeal(dateISO, mealTitle) {
    const logs = loadLogs();
    const matches = logs.filter(l => l.date === dateISO && l.meal === mealTitle && l.photo);
    if (!matches.length) return null;
    return matches[matches.length - 1].photo; // 取最後一筆
  }

  // 若你週曆手動上傳，會覆蓋顯示（可清除）
  function getEffectivePhoto(dateISO, row) {
    const overrides = loadOverrides();
    const manual = overrides?.[dateISO]?.[row.id] || null;
    if (manual) return { src: manual, source: "override" };

    const fromLog = getLogPhotoByDateAndMeal(dateISO, row.title);
    if (fromLog) return { src: fromLog, source: "log" };

    return null;
  }

  // 週曆手動上傳：自動裁切成正方形中心，輸出 512x512 JPEG
  async function fileToSquareDataURL(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });

    const side = Math.min(img.width, img.height);
    const sx = Math.floor((img.width - side) / 2);
    const sy = Math.floor((img.height - side) / 2);

    const outSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, sx, sy, side, side, 0, 0, outSize, outSize);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  function formatWeekTitle(start) {
    const end = addDays(start, 6);
    const s = `${start.getFullYear()}/${pad2(start.getMonth()+1)}/${pad2(start.getDate())}`;
    const e = `${end.getFullYear()}/${pad2(end.getMonth()+1)}/${pad2(end.getDate())}`;
    return `${s} ～ ${e}`;
  }

  let currentWeekStart = startOfWeek(new Date());

  // ====== Render ======
  function render() {
    const rows = loadRows();
    const overrides = loadOverrides(); // read once (speed)
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    const weekISOs = weekDates.map(toISO);

    titleEl.textContent = formatWeekTitle(currentWeekStart);

    // 清空
    gridEl.innerHTML = "";

    // Header row
    const header = document.createElement("div");
    header.className = "week-row week-header";
    header.appendChild(makeHeaderCell("項目"));

    weekDates.forEach((d, idx) => {
      const cell = makeHeaderCell(`週${WEEKDAY[idx]}<br><span class="small">${toISO(d)}</span>`);
      header.appendChild(cell);
    });
    gridEl.appendChild(header);

    // Data rows
    rows.forEach(row => {
      const r = document.createElement("div");
      r.className = "week-row";

      // Row title cell (editable)
      const titleCell = document.createElement("div");
      titleCell.className = "week-cell week-title-cell";
      titleCell.innerHTML = `<span class="row-title" style="cursor:pointer; font-weight:800;">${escapeHTML(row.title)}</span>`;
      titleCell.title = "點擊修改列標題";
      titleCell.addEventListener("click", () => {
        const newTitle = prompt("請輸入新的列標題：", row.title);
        if (!newTitle) return;
        row.title = newTitle.trim() || row.title;
        saveRows(rows);
        render();
      });
      r.appendChild(titleCell);

      // 7 days cells
      weekISOs.forEach(dateISO => {
        const cell = document.createElement("div");
        cell.className = "week-cell photo-cell";
        cell.dataset.date = dateISO;
        cell.dataset.rowid = row.id;

        const eff = getEffectivePhoto(dateISO, row);

        if (eff?.src) {
          const img = document.createElement("img");
          img.src = eff.src;
          img.alt = "photo";
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          img.style.borderRadius = "12px";
          cell.appendChild(img);

          // 來源角標（log/override）
          const badge = document.createElement("div");
          badge.textContent = eff.source === "log" ? "LOG" : "自訂";
          badge.style.position = "absolute";
          badge.style.left = "8px";
          badge.style.top = "8px";
          badge.style.fontSize = "12px";
          badge.style.padding = "2px 8px";
          badge.style.borderRadius = "999px";
          badge.style.background = "rgba(255,255,255,.85)";
          badge.style.color = "#4d3900";
          badge.style.fontWeight = "800";
          cell.style.position = "relative";
          cell.appendChild(badge);

          // 只有「週曆自訂覆蓋」才顯示 ✕ 清除
          const manual = overrides?.[dateISO]?.[row.id];
          if (manual) {
            const x = document.createElement("button");
            x.type = "button";
            x.textContent = "✕";
            x.title = "清除本格自訂照片（恢復 LOG 照片或空白）";
            x.style.position = "absolute";
            x.style.right = "8px";
            x.style.top = "8px";
            x.style.border = "none";
            x.style.borderRadius = "999px";
            x.style.width = "28px";
            x.style.height = "28px";
            x.style.cursor = "pointer";
            x.style.background = "rgba(255,255,255,.85)";
            x.style.color = "#4d3900";
            x.style.fontWeight = "900";
            x.addEventListener("click", (ev) => {
              ev.stopPropagation();
              clearOverride(dateISO, row.id);
              render();
            });
            cell.appendChild(x);
          }
        } else {
          // empty placeholder
          cell.textContent = "+";
          cell.style.display = "flex";
          cell.style.alignItems = "center";
          cell.style.justifyContent = "center";
          cell.style.fontSize = "22px";
          cell.style.fontWeight = "900";
          cell.style.opacity = "0.6";
          cell.style.position = "relative";
        }

        // 點格子上傳（建立/覆蓋 override）
        cell.addEventListener("click", () => {
          pendingPick = { dateISO, rowId: row.id };
          filePicker.click();
        });

        r.appendChild(cell);
      });

      gridEl.appendChild(r);
    });
  }

  function makeHeaderCell(html) {
    const c = document.createElement("div");
    c.className = "week-cell week-header-cell";
    c.innerHTML = html;
    return c;
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
    }[m]));
  }

  // ====== Override ops ======
  function setOverride(dateISO, rowId, dataUrl) {
    const obj = loadOverrides();
    if (!obj[dateISO]) obj[dateISO] = {};
    obj[dateISO][rowId] = dataUrl;
    saveOverrides(obj);
  }

  function clearOverride(dateISO, rowId) {
    const obj = loadOverrides();
    if (!obj[dateISO]) return;
    delete obj[dateISO][rowId];
    if (Object.keys(obj[dateISO]).length === 0) delete obj[dateISO];
    saveOverrides(obj);
  }

  // ====== Events ======
  btnPrev.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    render();
  });

  btnNext.addEventListener("click", () => {
    currentWeekStart = addDays(currentWeekStart, +7);
    render();
  });

  btnAddRow.addEventListener("click", () => {
    const rows = loadRows();
    const title = prompt("新增一列：請輸入標題（例如：宵夜 / 下午茶 / 乳製品）", "自訂");
    if (!title) return;
    const id = "r_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    rows.push({ id, title: title.trim() || "自訂" });
    saveRows(rows);
    render();
  });

  btnReset.addEventListener("click", () => {
    if (!confirm("確定要重設回預設列（早餐/午餐/晚餐/點心）嗎？\n（不會刪掉你的飲食紀錄，但會重設週曆列標題）")) return;
    saveRows(DEFAULT_ROWS.slice());
    render();
  });

  let pendingPick = null;

  filePicker.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !pendingPick) return;

    try {
      const dataUrl = await fileToSquareDataURL(file);
      setOverride(pendingPick.dateISO, pendingPick.rowId, dataUrl);
      pendingPick = null;
      render();
    } catch (err) {
      console.error(err);
      alert("照片讀取/縮圖失敗，請換一張試試。");
    }
  });

  // 初次渲染
  render();
})();