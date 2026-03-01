// background.js  —— 2025年12月终极无错版（已彻底删除所有 createObjectURL）
const ARCHIVE_FILENAME = "MyBrowserHistory.json";

async function getLastExportTime() {
  const data = await chrome.storage.local.get(["lastExportTime"]);
  return data.lastExportTime || 0;
}

async function setLastExportTime(time) {
  await chrome.storage.local.set({ lastExportTime: time });
}

async function appendNewHistoryToFile() {
  const now = Date.now();
  const lastTime = await getLastExportTime();
  const startTime = lastTime === 0 ? 0 : lastTime;
//now - 7 * 24 * 60 * 60 * 1000
  const items = await chrome.history.search({
    text: "",
    startTime: startTime,
    maxResults: 200000
  });

  if (items.length === 0) {
    await setLastExportTime(now);
    return;
  }

  const newEntries = items.map(i => ({
    url: i.url,
    title: i.title || "(无标题)",
    visitCount: i.visitCount || 1,
    lastVisitTime: i.lastVisitTime,
    lastVisitISO: new Date(i.lastVisitTime).toISOString()
  }));

  // 读取旧文件内容
  let oldData = [];
  const files = await new Promise(r => chrome.downloads.search({filename: ARCHIVE_FILENAME}, r));
  if (files.length > 0) {
    try {
      const resp = await fetch(files[0].url);
      const txt = await resp.text();
      if (txt.trim()) oldData = JSON.parse(txt);
    } catch (e) { console.log("旧文件损坏，重新开始"); }
  }

  // 去重并追加
  const seen = new Set(oldData.map(x => `${x.url}|${x.lastVisitTime}`));
  const toAdd = newEntries.filter(x => !seen.has(`${x.url}|${x.lastVisitTime}`));
  if (toAdd.length === 0) {
    await setLastExportTime(now);
    return;
  }

  const allData = [...oldData, ...toAdd]
    .sort((a, b) => b.lastVisitTime - a.lastVisitTime);

  // 纯 data:URL 方式下载（MV3 完全兼容，零报错）
  const json = JSON.stringify(allData, null, 2);
  const dataUrl = "data:application/json;base64," + btoa(unescape(encodeURIComponent(json)));

  chrome.downloads.download({
    url: dataUrl,
    filename: ARCHIVE_FILENAME,
    saveAs: false,
    conflictAction: "overwrite"
  }, () => {
    console.log(`成功追加 ${toAdd.length} 条，总计 ${allData.length} 条`);
    setLastExportTime(now);
  });
}

// 定时任务
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("appendHistory", { periodInMinutes: 60 });
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "appendHistory") appendNewHistoryToFile();
});

// popup 手动按钮
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.action === "manualAppend") {
    appendNewHistoryToFile().then(() => sendResponse({ok:true}));
    return true;
  }
  if (msg.action === "search") {
    chrome.history.search({text: msg.query, maxResults: 100}, results => {
      sendResponse({results});
    });
    return true;
  }
});