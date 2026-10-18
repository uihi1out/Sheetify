
function unwrapGoogleUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if ((parsed.hostname === 'www.google.com' || parsed.hostname === 'google.com') && parsed.pathname === '/url') {
      const q = parsed.searchParams.get('q');
      if (q) return unwrapGoogleUrl(decodeURIComponent(q));
    }
  } catch {}
  return url;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'FETCH_AUDIO' && message?.url) {
    const targetUrl = unwrapGoogleUrl(message.url);
    fetch(targetUrl)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const contentType = (resp.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() || 'audio/wav';
        return resp.arrayBuffer().then((buffer) => ({ buffer, contentType }));
      })
      .then(({ buffer, contentType }) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 32768;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);
        sendResponse({ ok: true, data: base64, contentType });
      })
      .catch((e) => {
        sendResponse({ ok: false, error: String(e) });
      });
    return true;
  }

  if (message?.type === 'DOWNLOAD_AUDIO' && message?.url) {
    const url = unwrapGoogleUrl(message.url);
    chrome.downloads.download({ url, saveAs: false }, () => {
      void chrome.runtime.lastError;
    });
    return false;
  }
});

