console.log("Flow Automator Content Script Injected.");

let currentSettings = null;
let isRunning = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_AUTOMATION') {
    currentSettings = request.settings;
    if (!isRunning) {
      console.log("Starting automation with settings:", currentSettings);
      startQueue();
    }
  }
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min, max) {
  return Math.random() * (max - min) + min;
}

// Automatically find and fill the prompt input
async function setPromptText(text) {
  // Look for textareas or contenteditable divs that might be the prompt box
  const textareas = Array.from(document.querySelectorAll('textarea'));
  const editables = Array.from(document.querySelectorAll('[contenteditable="true"], [role="textbox"]'));
  
  // Prioritize elements that are large or have placeholder containing 'prompt' or 'describe'
  let promptBox = textareas.find(t => t.placeholder && (t.placeholder.toLowerCase().includes('prompt') || t.placeholder.toLowerCase().includes('describe'))) || textareas[0];
  
  if (!promptBox) {
    promptBox = editables.find(e => {
        const ph = e.getAttribute('placeholder') || e.getAttribute('aria-label') || '';
        return ph.toLowerCase().includes('prompt') || ph.toLowerCase().includes('describe');
    }) || editables[0];
  }

  if (promptBox) {
    promptBox.focus();
    if (promptBox.tagName === 'TEXTAREA' || promptBox.tagName === 'INPUT') {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(promptBox, text);
      } else {
        promptBox.value = text;
      }
    } else {
      promptBox.textContent = text;
    }
    promptBox.dispatchEvent(new Event('input', { bubbles: true }));
    promptBox.dispatchEvent(new Event('change', { bubbles: true }));
    // Try React 16+ specific synthetic events workaround if needed
    const event = new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text });
    promptBox.dispatchEvent(event);
    return true;
  }
  console.warn("Automator failed: Could not find prompt input box on this page.");
  return false;
}

// Automatically find and click the aspect ratio
async function setAspectRatio(ratio) {
  if (!ratio) return true;
  console.log("Setting aspect ratio to " + ratio);
  
  // Try to find a button with the ratio text (e.g. "16:9")
  const buttons = Array.from(document.querySelectorAll('button, div[role="button"], div[role="radio"], div[role="option"]'));
  const ratioBtn = buttons.find(b => {
    const text = (b.textContent || '').trim();
    return text === ratio || text.includes(ratio);
  });
  
  if (ratioBtn) {
    if (ratioBtn.getAttribute('aria-checked') === 'true') {
      console.log("Aspect ratio " + ratio + " already selected");
      return true;
    }
    ratioBtn.click();
    console.log("Clicked aspect ratio " + ratio);
    return true;
  }
  
  console.warn("Could not find aspect ratio button for " + ratio);
  return false;
}

// Automatically find and click the generate button
async function clickGenerate() {
  const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
  const genBtn = buttons.find(b => {
    const text = (b.textContent || '').toLowerCase().trim();
    return text === 'generate' || text === 'create' || text === 'run' || text.includes('generate video') || text.includes('generate image');
  });
  
  if (genBtn && !genBtn.disabled) {
    genBtn.click();
    return true;
  }
  console.warn("Automator failed: Could not find a 'Generate' or 'Create' button.");
  return false;
}

async function startQueue() {
  isRunning = true;
  // Parse by '===' to support complex multiline prompts
  const queue = currentSettings.batchQueue.split('===').map(p => p.trim()).filter(p => p !== '');
  
  if (queue.length === 0) {
    alert("Empty Prompt Queue! Please add prompts in the extension popup.");
    isRunning = false;
    return;
  }

  console.log(`Starting ${currentSettings.generationMode} using ${currentSettings.aiModel} for ${queue.length} prompts.`);

  for (let i = 0; i < queue.length; i += currentSettings.concurrentPrompts) {
    const batch = queue.slice(i, i + currentSettings.concurrentPrompts);
    console.log(`Processing batch: `, batch);

    for (const prompt of batch) {
      // Parse @filename tags for image matching
      const imageRefs = prompt.match(/@([a-zA-Z0-9_-]+)/g) || [];
      const cleanPrompt = prompt.replace(/@([a-zA-Z0-9_-]+)/g, '').trim();
      
      console.log(`Typing prompt: "${cleanPrompt}"`);
      const textWasSet = await setPromptText(cleanPrompt);
      if (!textWasSet) {
        console.error("Stopping batch, cannot find input field.");
        alert("Automator failed: Cannot find the text prompt input box. Ensure you are on the right Google Flow page.");
        break;
      }
      
      if (imageRefs.length > 0 && currentSettings.autoMatchCharacter) {
         console.log("Selecting image references: " + imageRefs.join(', '));
         // TODO: Select DOM images based on matching filename strings
      }
      
      // Wait a moment before pressing Generate to allow UI states to settle
      await sleep(500);

      if (currentSettings.aspectRatio) {
        await setAspectRatio(currentSettings.aspectRatio);
        await sleep(500);
      }
      
      console.log("Clicking Generate...");
      await clickGenerate();

      let delaySeconds = getRandomDelay(currentSettings.promptDelayMin, currentSettings.promptDelayMax);
      console.log(`Waiting ${delaySeconds.toFixed(1)} seconds...`);
      await sleep(delaySeconds * 1000);
      
      if (currentSettings.autoDownloadQuality !== 'none') {
         const filename = currentSettings.folderNamingRule 
             ? `${currentSettings.folderNamingRule}/gen_${i}_${currentSettings.autoDownloadQuality}.mp4`
             : 'generation.mp4';
             
         console.log(`Triggering download: ${filename}`);
      }
    }
  }
  
  console.log("Automation Complete!");
  isRunning = false;
}