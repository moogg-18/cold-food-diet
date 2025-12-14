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
    try { return JSON.parse(localStorage.getItem(LS_KEY_LOGS) || "[]"); }
    catch { return []; }
  }

  function saveLogs(logs) {
    localStorage.setItem(LS_KEY_LOGS, JSON.stringify(logs));
  }

  function loadProfile() {
    try { return JSON.parse(localStorage.getItem(LS_KEY_PROFILE) || "{}"); }
    catch { return {}; }
  }

  function saveProfile(p) {
    localStorage.setItem(LS_KEY_PROFILE, JSON.stringify(p));
  }

  function isColdFood(name) {
    if (!name) return false;
    if (ColdFoods.has(name)) return true;
    return name.includes("冰") || name.includes("生");
  }

  /* ========= 飲食紀錄 ========= */
  // ✅ 支援 photo + date
  function addLog(meal, food, calories, photo = null, date = null) {
    const logs = loadLogs();
    logs.push({
      id: (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + "_" + Math.random().toString(16).slice(2),
      date: date || todayISO(),
      meal,
      food,
      calories: Number(calories) || 0,
      cold: isColdFood(food),
      photo // base64 或 null
    });
    saveLogs(logs);
  }

  function removeLog(id) {
    const logs = loadLogs().filter(l => l.id !== id);
    saveLogs(logs);
  }

  /* ========= 依日期統計 ========= */
  function getSummaryByDate(dateISO) {
    const target = dateISO || todayISO();
    const logs = loadLogs().filter(l => l.date === target);

    let total = 0;
    let coldCount = 0;

    logs.forEach(l => {
      total += Number(l.calories) || 0;
      if (l.cold) coldCount++;
    });

    let tip = "飲食狀況良好";
    if (logs.length === 0) {
      tip = "尚未記錄飲食，請先新增三餐紀錄";
    } else {
      if (coldCount >= 3) tip = "冷性食物偏多，建議搭配溫熱性食物";
      if (total > 2000) tip = "熱量偏高，注意飲食均衡";
    }

    return { total, coldCount, tip, logs, date: target };
  }

  // ✅ 保留原本 API：今天摘要 = 依今天日期算
  function getTodaySummary() {
    return getSummaryByDate(todayISO());
  }

  /* ========= 每日建議熱量（TDEE） ========= */
  function getDailyCalorieLimit() {
    const p = loadProfile();

    const age = Number(p.age ?? p.Age ?? p.years ?? p.year) || 20;

    const rawSex = (p.sex ?? p.gender ?? p.Gender ?? "female").toString().toLowerCase();
    const sex =
      rawSex.includes("男") || rawSex === "m" || rawSex.includes("male")
        ? "male"
        : "female";

    const height = Number(p.height ?? p.Height ?? p.h) || 0;
    const weight = Number(p.weight ?? p.Weight ?? p.w) || 0;
    if (!height || !weight) return null;

    const bmr =
      sex === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const activity = (p.activity ?? p.exercise ?? p.workout ?? "0-2").toString();
    let factor = 1.2;
    if (activity.includes("每天") || activity.includes("daily")) factor = 1.75;
    else if (activity.includes("3-5") || activity.includes("3") || activity.includes("5")) factor = 1.55;

    let tdee = bmr * factor;

    const goal = (p.goal ?? p.target ?? "maintain").toString().toLowerCase();
    if (goal.includes("lose") || goal.includes("減")) tdee -= 300;
    if (goal.includes("gain") || goal.includes("增")) tdee += 300;

    return Math.round(tdee);
  }

  /* ========= 依日期狀態（含超標資訊） ========= */
  function getStatusByDate(dateISO) {
    const sum = getSummaryByDate(dateISO);
    const limit = getDailyCalorieLimit();

    if (!limit) return { ...sum, limit: null, over: false, overBy: 0 };

    const overBy = Math.max(0, sum.total - limit);
    return { ...sum, limit, over: overBy > 0, overBy };
  }

  // ✅ 保留原本 API：今天狀態
  function getTodayStatus() {
    return getStatusByDate(todayISO());
  }

  /* ========= 對外 API ========= */
  window.App = {
    // logs
    addLog,
    removeLog,

    // summary/status
    getSummaryByDate,
    getStatusByDate,
    getTodaySummary,
    getTodayStatus,
    getDailyCalorieLimit,

    // profile
    loadProfile,
    saveProfile,

    // utils
    isColdFood,
    todayISO
  };
})();
