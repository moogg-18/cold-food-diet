// week.js — 週曆相片紀錄（可自訂列標題）LocalStorage + 自動縮圖
(() => {
  const LS_KEY_DATA = "diet_week_photos_v2";   // 照片資料（依週）
  const LS_KEY_ROWS = "diet_week_rows_v2";     // 每週列設定（依週）

  const DEFAULT_ROWS = [
    { id: "breakfast", title: "早" },
    { id: "lunch", title: "中" },
    { id: "dinner", title: "晚" },
    { id: "snack", title: "點心" },
  ];

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const gridEl = document.getElementById("weekGrid");
  const titleEl = document.getElementById("weekTitle");
  const filePicker = document.getElementById("filePicker");

  let currentMonday = getMonday(new Date());
  let pendingCellId = null;

  /* ========= storage helpers ========= */
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  }
  function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay(); // Sun=0
    const diff = (day === 0 ? -6 : 1) - day; // to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function weekKey(monday) {
    return fmtDate(monday); // 用週一日期當 key
  }

  function getWeekDates(monday) {
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }

  /* ========= rows (custom) ========= */
  function loadRowsForWeek(wk) {
    const allRows = loadJSON(LS_KEY_ROWS, {});
    if (!allRows[wk]) {
      allRows[wk] = DEFAULT_ROWS;
      saveJSON(LS_KEY_ROWS, allRows);
    }
    return allRows[wk];
  }

  function saveRowsForWeek(wk, rows) {
    const allRows = loadJSON(LS_KEY_ROWS, {});
    allRows[wk] = rows;
    saveJSON(LS_KEY_ROWS, allRows);
  }

  function newRowId() {
    // 簡單唯一 id
    return "row_" + Math.random().toString(16).slice(2) + "_" + Date.now();
  }

  /* ========= data (photos) ========= */
  function loadDataForWeek(wk) {
    const all = loadJSON(LS_KEY_DATA, {});
    return all[wk] || {};
  }

  function saveDataForWeek(wk, weekData) {
    const all = loadJSON(LS_KEY_DATA, {});
    all[wk] = weekData;
    saveJSON(LS_KEY_DATA, all);
  }

  function render() {
    const dates = getWeekDates(currentMonday);
    const wk = weekKey(currentMonday);

    const rows = loadRowsForWeek(wk);
    const weekData = loadDataForWeek(wk);

    // 標題
    titleEl.textContent = `本週：${fmtDate(dates[0])} ～ ${fmtDate(dates[6])}`;

    // 清空
    gridEl.innerHTML = "";

    // 左上角
    gridEl.appendChild(makeDiv("week-corner", ""));

    // 週標題列
    dates.forEach((d, i) => {
      const head = document.createElement("div");
      head.className = "week-head";
      head.innerHTML = `<div class="week-day">${DAYS[i]}</div><div class="week-date">${fmtDate(d).slice(5)}</div>`;
      gridEl.appendChild(head);
    });

    // 每一列：左側可編輯標題 + 7 個照片格
    rows.forEach((row) => {
      // 左側：列標題（可編輯）
      const side = document.createElement("div");
      side.className = "week-side week-side-editable";
      side.innerHTML = `
        <div class="week-row-title" contenteditable="true" spellcheck="false">${escapeHtml(row.title)}</div>
        <button class="week-row-del" title="刪除此列">✕</button>
      `;

      // 編輯標題：失焦保存
      const titleDiv = side.querySelector(".week-row-title");
      titleDiv.addEventListener("blur", () => {
        const newTitle = (titleDiv.textContent || "").trim() || "未命名";
        row.title = newTitle;
        saveRowsForWeek(wk, rows);
      });

      // 刪除列：同時刪掉該列所有照片
      side.querySelector(".week-row-del").addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("要刪除此列？（此列所有照片也會一起清除）")) return;

        // 移除 row
        const newRows = rows.filter(r => r.id !== row.id);
        saveRowsForWeek(wk, newRows);

        // 清除該 row 的所有 cell
        Object.keys(weekData).forEach((k) => {
          if (k.endsWith(`_${row.id}`)) delete weekData[k];
        });
        saveDataForWeek(wk, weekData);

        render();
      });

      gridEl.appendChild(side);

      // 7天照片格
      dates.forEach((d) => {
        const cellId = `${fmtDate(d)}_${row.id}`;
        const cell = document.createElement("div");
        cell.className = "week-cell";
        cell.dataset.cellId = cellId;

        const data = weekData[cellId];
        if (data?.img) {
          cell.innerHTML = `
            <img class="week-img" src="${data.img}" alt="meal photo" />
            <button class="week-clear" title="清除">✕</button>
          `;
        } else {
          cell.innerHTML = `
            <div class="week-empty">
              <div class="week-plus">＋</div>
              <div class="week-empty-text">上傳</div>
            </div>
          `;
        }

        // 點格子上傳
        cell.addEventListener("click", (e) => {
          if (e.target && e.target.classList.contains("week-clear")) return;
          pendingCellId = cellId;
          filePicker.value = "";
          filePicker.click();
        });

        // 清除照片
        const clearBtn = cell.querySelector(".week-clear");
        if (clearBtn) {
          clearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            delete weekData[cellId];
            saveDataForWeek(wk, weekData);
            render();
          });
        }

        gridEl.appendChild(cell);
      });
    });
  }

  function makeDiv(cls, text) {
    const div = document.createElement("div");
    div.className = cls;
    div.textContent = text;
    return div;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // 上傳 → 壓縮 → 存
  filePicker.addEventListener("change", async () => {
    const file = filePicker.files?.[0];
    if (!file || !pendingCellId) return;

    const imgDataUrl = await compressImageToDataUrl(file, 520, 0.8);

    const wk = weekKey(currentMonday);
    const weekData = loadDataForWeek(wk);

    weekData[pendingCellId] = { img: imgDataUrl };

    try {
      saveDataForWeek(wk, weekData);
    } catch {
      alert("儲存失敗：可能照片太多導致容量滿了。建議清除一些格子或上傳更小的照片。");
    }

    pendingCellId = null;
    render();
  });

  function compressImageToDataUrl(file, maxSize, quality) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          const scale = Math.min(1, maxSize / Math.max(width, height));
          const w = Math.round(width * scale);
          const h = Math.round(height * scale);

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 週切換
  document.getElementById("prevWeek").addEventListener("click", () => {
    currentMonday = addDays(currentMonday, -7);
    render();
  });

  document.getElementById("nextWeek").addEventListener("click", () => {
    currentMonday = addDays(currentMonday, 7);
    render();
  });

  // 新增列
  document.getElementById("addRow").addEventListener("click", () => {
    const wk = weekKey(currentMonday);
    const rows = loadRowsForWeek(wk);

    const title = prompt("輸入新列標題（例如：宵夜 / 飲水 / 運動）", "新列");
    if (!title) return;

    rows.push({ id: newRowId(), title: title.trim() || "未命名" });
    saveRowsForWeek(wk, rows);
    render();
  });

  // 重設列
  document.getElementById("resetRows").addEventListener("click", () => {
    const wk = weekKey(currentMonday);
    if (!confirm("要重設回預設列嗎？（不會刪照片，但非預設列的照片可能不再顯示）")) return;
    saveRowsForWeek(wk, DEFAULT_ROWS);
    render();
  });

  render();
})();