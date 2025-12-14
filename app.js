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

  function todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function loadLogs() {
    return JSON.parse(localStorage.getItem(LS_KEY_LOGS) || "[]");
  }

  function saveLogs(logs) {
    localStorage.setItem(LS_KEY_LOGS, JSON.stringify(logs));
  }

  function loadProfile() {
    return JSON.parse(localStorage.getItem(LS_KEY_PROFILE) || "{}");
  }

  function saveProfile(p) {
    localStorage.setItem(LS_KEY_PROFILE, JSON.stringify(p));
  }

  function isColdFood(name) {
    if (!name) return false;
    return ColdFoods.has(name) || name.includes("冰") || name.includes("生");
  }

  function addLog(meal, food, calories) {
    const logs = loadLogs();
    logs.push({
      date: todayISO(),
      meal,
      food,
      calories: Number(calories),
      cold: isColdFood(food)
    });
    saveLogs(logs);
  }

  function getTodaySummary() {
    const logs = loadLogs().filter(l => l.date === todayISO());
    let total = 0;
    let coldCount = 0;

    logs.forEach(l => {
      total += l.calories;
      if (l.cold) coldCount++;
    });

    let tip = "飲食狀況良好";
    if (coldCount >= 3) tip = "冷性食物偏多，建議搭配溫熱食物";
    if (total > 2000) tip = "今日熱量偏高，注意均衡";

    return { total, coldCount, tip };
  }

  // 對外使用
  window.App =
