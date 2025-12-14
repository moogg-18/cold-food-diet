// week.js — 週曆相片紀錄（LocalStorage + 自動縮圖）
(() => {
  const LS_KEY = "diet_week_photos_v1";
  const MEALS = [
    { key: "breakfast", label: "早" },
    { key: "lunch", label: "中" },
    { key: "dinner", label: "晚" },
    { key: "snack", label: "點" },
  ];
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const gridEl = document.getElementById("weekGrid");
  const titleEl = document.getElementById("weekTitle");
  const filePicker = document.getElementById("filePicker");

  let currentMonday = getMonday(new Date());
  let pendingCellId = null;

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveAll(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
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

  function render() {
    const dates = getWeekDates(currentMonday);
    const wkKey = weekKey(currentMonday);
    const all = loadAll();
    const weekData = all[wkKey] || {}; // { "YYYY-MM-DD_meal": {img, note} }

    // 顯示標題
    const start = fmtDate(dates[0]);
    const end = fmtDate(dates[6]);
    titleEl.textContent = `本週：${start} ～ ${end}`;

    // 建表：左上角空白 + 7天標題列 + 4餐列
    gridEl.innerHTML = "";

    // 左上角空白
    gridEl.appendChild(makeDiv("week-corner", ""));

    // 週標題列
    dates.forEach((d, i) => {
      const dayTitle = document.createElement("div");
      dayTitle.className = "week-head";
      dayTitle.innerHTML = `<div class="week-day">${DAYS[i]}</div><div class="week-date">${fmtDate(d).slice(5)}</div>`;
      gridEl.appendChild(dayTitle);
    });

    // 餐別列 + 內容格
    MEALS.forEach((meal) => {
      // 左側餐別標籤
      const label = makeDiv("week-side", meal.label);
      gridEl.appendChild(label);

      // 7 天格子
      dates.forEach((d) => {
        const id = `${fmtDate(d)}_${meal.key}`;
        const cell = document.createElement("div");
        cell.className = "week-cell";
        cell.dataset.cellId = id;

        const data = weekData[id];
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
          // 點到清除按鈕就不要開上傳
          if (e.target && e.target.classList.contains("week-clear")) return;
          pendingCellId = id;
          filePicker.value = "";
          filePicker.click();
        });

        // 清除
        const clearBtn = cell.querySelector(".week-clear");
        if (clearBtn) {
          clearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            delete weekData[id];
            all[wkKey] = weekData;
            saveAll(all);
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

  // 上傳後：縮圖壓縮 -> 存 LocalStorage
  filePicker.addEventListener("change", async () => {
    const file = filePicker.files?.[0];
    if (!file || !pendingCellId) return;

    const imgDataUrl = await compressImageToDataUrl(file, 520, 0.8); // 最大邊520px，品質0.8
    const wkKey = weekKey(currentMonday);
    const all = loadAll();
    const weekData = all[wkKey] || {};

    weekData[pendingCellId] = { img: imgDataUrl };
    all[wkKey] = weekData;

    try {
      saveAll(all);
    } catch (err) {
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

          // jpeg 比 png 省很多
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

  render();
})();
