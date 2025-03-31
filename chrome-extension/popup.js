document.addEventListener('DOMContentLoaded', () => {
  const previewSection = document.getElementById('previewSection');
  const entityPreview = document.getElementById('entityPreview');
  const status = document.getElementById('status');

  previewSection.classList.add('hidden');

  document.getElementById('extractButton').addEventListener('click', handleFileUpload);
  document.getElementById('confirmFill').addEventListener('click', fillForm);

  async function handleFileUpload() {
    const fileInput = document.getElementById('resumeUpload');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please upload a resume file.');
      return;
    }

    status.textContent = 'Extracting entities...';
    
    try {
      const resumeText = await readFile(file);
      await sendTextToBackend(resumeText);
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error processing file.';
    }
  }

  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = reject;
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        // PDF reading not implemented yet
        reject(new Error('PDF support not implemented yet'));
      } else {
        reject(new Error('Unsupported file type'));
      }
    });
  }

  async function sendTextToBackend(text) {
    try {
      const response = await fetch('http://127.0.0.1:5000/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      chrome.storage.local.set({ entities: data }, () => {
        status.textContent = 'Entities extracted!';
        showEntityPreview(data.raw);
      });
    } catch (error) {
      console.error('Fetch error:', error);
      status.textContent = 'Failed to extract entities.';
    }
  }

  function showEntityPreview(entities) {
    entityPreview.innerHTML = '';
    
    const grouped = entities.reduce((acc, entity) => {
      if (!acc[entity.entity]) acc[entity.entity] = [];
      acc[entity.entity].push(entity.text);
      return acc;
    }, {});

    // Create preview elements
    for (const [type, values] of Object.entries(grouped)) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'entity-group';
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'entity-type';
      typeSpan.textContent = `${type}: `;
      
      const valueSpan = document.createElement('span');
      valueSpan.textContent = values.join(', ');
      
      groupDiv.appendChild(typeSpan);
      groupDiv.appendChild(valueSpan);
      entityPreview.appendChild(groupDiv);
    }

    // Show the preview section
    previewSection.classList.remove('hidden');
  }

  async function fillForm() {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    if (!tab.url || tab.url.startsWith('chrome://')) {
      status.textContent = 'Cannot fill forms on this page';
      return;
    }
    
    try {
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ['content.js']
      });
      
      chrome.tabs.sendMessage(tab.id, {action: 'fillForm'}, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Error: Content script not responding';
          console.error(chrome.runtime.lastError);
        } else {
          status.textContent = 'Form fill attempted! Check console for details.';
        }
      });
    } catch (error) {
      console.error('Error executing script:', error);
      status.textContent = 'Error filling form.';
    }
  }
});