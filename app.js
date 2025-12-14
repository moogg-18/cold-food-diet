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
    const m = String(d.getMonth() +
