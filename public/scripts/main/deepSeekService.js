
function createDeepSeekService(idToken = null) {
  // Add timeout to requests
  const REQUEST_TIMEOUT = 60000; // 30 seconds

  async function handleResponse(res) {
    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      throw new Error('Invalid response from server. Please try again.');
    }

    if (res.status === 429) {
      const retryMs = data.retryAfter || 60000; // Default 1 minute if not specified
      const minutes = Math.floor(retryMs / 60000);
      const seconds = Math.floor((retryMs % 60000) / 1000);
      throw new Error(`🚫 Rate limit reached.\nPlease wait ${minutes}:${seconds.toString().padStart(2, '0')} before trying again.`);
    }

    if (res.status === 401) {
      throw new Error('Authentication failed. Please sign in again.');
    }

    if (res.status === 403) {
      throw new Error('Access denied. Please check your permissions.');
    }

    if (res.status === 500) {
      throw new Error('Server error. Please try again in a few minutes.');
    }

    if (res.status === 502 || res.status === 503) {
      throw new Error('Service temporarily unavailable. Please try again shortly.');
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    if (typeof data !== 'object') {
      throw new Error('Invalid response format from server.');
    }

    return data;
  }

  async function makePost(url, payload) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (idToken) {
      headers["Authorization"] = `Bearer ${idToken}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return handleResponse(res);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The service may be busy - please try again.');
      }
      
      throw error;
    }
  }

  return {
    autoFill(statement) {
      return makePost(
        "https://us-central1-three-sided-flashcard-app.cloudfunctions.net/deepseekAutofill",
        { statement }
      );
    },

    autoTag(statement) {
      return makePost(
        "https://us-central1-three-sided-flashcard-app.cloudfunctions.net/autoTagOnly",
        { statement }
      );
    },

    convertToLatex(input) {
      return makePost(
        "https://us-central1-three-sided-flashcard-app.cloudfunctions.net/convertToLatex",
        { input }
      );
    }
  };
}