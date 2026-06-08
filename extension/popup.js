document.getElementById('clip-btn').addEventListener('click', async () => {
  const btn = document.getElementById('clip-btn');
  const statusBox = document.getElementById('status-box');

  statusBox.className = 'status loading';
  statusBox.textContent = 'Extracting HTML and submitting...';
  btn.disabled = true;

  try {
    // 1. Query the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      throw new Error('No active browser tab found.');
    }

    // 2. Execute scripting helper inside the active page to grab current DOM source code
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.outerHTML,
    });

    if (!results || !results[0]) {
      throw new Error('Could not access HTML content on this page.');
    }

    const pageHtml = results[0].result;

    // 3. POST the payload to our Next.js API route
    const response = await fetch('http://localhost:3000/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: tab.url,
        raw_html: pageHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    statusBox.className = 'status success';
    statusBox.textContent = `Success! Saved as: ${data.decision.toUpperCase()}`;
  } catch (err) {
    statusBox.className = 'status error';
    statusBox.textContent = err.message || 'Scrape request failed.';
  } finally {
    btn.disabled = false;
  }
});
