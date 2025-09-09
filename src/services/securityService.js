/**
 * Comprehensive Security Service for Three-Sided App
 * Handles input validation, sanitization, and security monitoring
 */

export class SecurityService {
  // ==========================================
  // INPUT VALIDATION & SANITIZATION
  // ==========================================

  /**
   * Comprehensive input sanitization
   */
  static sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') return '';
    
    const {
      maxLength = 10000,
      allowHtml = false,
      allowLatex = true,
      stripScripts = true,
      stripUrls = false
    } = options;

    let sanitized = input;

    // Length validation
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    // Remove dangerous HTML/JavaScript if not allowing HTML
    if (!allowHtml || stripScripts) {
      // Remove script tags and their contents
      sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
      
      // Remove inline event handlers
      sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      
      // Remove javascript: URLs
      sanitized = sanitized.replace(/javascript:/gi, '');
      
      // Remove data: URLs (except images if allowing HTML)
      if (!allowHtml) {
        sanitized = sanitized.replace(/data:/gi, '');
      }
      
      // Remove dangerous HTML tags
      const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'];
      dangerousTags.forEach(tag => {
        const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, 'gi');
        sanitized = sanitized.replace(regex, '');
        const selfClosingRegex = new RegExp(`<${tag}[^>]*\/?>`, 'gi');
        sanitized = sanitized.replace(selfClosingRegex, '');
      });
    }

    // Remove suspicious URLs if requested
    if (stripUrls) {
      sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, '[URL_REMOVED]');
    }

    // Preserve LaTeX formatting if allowed
    if (allowLatex) {
      // LaTeX is generally safe as it's mathematical notation
      // But we should still validate common patterns
      // LaTeX injection is rare but possible, so we'll allow common math notation
    }

    return sanitized.trim();
  }

  /**
   * Validate flashcard content
   */
  static validateFlashcardInput(data) {
    const errors = [];
    const sanitizedData = {};

    // Validate statement
    if (!data.statement || typeof data.statement !== 'string') {
      errors.push('Statement is required and must be text');
    } else if (data.statement.length < 3) {
      errors.push('Statement must be at least 3 characters long');
    } else if (data.statement.length > 5000) {
      errors.push('Statement must be less than 5000 characters');
    } else {
      sanitizedData.statement = this.sanitizeInput(data.statement, {
        maxLength: 5000,
        allowLatex: true,
        allowHtml: false
      });
    }

    // Validate hints
    if (data.hints && typeof data.hints === 'string') {
      if (data.hints.length > 5000) {
        errors.push('Hints must be less than 5000 characters');
      } else {
        sanitizedData.hints = this.sanitizeInput(data.hints, {
          maxLength: 5000,
          allowLatex: true,
          allowHtml: false
        });
      }
    }

    // Validate proof
    if (data.proof && typeof data.proof === 'string') {
      if (data.proof.length > 10000) {
        errors.push('Proof must be less than 10000 characters');
      } else {
        sanitizedData.proof = this.sanitizeInput(data.proof, {
          maxLength: 10000,
          allowLatex: true,
          allowHtml: false
        });
      }
    }

    // Validate tags
    if (data.tags) {
      if (typeof data.tags === 'string') {
        const tagArray = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tagArray.length > 20) {
          errors.push('Maximum 20 tags allowed');
        }
        sanitizedData.tags = tagArray.map(tag => this.sanitizeInput(tag, {
          maxLength: 50,
          allowLatex: false,
          allowHtml: false
        })).filter(tag => tag && /^[a-zA-Z0-9\s\-_]+$/.test(tag));
      } else if (Array.isArray(data.tags)) {
        if (data.tags.length > 20) {
          errors.push('Maximum 20 tags allowed');
        }
        sanitizedData.tags = data.tags.slice(0, 20).map(tag => this.sanitizeInput(String(tag), {
          maxLength: 50,
          allowLatex: false,
          allowHtml: false
        })).filter(tag => tag && /^[a-zA-Z0-9\s\-_]+$/.test(tag));
      }
    }

    // Validate subject
    if (data.subject && typeof data.subject === 'string') {
      if (data.subject.length > 100) {
        errors.push('Subject must be less than 100 characters');
      } else {
        sanitizedData.subject = this.sanitizeInput(data.subject, {
          maxLength: 100,
          allowLatex: false,
          allowHtml: false
        });
      }
    }

    // Validate boolean fields
    sanitizedData.isPublic = Boolean(data.isPublic);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : null
    };
  }

  /**
   * Validate profile input
   */
  static validateProfileInput(data) {
    const errors = [];
    const sanitizedData = {};

    // Validate display name
    if (!data.displayName || typeof data.displayName !== 'string') {
      errors.push('Display name is required');
    } else if (data.displayName.length < 2) {
      errors.push('Display name must be at least 2 characters');
    } else if (data.displayName.length > 50) {
      errors.push('Display name must be less than 50 characters');
    } else if (!/^[a-zA-Z0-9\s\-_\.]+$/.test(data.displayName)) {
      errors.push('Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods');
    } else {
      sanitizedData.displayName = this.sanitizeInput(data.displayName, {
        maxLength: 50,
        allowLatex: false,
        allowHtml: false
      });
    }

    // Validate bio
    if (data.bio && typeof data.bio === 'string') {
      if (data.bio.length > 500) {
        errors.push('Bio must be less than 500 characters');
      } else {
        sanitizedData.bio = this.sanitizeInput(data.bio, {
          maxLength: 500,
          allowLatex: false,
          allowHtml: false
        });
      }
    }

    // Validate subject
    if (data.subject && typeof data.subject === 'string') {
      if (data.subject.length > 100) {
        errors.push('Subject must be less than 100 characters');
      } else {
        sanitizedData.subject = this.sanitizeInput(data.subject, {
          maxLength: 100,
          allowLatex: false,
          allowHtml: false
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : null
    };
  }

  // ==========================================
  // RATE LIMITING
  // ==========================================

  /**
   * Client-side rate limiting
   */
  static rateLimiter = new Map();

  static checkRateLimit(key, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const userRequests = this.rateLimiter.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= limit) {
      return {
        allowed: false,
        retryAfter: windowMs - (now - validRequests[0]),
        message: `Rate limit exceeded. Try again in ${Math.ceil((windowMs - (now - validRequests[0])) / 1000)} seconds.`
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimiter.set(key, validRequests);
    
    return {
      allowed: true,
      remaining: limit - validRequests.length
    };
  }

  // ==========================================
  // ERROR HANDLING
  // ==========================================

  /**
   * Get production-safe error message
   */
  static getPublicErrorMessage(error, isProduction = true) {
    if (!isProduction) {
      return error.message || 'Unknown error';
    }

    const publicErrors = {
      // Auth errors
      'auth/user-not-found': 'Invalid email or password',
      'auth/wrong-password': 'Invalid email or password',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/user-disabled': 'This account has been disabled',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection',
      'auth/popup-closed-by-user': 'Sign-in was cancelled',
      'auth/popup-blocked': 'Sign-in popup was blocked. Please disable popup blockers',

      // Firestore errors
      'permission-denied': 'You don\'t have permission to perform this action',
      'not-found': 'The requested item was not found',
      'already-exists': 'This item already exists',
      'resource-exhausted': 'Service temporarily unavailable. Please try again',
      'failed-precondition': 'Unable to complete request. Please try again',
      'aborted': 'Request was cancelled. Please try again',
      'out-of-range': 'Request parameters are invalid',
      'unimplemented': 'This feature is not yet available',
      'internal': 'Internal error. Please try again',
      'unavailable': 'Service temporarily unavailable. Please try again',
      'data-loss': 'Data error occurred. Please contact support',

      // Functions errors
      'functions/invalid-argument': 'Invalid request parameters',
      'functions/failed-precondition': 'Unable to process request',
      'functions/out-of-range': 'Request parameters are out of range',
      'functions/unauthenticated': 'Please sign in to continue',
      'functions/permission-denied': 'You don\'t have permission for this action',
      'functions/not-found': 'Requested service not found',
      'functions/already-exists': 'Resource already exists',
      'functions/resource-exhausted': 'Service limit reached. Please try again later',
      'functions/cancelled': 'Request was cancelled',
      'functions/unknown': 'An unexpected error occurred',
      'functions/deadline-exceeded': 'Request timed out. Please try again',

      // Custom app errors
      'validation-error': 'Please check your input and try again',
      'rate-limit-exceeded': 'Too many requests. Please wait and try again',
      'content-too-long': 'Content is too long. Please shorten and try again',
      'invalid-content': 'Content contains invalid characters',
      'network-error': 'Network error. Please check your connection'
    };

    const errorCode = error.code || error.name || 'unknown';
    return publicErrors[errorCode] || 'Something went wrong. Please try again';
  }

  // ==========================================
  // SESSION SECURITY
  // ==========================================

  /**
   * Session timeout management
   */
  static INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes (1 hour)
  static lastActivity = Date.now();
  static timeoutWarningShown = false;

  static updateActivity() {
    this.lastActivity = Date.now();
    this.timeoutWarningShown = false;
  }

  static checkInactivity(onWarning, onTimeout) {
    const inactiveTime = Date.now() - this.lastActivity;
    
    // Show warning at 50 minutes (83% of 60 minutes)
    if (inactiveTime > this.INACTIVITY_TIMEOUT * 0.83 && !this.timeoutWarningShown) {
      this.timeoutWarningShown = true;
      onWarning && onWarning();
    }
    
    // Timeout at 60 minutes
    if (inactiveTime > this.INACTIVITY_TIMEOUT) {
      onTimeout && onTimeout();
      return true;
    }
    
    return false;
  }

  static setupActivityTracking(onWarning, onTimeout) {
    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, this.updateActivity.bind(this), { passive: true });
    });

    // Check inactivity every minute
    setInterval(() => {
      this.checkInactivity(onWarning, onTimeout);
    }, 60000);
  }

  // ==========================================
  // CONTENT SECURITY
  // ==========================================

  /**
   * Detect potentially malicious content
   */
  static detectSuspiciousContent(content) {
    const suspiciousPatterns = [
      // XSS patterns
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      
      // SQL injection patterns (though not applicable to Firestore)
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      
      // Suspicious URLs
      /data:text\/html/gi,
      /data:application/gi,
      
      // Suspicious characters
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
    ];

    const findings = [];
    suspiciousPatterns.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          pattern: index,
          matches: matches.length,
          content: matches[0]
        });
      }
    });

    return {
      isSuspicious: findings.length > 0,
      findings
    };
  }

  // ==========================================
  // CRYPTOGRAPHIC UTILITIES
  // ==========================================

  /**
   * Generate secure random string
   */
  static generateSecureId(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomArray = new Uint8Array(length);
    crypto.getRandomValues(randomArray);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomArray[i] % chars.length];
    }
    
    return result;
  }

  /**
   * Hash sensitive data for logging (one-way)
   */
  static async hashForLogging(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
