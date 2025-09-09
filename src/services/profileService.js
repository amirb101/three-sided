import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * React Profile Service - Uses SAME Firestore schema as old social system
 * 
 * Schema compatibility:
 * - profiles/{slug} - Profile data with userId reference
 * - userToSlug/{userId} - Slug lookup for users
 * - Uses same field names and structure as old system
 */
export class ProfileService {
  
  /**
   * Check if a slug is already taken
   * @param {string} slug - The slug to check
   * @returns {Promise<boolean>} - True if taken
   */
  static async isSlugTaken(slug) {
    try {
      const profileDoc = await getDoc(doc(db, 'profiles', slug));
      return profileDoc.exists();
    } catch (error) {
      console.error('Error checking slug availability:', error);
      throw error;
    }
  }

  /**
   * Generate a unique slug from display name
   * @param {string} name - Display name
   * @returns {string} - Generated slug (same logic as old system)
   */
  static slugify(name) {
    if (!name || typeof name !== 'string') return '';
    
    const sanitized = name.trim();
    const slug = sanitized
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);
    
    return slug.length >= 3 ? slug : '';
  }

  /**
   * Create a new profile (same schema as old system)
   * @param {string} userId - Firebase Auth UID
   * @param {string} slug - Unique slug
   * @param {Object} profileData - Profile information
   * @returns {Promise<void>}
   */
  static async createProfile(userId, slug, profileData) {
    try {
      const { displayName, bio = '', institution = '', email } = profileData;
      
      // Double-check slug availability
      if (await this.isSlugTaken(slug)) {
        throw new Error(`Slug '${slug}' is already taken`);
      }

      const profileDoc = {
        userId,
        displayName,
        bio,
        institution,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Stats (compatible with old system)
        flashcardCount: 0,
        upvotesReceived: 0,
        loginStreak: 0,
        lastLoginDate: serverTimestamp()
      };

      // Create profile document with slug as ID
      await setDoc(doc(db, 'profiles', slug), profileDoc);
      
      // Create userToSlug mapping
      await setDoc(doc(db, 'userToSlug', userId), { slug });
      
      console.log('✅ Profile created successfully:', { userId, slug });
      
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Get profile by slug
   * @param {string} slug - Profile slug
   * @returns {Promise<Object|null>} - Profile data or null
   */
  static async getProfileBySlug(slug) {
    try {
      const profileDoc = await getDoc(doc(db, 'profiles', slug));
      if (!profileDoc.exists()) return null;
      
      return {
        id: profileDoc.id,
        slug: profileDoc.id,
        ...profileDoc.data()
      };
    } catch (error) {
      console.error('Error getting profile by slug:', error);
      throw error;
    }
  }

  /**
   * Get profile by user ID
   * @param {string} userId - Firebase Auth UID
   * @returns {Promise<Object|null>} - Profile data or null
   */
  static async getProfileByUserId(userId) {
    try {
      // First get the slug
      const userToSlugDoc = await getDoc(doc(db, 'userToSlug', userId));
      if (!userToSlugDoc.exists()) return null;
      
      const { slug } = userToSlugDoc.data();
      return await this.getProfileBySlug(slug);
    } catch (error) {
      console.error('Error getting profile by user ID:', error);
      throw error;
    }
  }

  /**
   * Update profile
   * @param {string} slug - Profile slug
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  static async updateProfile(slug, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'profiles', slug), updateData);
      console.log('✅ Profile updated successfully:', slug);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Search profiles by display name or email (same as old system)
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} - Array of matching profiles
   */
  static async searchProfiles(searchTerm, limit = 20) {
    try {
      const searchLower = searchTerm.toLowerCase().trim();
      if (!searchLower) return [];

      // Get all profiles (Firestore doesn't support full-text search)
      const profilesQuery = query(collection(db, 'profiles'));
      const snapshot = await getDocs(profilesQuery);
      
      const results = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const displayName = (data.displayName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        
        if (displayName.includes(searchLower) || email.includes(searchLower)) {
          results.push({
            slug: doc.id,
            userId: data.userId,
            displayName: data.displayName,
            email: data.email,
            institution: data.institution,
            flashcardCount: data.flashcardCount || 0
          });
        }
      });

      return results.slice(0, limit);
    } catch (error) {
      console.error('Error searching profiles:', error);
      throw error;
    }
  }

  /**
   * Get user's slug from userId
   * @param {string} userId - Firebase Auth UID
   * @returns {Promise<string|null>} - User's slug or null
   */
  static async getUserSlug(userId) {
    try {
      const userToSlugDoc = await getDoc(doc(db, 'userToSlug', userId));
      if (!userToSlugDoc.exists()) return null;
      
      return userToSlugDoc.data().slug;
    } catch (error) {
      console.error('Error getting user slug:', error);
      return null;
    }
  }

  /**
   * Check if user has a profile
   * @param {string} userId - Firebase Auth UID
   * @returns {Promise<boolean>} - True if user has profile
   */
  static async hasProfile(userId) {
    try {
      const slug = await this.getUserSlug(userId);
      return !!slug;
    } catch (error) {
      console.error('Error checking if user has profile:', error);
      return false;
    }
  }

  /**
   * Update user stats (flashcard count, upvotes, etc.)
   * @param {string} userId - Firebase Auth UID
   * @param {Object} statUpdates - Stats to update
   * @returns {Promise<void>}
   */
  static async updateUserStats(userId, statUpdates) {
    try {
      const slug = await this.getUserSlug(userId);
      if (!slug) return;
      
      await this.updateProfile(slug, statUpdates);
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }
}
