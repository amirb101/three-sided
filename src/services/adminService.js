import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';

export class AdminService {
  // Admin configuration
  static ADMIN_EMAILS = [
    'three.dash.sided@gmail.com',
    // Add more admin emails here as needed
  ];

  /**
   * Check if user is admin (frontend check - must be verified server-side too)
   */
  static isAdmin(user) {
    if (!user || !user.email) return false;
    return this.ADMIN_EMAILS.includes(user.email);
  }

  /**
   * Get user's admin status from Firestore
   */
  static async getAdminStatus(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      return {
        isAdmin: userData?.isAdmin || false,
        adminLevel: userData?.adminLevel || 'none', // 'super', 'admin', 'moderator', 'none'
        permissions: userData?.adminPermissions || []
      };
    } catch (error) {
      console.error('Error getting admin status:', error);
      return { isAdmin: false, adminLevel: 'none', permissions: [] };
    }
  }

  /**
   * Verify admin access (should be called before showing admin features)
   */
  static async verifyAdminAccess(user) {
    if (!user) return false;
    
    // Frontend email check
    const isAdminEmail = this.isAdmin(user);
    if (!isAdminEmail) return false;
    
    // Backend verification
    const adminStatus = await this.getAdminStatus(user.uid);
    return adminStatus.isAdmin;
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  /**
   * Get all users with admin controls
   */
  static async getAllUsers(limitCount = 100) {
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const users = [];
      
      for (const doc of snapshot.docs) {
        const userData = doc.data();
        
        // Get additional profile data if exists
        let profileData = {};
        try {
          const profileDoc = await getDoc(doc(db, 'profiles', doc.id));
          if (profileDoc.exists()) {
            profileData = profileDoc.data();
          }
        } catch (error) {
          console.warn('Could not load profile for user:', doc.id);
        }
        
        users.push({
          id: doc.id,
          ...userData,
          profile: profileData,
          // Format display info
          displayName: profileData.displayName || userData.displayName || userData.email?.split('@')[0] || 'Unknown',
          joinDate: userData.createdAt?.toDate?.() || new Date(),
          lastSeen: userData.lastLogin?.toDate?.() || userData.createdAt?.toDate?.() || new Date()
        });
      }
      
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Update user premium status
   */
  static async updateUserPremium(userId, isPremium) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isPremium,
        premiumUpdatedAt: new Date(),
        premiumUpdatedBy: 'admin'
      });
      return true;
    } catch (error) {
      console.error('Error updating user premium status:', error);
      throw error;
    }
  }

  /**
   * Update user admin status
   */
  static async updateUserAdmin(userId, isAdmin, adminLevel = 'admin') {
    try {
      const updates = {
        isAdmin,
        adminUpdatedAt: new Date(),
        adminUpdatedBy: 'super_admin'
      };
      
      if (isAdmin) {
        updates.adminLevel = adminLevel;
        updates.adminPermissions = this.getDefaultPermissions(adminLevel);
      } else {
        updates.adminLevel = 'none';
        updates.adminPermissions = [];
      }
      
      await updateDoc(doc(db, 'users', userId), updates);
      return true;
    } catch (error) {
      console.error('Error updating user admin status:', error);
      throw error;
    }
  }

  /**
   * Get default permissions for admin level
   */
  static getDefaultPermissions(adminLevel) {
    switch (adminLevel) {
      case 'super':
        return [
          'user_management',
          'content_moderation', 
          'system_settings',
          'analytics_access',
          'data_export',
          'admin_management'
        ];
      case 'admin':
        return [
          'user_management',
          'content_moderation',
          'analytics_access'
        ];
      case 'moderator':
        return [
          'content_moderation'
        ];
      default:
        return [];
    }
  }

  // ==========================================
  // CONTENT MANAGEMENT
  // ==========================================

  /**
   * Get all public flashcards for moderation
   */
  static async getPublicCardsForModeration(limitCount = 50) {
    try {
      const q = query(
        collection(db, 'publicCards'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const cards = [];
      
      for (const doc of snapshot.docs) {
        const cardData = doc.data();
        
        // Get author info
        let authorInfo = {};
        try {
          if (cardData.userId) {
            const userDoc = await getDoc(doc(db, 'users', cardData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              authorInfo = {
                email: userData.email,
                displayName: userData.displayName || userData.email?.split('@')[0]
              };
            }
          }
        } catch (error) {
          console.warn('Could not load author info for card:', doc.id);
        }
        
        cards.push({
          id: doc.id,
          ...cardData,
          author: authorInfo,
          createdDate: cardData.createdAt?.toDate?.() || new Date()
        });
      }
      
      return cards;
    } catch (error) {
      console.error('Error getting public cards:', error);
      throw error;
    }
  }

  /**
   * Remove/hide a public card
   */
  static async moderateCard(cardId, action, reason = '') {
    try {
      const updates = {
        moderatedAt: new Date(),
        moderatedBy: 'admin',
        moderationAction: action,
        moderationReason: reason
      };
      
      if (action === 'hide') {
        updates.isHidden = true;
      } else if (action === 'remove') {
        updates.isRemoved = true;
      }
      
      await updateDoc(doc(db, 'publicCards', cardId), updates);
      return true;
    } catch (error) {
      console.error('Error moderating card:', error);
      throw error;
    }
  }

  // ==========================================
  // SYSTEM ANALYTICS
  // ==========================================

  /**
   * Get system overview stats
   */
  static async getSystemStats() {
    try {
      const [usersSnapshot, cardsSnapshot, publicCardsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'cards')),
        getDocs(collection(db, 'publicCards'))
      ]);

      // Calculate user stats
      const users = usersSnapshot.docs.map(doc => doc.data());
      const totalUsers = users.length;
      const premiumUsers = users.filter(u => u.isPremium).length;
      const adminUsers = users.filter(u => u.isAdmin).length;
      
      // Calculate recent activity (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentUsers = users.filter(u => 
        u.createdAt?.toDate?.() > weekAgo || u.lastLogin?.toDate?.() > weekAgo
      ).length;

      // Calculate content stats
      const totalPrivateCards = cardsSnapshot.size;
      const totalPublicCards = publicCardsSnapshot.size;
      const publicCards = publicCardsSnapshot.docs.map(doc => doc.data());
      const recentPublicCards = publicCards.filter(c => 
        c.createdAt?.toDate?.() > weekAgo
      ).length;

      return {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          admin: adminUsers,
          recentlyActive: recentUsers,
          conversionRate: totalUsers > 0 ? (premiumUsers / totalUsers * 100).toFixed(1) : 0
        },
        content: {
          totalPrivateCards,
          totalPublicCards,
          totalCards: totalPrivateCards + totalPublicCards,
          recentPublicCards,
          avgCardsPerUser: totalUsers > 0 ? ((totalPrivateCards + totalPublicCards) / totalUsers).toFixed(1) : 0
        },
        system: {
          lastUpdated: new Date(),
          status: 'operational' // Could add health checks here
        }
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  // ==========================================
  // ADMIN ACTIVITY LOG
  // ==========================================

  /**
   * Log admin action for audit trail
   */
  static async logAdminAction(adminUserId, action, details = {}) {
    try {
      await addDoc(collection(db, 'adminLogs'), {
        adminUserId,
        action,
        details,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        ip: null // Would need backend to get real IP
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
      // Don't throw - logging failure shouldn't break admin actions
    }
  }

  /**
   * Get recent admin activity
   */
  static async getAdminActivity(limitCount = 50) {
    try {
      const q = query(
        collection(db, 'adminLogs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      const activities = [];
      
      for (const doc of snapshot.docs) {
        const logData = doc.data();
        
        // Get admin user info
        let adminInfo = {};
        try {
          const userDoc = await getDoc(doc(db, 'users', logData.adminUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            adminInfo = {
              email: userData.email,
              displayName: userData.displayName || userData.email?.split('@')[0]
            };
          }
        } catch (error) {
          console.warn('Could not load admin info for log:', doc.id);
        }
        
        activities.push({
          id: doc.id,
          ...logData,
          admin: adminInfo,
          timestamp: logData.timestamp?.toDate?.() || new Date()
        });
      }
      
      return activities;
    } catch (error) {
      console.error('Error getting admin activity:', error);
      throw error;
    }
  }
}
