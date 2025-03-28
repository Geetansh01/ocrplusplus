document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('extractButton').addEventListener('click', async () => {
    const fileInput = document.getElementById('resumeUpload');
    const file = fileInput.files[0];
    if (!file) {
      alert('Please upload a resume file.');
      return;
    }

    console.log('File type:', file.type);
    console.log('File name:', file.name);

    const status = document.getElementById('status');
    status.textContent = 'Extracting entities...';

    let resumeText = '';
    try {
      if (file.type === 'text/plain') {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
          resumeText = event.target.result;
          console.log('Extracted text from TXT:', resumeText); 
          sendTextToBackend(resumeText);
        };
        fileReader.readAsText(file);
      } else {
        alert('Unsupported file type. Please upload TXT file.');
        return;
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      status.textContent = 'Failed to extract text.';
    }
  });

  async function sendTextToBackend(text) {
    const status = document.getElementById('status');
    status.textContent = 'Extracting entities...';

    try {
      const response = await fetch('http://127.0.0.1:5000/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract entities. Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Extracted entities:', data);

      // Store the extracted entities in Chrome storage
      chrome.storage.local.set({ entities: data }, () => {
        status.textContent = 'Entities extracted and stored!';
      });
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Failed to extract entities.';
    }
  }
});

