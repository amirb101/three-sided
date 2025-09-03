// AI-related handlers for autofill and LaTeX conversion
function createAIHandlers(dependencies) {
  const { auth, analytics, uiRenderer, createDeepSeekService } = dependencies;

  // Enhanced error display function
  function showError(message, details = null) {
    // If you have a toast/notification system, use it instead of alert
    if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      alert(message);
    }
    
    // Log detailed error for debugging
    if (details) {
      console.error('AI Handler Error:', details);
    }
  }

  // Enhanced error handler for AI operations
  function handleAIError(error, operation) {
    console.error(`${operation} error:`, error);
    
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return showError(
        '🌐 Connection failed. Please check your internet connection and try again.',
        error
      );
    }
    
    // Rate limiting (already handled well)
    if (error.message.includes('🚫 Limit reached')) {
      return showError(error.message, error);
    }
    
    // Authentication errors
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return showError(
        '🔐 Authentication failed. Please sign in again and try.',
        error
      );
    }
    
    // Server errors
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return showError(
        '⚠️ Server temporarily unavailable. Please try again in a few minutes.',
        error
      );
    }
    
    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return showError(
        '⏱️ Request timed out. The AI service may be busy - please try again.',
        error
      );
    }
    
    // Invalid input errors
    if (error.message.includes('invalid') || error.message.includes('malformed')) {
      return showError(
        '📝 Invalid input detected. Please check your mathematical statement and try again.',
        error
      );
    }
    
    // Quota/billing errors
    if (error.message.includes('quota') || error.message.includes('billing')) {
      return showError(
        '💳 Service quota exceeded. Please contact support if this continues.',
        error
      );
    }
    
    // Generic fallback with more helpful message
    return showError(
      `❌ ${operation} failed. ${error.message || 'Please try again or contact support if the problem persists.'}`,
      error
    );
  }

  // Auto-fill hints, proof, and tags from statement
  async function autoFillFromStatement() {
    const statement = document.getElementById("newStatement").value.trim();
    if (!statement) {
      return showError("📝 Please enter a mathematical statement first.");
    }

    if (statement.length < 10) {
      return showError("📝 Please enter a more detailed mathematical statement (at least 10 characters).");
    }

    analytics.logEvent('autofill_triggered', {
      statement_length: statement.length
    });

    const hintsEl = document.getElementById("newHints");
    const proofEl = document.getElementById("newProof");
    const tagsEl = document.getElementById("newTags");

    try {
      uiRenderer.showLoading("🤖 AI is analyzing your statement...");

      let idToken = null;
      if (auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken(true);
        } catch (authError) {
          throw new Error('Authentication failed. Please sign in again.');
        }
      }
      
      const deepSeekService = createDeepSeekService(idToken);
      const data = await deepSeekService.autoFill(statement);

      // Validate response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from AI service');
      }

      hintsEl.value = data.hints || "";
      proofEl.value = data.proof || "";
      tagsEl.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";

      // Show success message if you have a toast system
      if (window.showToast) {
        window.showToast("✅ Auto-fill completed successfully!", 'success');
      }

      // Re-render LaTeX
      if (window.MathJax) {
        try {
          await MathJax.typesetPromise([hintsEl, proofEl]);
        } catch (mathjaxError) {
          console.warn('MathJax rendering failed:', mathjaxError);
          // Don't show error to user as content was still filled
        }
      }
    } catch (err) {
      handleAIError(err, "Auto-fill");
    } finally {
      uiRenderer.hideLoading();
    }
  }

  // Auto-tag only (no hints/proof)
  async function autoTagOnly() {
    const statement = document.getElementById("newStatement").value.trim();
    if (!statement) {
      return showError("📝 Please enter a mathematical statement first.");
    }

    if (statement.length < 5) {
      return showError("📝 Please enter a more detailed statement for better tag suggestions.");
    }

    analytics.logEvent('autotag_triggered', {
      statement_length: statement.length
    });

    const tagsEl = document.getElementById("newTags");

    try {
      uiRenderer.showLoading("🏷️ AI is generating tags...");

      let idToken = null;
      if (auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken(true);
        } catch (authError) {
          throw new Error('Authentication failed. Please sign in again.');
        }
      }
      
      const deepSeekService = createDeepSeekService(idToken);
      const data = await deepSeekService.autoTag(statement);

      // Validate response data
      if (!data || !data.tags) {
        throw new Error('No tags generated. Please try with a different statement.');
      }

      tagsEl.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";

      // Show success message
      if (window.showToast) {
        const tagCount = Array.isArray(data.tags) ? data.tags.length : 0;
        window.showToast(`✅ Generated ${tagCount} tag${tagCount !== 1 ? 's' : ''}!`, 'success');
      }
    } catch (err) {
      handleAIError(err, "Auto-tag");
    } finally {
      uiRenderer.hideLoading();
    }
  }

  // Convert natural language to LaTeX
  async function convertToLatex() {
    const input = document.getElementById("naturalLangInput").value.trim();
    if (!input) {
      return showError("📝 Please enter a mathematical expression to convert.");
    }

    if (input.length < 3) {
      return showError("📝 Please enter a more detailed mathematical expression.");
    }
    
    const outputEl = document.getElementById("latexOutput");
    outputEl.innerText = "🤖 Converting to LaTeX...";

    try {
      let idToken = null;
      if (auth.currentUser) {
        try {
          idToken = await auth.currentUser.getIdToken(true);
        } catch (authError) {
          throw new Error('Authentication failed. Please sign in again.');
        }
      }
      
      const deepSeekService = createDeepSeekService(idToken);
      const data = await deepSeekService.convertToLatex(input);

      // Validate response
      if (!data || !data.latex) {
        throw new Error('Could not convert to LaTeX. Please try rephrasing your expression.');
      }

      outputEl.innerText = data.latex;
      
      // Copy to clipboard with error handling
      try {
        await navigator.clipboard.writeText(data.latex);
        if (window.showToast) {
          window.showToast("📋 LaTeX copied to clipboard!", 'success');
        }
      } catch (clipboardError) {
        console.warn('Clipboard access failed:', clipboardError);
        if (window.showToast) {
          window.showToast("✅ LaTeX generated! (Clipboard access unavailable)", 'info');
        }
      }
      
      // Re-render LaTeX
      if (window.MathJax) {
        try {
          await MathJax.typesetPromise([outputEl]);
        } catch (mathjaxError) {
          console.warn('MathJax rendering failed:', mathjaxError);
          // Don't show error as LaTeX was still generated
        }
      }
    } catch (err) {
      outputEl.innerText = "❌ Conversion failed. Please try again.";
      handleAIError(err, "LaTeX conversion");
    }
  }

  return {
    autoFillFromStatement,
    autoTagOnly,
    convertToLatex
  };
}
