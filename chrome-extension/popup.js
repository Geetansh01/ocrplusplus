document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById('resumeUpload');
  const extractButton = document.getElementById("extractButton");
  const confirmFill = document.getElementById("confirmFill");
  const previewSection = document.getElementById('previewSection');
  const entityPreview = document.getElementById('entityPreview');
  const status = document.getElementById('status');

  const pdfjsLib = window['pdfjsLib'] || {};
  pdfjsLib.GlobalWorkerOptions = {
    workerSrc: chrome.runtime.getURL('pdf.worker.min.js')
  };

  previewSection.classList.add('hidden');

  extractButton.addEventListener("click", handleFileUpload);
  confirmFill.addEventListener("click", fillForm);

  // Prevent default drag behaviors
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over it
  ["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, unhighlight, false);
  });

  // Handle dropped files
  dropArea.addEventListener("drop", handleDrop, false);

  // Handle file input changes (when user selects file through dialog)
  fileInput.addEventListener("change", handleFiles, false);

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    dropArea.classList.add("highlight");
  }

  function unhighlight() {
    dropArea.classList.remove("highlight");
  }

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      fileInput.files = files;
      handleFiles({ target: { fileInput } });
    }
  }

  function handleFiles(e) {
    const files = e.target.files;

    if (files.length) {
      const file = files[0];
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        document.querySelector(
          "#img-view p"
        ).textContent = `Selected: ${file.name}`;
        extractTextFromFile(file);
      } else if (
        file.type === "text/plain" ||
        file.name.toLowerCase().endsWith(".txt")
      ) {
        readTextFile(file);
      } else {
        alert("Please select a text file or pdf file.");
      }
    }
  }

  async function handleFileUpload() {
    const fileInput = document.getElementById('resumeUpload');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('Please upload a resume file.');
      return;
    }

    status.textContent = 'Extracting entities...';
    
    try {
      const resumeText = await extractTextFromFile(file);
      await sendTextToBackend(resumeText);
    } catch (error) {
      console.error('Error:', error);
      status.textContent = `Error: ${error.message || 'Processing failed'}`;
    }
  }

  async function extractTextFromFile(file) {
    if (file.type === 'text/plain') {
      return readTextFile(file);
    } else if (file.type === 'application/pdf') {
      return extractTextFromPDF(file);
    }
    throw new Error('Unsupported file type');
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  async function extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ');
          }
          resolve(text);
        } catch (error) {
          reject(new Error(`PDF extraction failed: ${error.message}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read PDF'));
      reader.readAsArrayBuffer(file);
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