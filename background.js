chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_GENERATION') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false
    });
  }
});