import { useEffect } from 'react';

/**
 * React hook to re-render MathJax when dependencies change.
 * 
 * @param {any[]} deps - Dependencies that trigger re-typesetting.
 * @param {HTMLElement | string} [element] - Optional element or selector to scope MathJax rendering.
 */
export const useMathJax = (deps = [], element) => {
  useEffect(() => {
    let cancelled = false;

    const renderMath = () => {
      if (!window.MathJax?.typesetPromise) return;
      
      const target =
        typeof element === 'string'
          ? document.querySelector(element)
          : element || document.body;

      // Clear old render if supported (prevents stale renders)
      if (window.MathJax.typesetClear) {
        window.MathJax.typesetClear([target]);
      }

      // Render math in the target element
      window.MathJax.typesetPromise([target]).catch((err) => {
        if (!cancelled) console.error('MathJax typeset error:', err);
      });
    };

    // If MathJax is already loaded, render immediately
    if (window.MathJax && window.MathJax.typesetPromise) {
      renderMath();
    } else if (window.MathJaxReady) {
      // Legacy check for existing setup
      renderMath();
    } else {
      // Auto-detect when MathJax becomes available
      const checkMathJax = () => {
        if (cancelled) return;
        
        if (window.MathJax?.typesetPromise || window.MathJaxReady) {
          renderMath();
        } else {
          // Use requestAnimationFrame for efficient polling fallback
          requestAnimationFrame(checkMathJax);
        }
      };

      // Listen for custom event first (if available)
      const handleReady = () => !cancelled && renderMath();
      document.addEventListener('mathjax:ready', handleReady);

      // Start checking for MathJax availability
      checkMathJax();

      return () => {
        cancelled = true;
        document.removeEventListener('mathjax:ready', handleReady);
      };
    }

    return () => {
      cancelled = true;
    };
  }, deps);
};

export default useMathJax;