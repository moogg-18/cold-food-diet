// app.js — LocalStorage 版本（期末專題穩定用）
(function () {
  const LS_KEY_LOGS = "diet_logs_v1";
  const LS_KEY_PROFILE = "diet_profile_v1";

  // 冷性食物清單（可自行擴充）
  const ColdFoods = new Set([
    "冰水","冰飲","西瓜","哈密瓜","梨子","香蕉","火龍果",
    "苦瓜","小黃瓜","冬瓜","白蘿蔔","綠豆","薏仁","海帶","紫菜",
    "螃蟹","蛤蜊","牡蠣","生魚片","沙拉"
  ]);

  /* ========= 工具 ========= */
  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function loadLogs() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_LOGS) || "[]");
    } catch {
      return [];
    }
  }

  function saveLogs(logs) {
    localStorage.setItem(LS_KEY_LOGS, JSON.stringify(logs));
  }

  function loadProfile() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY_PROFILE) || "{}");
    } catch {
      return {};
    }
  }

  function saveProfile(p) {
    localStorage.setItem(LS_KEY_PROFILE, JSON.stringify(p));
  }

  function isColdFood(name) {
    if (!name) return false;
    if (ColdFoods.has(name)) return true;
    // 簡易關鍵字判斷
    return name.includes("冰") || name.includes("生");
  }

  /* ========= 飲食紀錄 ========= */
  function addLog(meal, food, calories) {
    const logs = loadLogs();
    logs.push({
      id: crypto.randomUUID(),
      date: todayISO(),
      meal,
      food,
      calories: Number(calories) || 0,
      cold: isColdFood(food)
    });
    saveLogs(logs);
  }

  function removeLog(id) {
    const logs = loadLogs().filter(l => l.id !== id);
    saveLogs(logs);
  }

  /* ========= 今日統計 ========= */
  function getTodaySummary() {
    const logs = loadLogs().filter(l => l.date === todayISO());

    let total = 0;
    let coldCount = 0;

    logs.forEach(l => {
      total += l.calories;
      if (l.cold) coldCount++;
    });

    let tip = "飲食狀況良好";
    if (coldCount >= 3) {
      tip = "冷性食物偏多，建議搭配溫熱性食物";
    }
    if (total > 2000) {
      tip = "今日熱量偏高，注意飲食均衡";
    }
    if (logs.length === 0) {
      tip = "尚未記錄飲食，請先新增三餐紀錄";
    }

    return {
      total,        // 👉 index.html / stats.html 用
      coldCount,    // 👉 index.html / stats.html 用
      tip,          // 👉 index.html / stats.html 用
      logs          // 👉 其他頁面可用
    };
  }

  /* ========= 對外 API ========= */
  window.App = {
    // logs
    addLog,
    removeLog,

    // summary
    getTodaySummary,

    // profile
    loadProfile,
    saveProfile,

    // utils
    isColdFood
  };
})();
