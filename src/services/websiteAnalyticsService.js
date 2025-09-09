import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch,
  setDoc,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { db, analytics } from '../firebase';

export class WebsiteAnalyticsService {
  // ==========================================
  // SESSION & TRAFFIC TRACKING
  // ==========================================

  /**
   * Initialize website session tracking
   */
  static async initializeSession(userId = null) {
    try {
      const sessionId = this.generateSessionId();
      const sessionData = {
        sessionId,
        userId: userId || null,
        startTime: serverTimestamp(),
        isActive: true,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        referrer: document.referrer || null,
        initialUrl: window.location.href,
        
        // Initialize counters
        pageViews: 0,
        clicks: 0,
        timeSpent: 0,
        pagesVisited: [],
        actionsPerformed: [],
        
        // Device info
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        isTablet: /iPad/i.test(navigator.userAgent),
        platform: navigator.platform
      };

      // Store session in Firestore
      await setDoc(doc(db, 'websiteSessions', sessionId), sessionData);
      
      // Store session ID in localStorage for continuity
      localStorage.setItem('website_session_id', sessionId);
      
      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'session_start', {
            session_id: sessionId,
            user_id: userId,
            is_mobile: sessionData.isMobile
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

      // Set up page visibility tracking
      this.setupVisibilityTracking(sessionId);
      
      // Set up beforeunload tracking
      this.setupUnloadTracking(sessionId);

      return sessionId;
    } catch (error) {
      console.error('Error initializing session:', error);
      throw error;
    }
  }

  /**
   * Track page view
   */
  static async trackPageView(page, sessionId = null, userId = null) {
    try {
      const currentSessionId = sessionId || localStorage.getItem('website_session_id');
      if (!currentSessionId) return;

      const pageViewData = {
        sessionId: currentSessionId,
        userId: userId || null,
        page,
        url: window.location.href,
        timestamp: serverTimestamp(),
        referrer: document.referrer || null,
        timeOnPage: 0,
        scrollDepth: 0,
        interactions: 0
      };

      // Add to pageViews collection
      const pageViewRef = await addDoc(collection(db, 'pageViews'), pageViewData);
      
      // Update session with page visit
      const sessionRef = doc(db, 'websiteSessions', currentSessionId);
      await updateDoc(sessionRef, {
        pageViews: increment(1),
        pagesVisited: arrayUnion(page),
        lastPageView: serverTimestamp(),
        currentPage: page
      });

      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            session_id: currentSessionId,
            user_id: userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

      // Start tracking time on this page
      this.startPageTimeTracking(pageViewRef.id, currentSessionId);

      return pageViewRef.id;
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  /**
   * Track user interaction/click
   */
  static async trackInteraction(interactionData, sessionId = null, userId = null) {
    try {
      const currentSessionId = sessionId || localStorage.getItem('website_session_id');
      if (!currentSessionId) return;

      const interaction = {
        sessionId: currentSessionId,
        userId: userId || null,
        timestamp: serverTimestamp(),
        page: window.location.pathname,
        ...interactionData
      };

      // Add to interactions collection
      await addDoc(collection(db, 'interactions'), interaction);
      
      // Update session counters
      const sessionRef = doc(db, 'websiteSessions', currentSessionId);
      await updateDoc(sessionRef, {
        clicks: increment(1),
        actionsPerformed: arrayUnion(interactionData.action || 'unknown'),
        lastActivity: serverTimestamp()
      });

      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'user_interaction', {
            action: interactionData.action,
            element: interactionData.element,
            session_id: currentSessionId,
            user_id: userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }

  /**
   * Track scroll depth
   */
  static async trackScrollDepth(depth, sessionId = null) {
    try {
      const currentSessionId = sessionId || localStorage.getItem('website_session_id');
      if (!currentSessionId) return;

      // Update current page view with scroll depth
      const pageViewsQuery = query(
        collection(db, 'pageViews'),
        where('sessionId', '==', currentSessionId),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const pageViewsSnapshot = await getDocs(pageViewsQuery);
      if (!pageViewsSnapshot.empty) {
        const pageViewDoc = pageViewsSnapshot.docs[0];
        await updateDoc(pageViewDoc.ref, {
          scrollDepth: Math.max(depth, pageViewDoc.data().scrollDepth || 0)
        });
      }

    } catch (error) {
      // Suppress index-related and permission errors to avoid console spam
      if (error.message && (
        error.message.includes('requires an index') ||
        error.message.includes('Missing or insufficient permissions') ||
        error.message.includes('permission-denied')
      )) {
        // Silently fail for missing index/permissions - admin can fix when needed
        return;
      }
      console.error('Error tracking scroll depth:', error);
    }
  }

  // ==========================================
  // ENGAGEMENT TRACKING
  // ==========================================

  /**
   * Track feature usage
   */
  static async trackFeatureUsage(feature, action, metadata = {}, userId = null) {
    try {
      const sessionId = localStorage.getItem('website_session_id');
      
      const featureUsage = {
        sessionId,
        userId: userId || null,
        feature,
        action,
        metadata,
        timestamp: serverTimestamp(),
        page: window.location.pathname
      };

      await addDoc(collection(db, 'featureUsage'), featureUsage);

      // Common feature tracking events
      if (analytics) {
        try {
          logEvent(analytics, 'feature_usage', {
            feature_name: feature,
            action_type: action,
            session_id: sessionId,
            user_id: userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

    } catch (error) {
      console.error('Error tracking feature usage:', error);
    }
  }

  /**
   * Track conversion events
   */
  static async trackConversion(conversionType, value = null, userId = null) {
    try {
      const sessionId = localStorage.getItem('website_session_id');
      
      const conversion = {
        sessionId,
        userId: userId || null,
        conversionType,
        value,
        timestamp: serverTimestamp(),
        page: window.location.pathname
      };

      await addDoc(collection(db, 'conversions'), conversion);

      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'conversion', {
            conversion_type: conversionType,
            conversion_value: value,
            session_id: sessionId,
            user_id: userId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }

  // ==========================================
  // USER JOURNEY TRACKING
  // ==========================================

  /**
   * Track user flow transitions
   */
  static async trackUserFlow(fromPage, toPage, action = 'navigation', userId = null) {
    try {
      const sessionId = localStorage.getItem('website_session_id');
      
      const flowEvent = {
        sessionId,
        userId: userId || null,
        fromPage,
        toPage,
        action,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'userFlows'), flowEvent);

    } catch (error) {
      console.error('Error tracking user flow:', error);
    }
  }

  /**
   * Track button/link clicks with context
   */
  static async trackClick(element, context = {}, userId = null) {
    try {
      await this.trackInteraction({
        action: 'click',
        element: element,
        context: context,
        elementText: context.text || '',
        elementId: context.id || '',
        elementClass: context.className || ''
      }, null, userId);

    } catch (error) {
      console.error('Error tracking click:', error);
    }
  }

  /**
   * Track form interactions
   */
  static async trackFormInteraction(formName, action, field = null, userId = null) {
    try {
      await this.trackInteraction({
        action: 'form_interaction',
        element: 'form',
        formName,
        formAction: action,
        field
      }, null, userId);

    } catch (error) {
      console.error('Error tracking form interaction:', error);
    }
  }

  // ==========================================
  // TIME TRACKING
  // ==========================================

  /**
   * Start tracking time on current page
   */
  static startPageTimeTracking(pageViewId, sessionId) {
    // Store in memory for this session
    if (!window.pageTimeTracking) {
      window.pageTimeTracking = {};
    }
    
    window.pageTimeTracking[pageViewId] = {
      startTime: Date.now(),
      sessionId,
      pageViewId
    };
  }

  /**
   * End page time tracking and update database
   */
  static async endPageTimeTracking(pageViewId) {
    try {
      if (!window.pageTimeTracking || !window.pageTimeTracking[pageViewId]) return;
      
      const tracking = window.pageTimeTracking[pageViewId];
      const timeSpent = Math.round((Date.now() - tracking.startTime) / 1000); // seconds
      
      // Update page view with time spent
      const pageViewRef = doc(db, 'pageViews', pageViewId);
      await updateDoc(pageViewRef, {
        timeOnPage: timeSpent
      });

      // Update session total time
      const sessionRef = doc(db, 'websiteSessions', tracking.sessionId);
      await updateDoc(sessionRef, {
        timeSpent: increment(timeSpent)
      });

      // Clean up tracking
      delete window.pageTimeTracking[pageViewId];

    } catch (error) {
      console.error('Error ending page time tracking:', error);
    }
  }

  // ==========================================
  // SESSION MANAGEMENT
  // ==========================================

  /**
   * End current session
   */
  static async endSession(sessionId = null) {
    try {
      const currentSessionId = sessionId || localStorage.getItem('website_session_id');
      if (!currentSessionId) return;

      // End all active page time tracking
      if (window.pageTimeTracking) {
        for (const pageViewId of Object.keys(window.pageTimeTracking)) {
          await this.endPageTimeTracking(pageViewId);
        }
      }

      // Update session as ended
      const sessionRef = doc(db, 'websiteSessions', currentSessionId);
      await updateDoc(sessionRef, {
        endTime: serverTimestamp(),
        isActive: false
      });

      // Clean up localStorage
      localStorage.removeItem('website_session_id');

      // Track with Firebase Analytics
      if (analytics) {
        try {
          logEvent(analytics, 'session_end', {
            session_id: currentSessionId
          });
        } catch (error) {
          console.warn('Firebase Analytics not available:', error);
        }
      }

    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  // ==========================================
  // ANALYTICS RETRIEVAL
  // ==========================================

  /**
   * Get website analytics summary
   */
  static async getAnalyticsSummary(timeframe = 'week') {
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 1;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get session stats
      const sessionsQuery = query(
        collection(db, 'websiteSessions'),
        where('startTime', '>=', cutoffDate)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get page views
      const pageViewsQuery = query(
        collection(db, 'pageViews'),
        where('timestamp', '>=', cutoffDate)
      );
      const pageViewsSnapshot = await getDocs(pageViewsQuery);
      const pageViews = pageViewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Get interactions
      const interactionsQuery = query(
        collection(db, 'interactions'),
        where('timestamp', '>=', cutoffDate)
      );
      const interactionsSnapshot = await getDocs(interactionsQuery);
      const interactions = interactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const uniqueUsers = new Set(sessions.filter(s => s.userId).map(s => s.userId)).size;
      const totalSessions = sessions.length;
      const totalPageViews = pageViews.length;
      const totalInteractions = interactions.length;
      const avgSessionDuration = sessions.reduce((sum, s) => sum + (s.timeSpent || 0), 0) / sessions.length;
      const avgPagesPerSession = totalPageViews / totalSessions;

      // Most popular pages
      const pageStats = {};
      pageViews.forEach(pv => {
        const page = pv.page || 'unknown';
        if (!pageStats[page]) {
          pageStats[page] = { views: 0, totalTime: 0, interactions: 0 };
        }
        pageStats[page].views++;
        pageStats[page].totalTime += pv.timeOnPage || 0;
      });

      interactions.forEach(int => {
        const page = int.page || 'unknown';
        if (pageStats[page]) {
          pageStats[page].interactions++;
        }
      });

      const popularPages = Object.entries(pageStats)
        .map(([page, stats]) => ({
          page,
          ...stats,
          avgTimeOnPage: stats.totalTime / stats.views
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Device breakdown
      const deviceStats = {
        mobile: sessions.filter(s => s.isMobile).length,
        tablet: sessions.filter(s => s.isTablet).length,
        desktop: sessions.filter(s => !s.isMobile && !s.isTablet).length
      };

      return {
        summary: {
          uniqueUsers,
          totalSessions,
          totalPageViews,
          totalInteractions,
          avgSessionDuration: Math.round(avgSessionDuration),
          avgPagesPerSession: Math.round(avgPagesPerSession * 10) / 10
        },
        popularPages,
        deviceStats,
        sessions,
        timeframe
      };

    } catch (error) {
      console.error('Error getting analytics summary:', error);
      throw error;
    }
  }

  /**
   * Get user journey analytics
   */
  static async getUserJourneyAnalytics(timeframe = 'week') {
    try {
      const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 1;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get user flows
      const flowsQuery = query(
        collection(db, 'userFlows'),
        where('timestamp', '>=', cutoffDate)
      );
      const flowsSnapshot = await getDocs(flowsQuery);
      const flows = flowsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Analyze common paths
      const pathCounts = {};
      flows.forEach(flow => {
        const path = `${flow.fromPage} → ${flow.toPage}`;
        pathCounts[path] = (pathCounts[path] || 0) + 1;
      });

      const commonPaths = Object.entries(pathCounts)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Entry and exit points
      const entryPoints = {};
      const exitPoints = {};
      
      flows.forEach(flow => {
        entryPoints[flow.fromPage] = (entryPoints[flow.fromPage] || 0) + 1;
        exitPoints[flow.toPage] = (exitPoints[flow.toPage] || 0) + 1;
      });

      return {
        commonPaths,
        entryPoints: Object.entries(entryPoints)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        exitPoints: Object.entries(exitPoints)
          .map(([page, count]) => ({ page, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      };

    } catch (error) {
      console.error('Error getting user journey analytics:', error);
      throw error;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  static generateSessionId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up page visibility tracking
   */
  static setupVisibilityTracking(sessionId) {
    let isVisible = !document.hidden;
    let visibilityStart = Date.now();

    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden && isVisible) {
        // Page became hidden
        const timeVisible = now - visibilityStart;
        this.trackInteraction({
          action: 'page_hidden',
          element: 'page',
          timeVisible
        }, sessionId);
        isVisible = false;
      } else if (!document.hidden && !isVisible) {
        // Page became visible
        this.trackInteraction({
          action: 'page_visible',
          element: 'page'
        }, sessionId);
        isVisible = true;
        visibilityStart = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Set up page unload tracking
   */
  static setupUnloadTracking(sessionId) {
    const handleBeforeUnload = () => {
      // End current session
      this.endSession(sessionId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  /**
   * Set up scroll tracking
   */
  static setupScrollTracking() {
    let maxScrollDepth = 0;
    let scrollTimeout;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollDepth = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
      
      maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);

      // Debounce scroll tracking
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackScrollDepth(Math.round(maxScrollDepth));
      }, 1000);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  /**
   * Auto-track clicks on elements with data-track attribute
   */
  static setupAutoClickTracking() {
    document.addEventListener('click', (event) => {
      const element = event.target.closest('[data-track]');
      if (element) {
        const trackingData = {
          action: element.getAttribute('data-track'),
          text: element.textContent.trim(),
          id: element.id,
          className: element.className
        };
        
        this.trackClick(element.tagName.toLowerCase(), trackingData);
      }
    });
  }

  /**
   * Initialize all automatic tracking
   */
  static initializeAutoTracking(userId = null) {
    // Initialize session
    this.initializeSession(userId);
    
    // Set up automatic tracking
    this.setupScrollTracking();
    this.setupAutoClickTracking();
    
    // Track initial page view
    setTimeout(() => {
      this.trackPageView(window.location.pathname, null, userId);
    }, 100);
  }
}
