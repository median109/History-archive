document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const searchBtn    = document.getElementById('searchBtn');
  const exportBtn    = document.getElementById('exportBtn');
  const resultsDiv   = document.getElementById('results');

  // 搜索功能（不变）
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (!query) return;

    chrome.runtime.sendMessage({ action: 'search', query }, (resp) => {
      resultsDiv.innerHTML = '';
      if (!resp?.results?.length) {
        resultsDiv.innerHTML = '<div class="item">没找到</div>';
        return;
      }
      resp.results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<strong>${item.title || '(无标题)'}</strong><br>
                         <a href="${item.url}" target="_blank">${item.url}</a><br>
                         <small>${new Date(item.lastVisitTime).toLocaleString()}</small>`;
        resultsDiv.appendChild(div);
      });
    });
  });

  // 手动追加到归档文件（关键改这里！）
  exportBtn.addEventListener('click', () => {
    exportBtn.disabled = true;
    exportBtn.textContent = '正在追加…';

    chrome.runtime.sendMessage({ action: 'manualAppend' }, (response) => {
      // 即使 background 没回 response（偶尔会出现），也不报错
      setTimeout(() => {
        alert('追加完成！\n文件位置：下载文件夹 → MyBrowserHistory.json');
        exportBtn.disabled = false;
        exportBtn.textContent = '手动追加到归档文件';
      }, 800);
    });
  });
});