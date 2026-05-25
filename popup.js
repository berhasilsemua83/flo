// Inject default settings from web app exported state
const defaults = {"generationMode":"textToVideo","aiModel":"veo-3.1-quality","aspectRatio":"16:9","batchQueue":"","concurrentPrompts":1,"promptDelayMin":2,"promptDelayMax":5,"maxRetries":3,"concatMode":false,"imageUploadBase64":true,"autoMatchCharacter":true,"autoAddSpeaker":false,"maxImagesPerPrompt":5,"autoDownloadQuality":"1080","folderNamingRule":"YYYY-MM-DD_Batch","autoRenameFiles":true};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generationMode').value = defaults.generationMode;
  document.getElementById('aiModel').value = defaults.aiModel;
  document.getElementById('aspectRatio').value = defaults.aspectRatio || '16:9';
  document.getElementById('batchQueue').value = defaults.batchQueue;
  document.getElementById('promptDelayMin').value = defaults.promptDelayMin;
  document.getElementById('promptDelayMax').value = defaults.promptDelayMax;
  document.getElementById('maxRetries').value = defaults.maxRetries;
  document.getElementById('concurrentPrompts').value = defaults.concurrentPrompts;
  document.getElementById('autoMatchCharacter').checked = defaults.autoMatchCharacter;
  document.getElementById('concatMode').checked = defaults.concatMode;
  document.getElementById('autoDownloadQuality').value = defaults.autoDownloadQuality;
  document.getElementById('folderNamingRule').value = defaults.folderNamingRule;

  document.getElementById('startBtn').addEventListener('click', async () => {
    const startBtn = document.getElementById('startBtn');
    startBtn.disabled = true;
    startBtn.innerText = 'Sending...';

    const currentSettings = {
      generationMode: document.getElementById('generationMode').value,
      aiModel: document.getElementById('aiModel').value,
      aspectRatio: document.getElementById('aspectRatio').value,
      batchQueue: document.getElementById('batchQueue').value,
      promptDelayMin: parseFloat(document.getElementById('promptDelayMin').value) || 2,
      promptDelayMax: parseFloat(document.getElementById('promptDelayMax').value) || 5,
      maxRetries: parseInt(document.getElementById('maxRetries').value) || 0,
      concurrentPrompts: parseInt(document.getElementById('concurrentPrompts').value) || 1,
      autoMatchCharacter: document.getElementById('autoMatchCharacter').checked,
      concatMode: document.getElementById('concatMode').checked,
      autoDownloadQuality: document.getElementById('autoDownloadQuality').value,
      folderNamingRule: document.getElementById('folderNamingRule').value,
    };

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('labs.google')) {
        await chrome.tabs.sendMessage(tab.id, { action: 'START_AUTOMATION', settings: currentSettings });
        document.getElementById('statusMsg').innerText = 'Automation started in page!';
        document.getElementById('statusMsg').style.color = '#34d399';
      } else {
        document.getElementById('statusMsg').innerText = 'Please open labs.google first.';
        document.getElementById('statusMsg').style.color = '#f87171';
      }
    } catch (e) {
      // Content script might not be injected yet if the page wasn't refreshed after install
      console.error("Injection error:", e);
      document.getElementById('statusMsg').innerText = 'Error: Please refresh the labs.google tab!';
      document.getElementById('statusMsg').style.color = '#fbbf24';
    } finally {
      setTimeout(() => {
        startBtn.disabled = false;
        startBtn.innerText = 'Start Automation';
      }, 1000);
    }
  });
});