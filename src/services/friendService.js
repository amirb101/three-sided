import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { ProfileService } from './profileService';

/**
 * React Friend Service - Uses SAME Firestore schema as old social system
 * 
 * Schema compatibility:
 * - friendRequests - Collection for pending friend requests
 * - userFriends/{userId}/friends/{friendId} - Friendship connections
 * - Uses same field names and structure as old system
 */
export class FriendService {

  /**
   * Get friend requests for a user
   * @param {string} userId - User ID to get requests for
   * @returns {Promise<Array>} - Array of friend requests with profile data
   */
  static async getFriendRequests(userId) {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('to', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(requestsQuery);
      const requests = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const fromId = data.from;
        
        // Get sender's profile info
        const profile = await ProfileService.getProfileByUserId(fromId);
        
        requests.push({
          id: docSnapshot.id,
          fromId,
          toId: data.to,
          timestamp: data.timestamp,
          senderProfile: profile || {
            displayName: 'Unknown User',
            slug: null
          }
        });
      }
      
      return requests;
    } catch (error) {
      console.error('Error getting friend requests:', error);
      throw error;
    }
  }

  /**
   * Send a friend request
   * @param {string} fromId - Sender user ID
   * @param {string} toId - Recipient user ID
   * @returns {Promise<void>}
   */
  static async sendFriendRequest(fromId, toId) {
    try {
      // Validate inputs
      if (!fromId || !toId || fromId === toId) {
        throw new Error('Invalid user IDs');
      }

      // Check if request already exists (either direction)
      const [existingRequest, reverseRequest] = await Promise.all([
        this.checkExistingRequest(fromId, toId),
        this.checkExistingRequest(toId, fromId)
      ]);
      
      if (existingRequest) {
        throw new Error('Friend request already sent');
      }
      
      if (reverseRequest) {
        throw new Error('This user has already sent you a friend request');
      }
      
      // Check if they're already friends
      const areFriends = await this.areFriends(fromId, toId);
      if (areFriends) {
        throw new Error('You are already friends');
      }
      
      // Create friend request with retry logic
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await addDoc(collection(db, 'friendRequests'), {
            from: fromId,
            to: toId,
            timestamp: serverTimestamp(),
            status: 'pending'
          });
          
          console.log('✅ Friend request sent:', { fromId, toId });
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            console.warn(`Retry ${attempt}/${maxRetries} for friend request:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error('❌ Error sending friend request:', error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   * @param {string} requestId - Friend request document ID
   * @param {string} fromId - Original sender ID
   * @param {string} toId - Request recipient ID
   * @returns {Promise<void>}
   */
  static async acceptFriendRequest(requestId, fromId, toId) {
    try {
      // Validate inputs
      if (!requestId || !fromId || !toId || fromId === toId) {
        throw new Error('Invalid parameters for accepting friend request');
      }

      // Verify the friend request exists and belongs to the right users
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data();
      if (requestData.from !== fromId || requestData.to !== toId) {
        throw new Error('Friend request does not match the specified users');
      }

      // Check if they're already friends (avoid duplicate)
      const alreadyFriends = await this.areFriends(fromId, toId);
      if (alreadyFriends) {
        // Clean up the request and return success
        await deleteDoc(doc(db, 'friendRequests', requestId));
        console.log('Users were already friends, cleaned up request');
        return;
      }

      const batch = writeBatch(db);
      
      // Add to both users' friend lists with additional metadata
      const fromFriendRef = doc(db, 'userFriends', toId, 'friends', fromId);
      const toFriendRef = doc(db, 'userFriends', fromId, 'friends', toId);
      
      const friendshipData = {
        addedAt: serverTimestamp(),
        requestAcceptedAt: serverTimestamp(),
        status: 'active'
      };
      
      batch.set(fromFriendRef, friendshipData);
      batch.set(toFriendRef, friendshipData);
      
      // Delete the friend request
      const requestRef = doc(db, 'friendRequests', requestId);
      batch.delete(requestRef);
      
      // Execute transaction with retry
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await batch.commit();
          console.log('✅ Friend request accepted:', { fromId, toId, requestId });
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            console.warn(`Retry ${attempt}/${maxRetries} for accepting friend request:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error('❌ Error accepting friend request:', error);
      throw error;
    }
  }

  /**
   * Reject/decline a friend request
   * @param {string} requestId - Friend request document ID
   * @returns {Promise<void>}
   */
  static async rejectFriendRequest(requestId) {
    try {
      await deleteDoc(doc(db, 'friendRequests', requestId));
      console.log('✅ Friend request rejected:', requestId);
    } catch (error) {
      console.error('❌ Error rejecting friend request:', error);
      throw error;
    }
  }

  /**
   * Remove a friend
   * @param {string} userId - Current user ID
   * @param {string} friendId - Friend to remove
   * @returns {Promise<void>}
   */
  static async removeFriend(userId, friendId) {
    try {
      // Validate inputs
      if (!userId || !friendId || userId === friendId) {
        throw new Error('Invalid user IDs for removing friend');
      }

      // Check if they are actually friends first
      const areFriends = await this.areFriends(userId, friendId);
      if (!areFriends) {
        console.log('Users are not friends, nothing to remove');
        return;
      }

      const batch = writeBatch(db);
      
      // Remove from both users' friend lists
      const userFriendRef = doc(db, 'userFriends', userId, 'friends', friendId);
      const friendUserRef = doc(db, 'userFriends', friendId, 'friends', userId);
      
      batch.delete(userFriendRef);
      batch.delete(friendUserRef);
      
      // Execute with retry logic
      const maxRetries = 3;
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await batch.commit();
          console.log('✅ Friend removed:', { userId, friendId });
          return;
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            console.warn(`Retry ${attempt}/${maxRetries} for removing friend:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      throw lastError;
    } catch (error) {
      console.error('❌ Error removing friend:', error);
      throw error;
    }
  }

  /**
   * Get user's friends list with profile data
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of friends with profile info
   */
  static async getFriends(userId) {
    try {
      const friendsQuery = query(collection(db, 'userFriends', userId, 'friends'));
      const snapshot = await getDocs(friendsQuery);
      
      const friends = [];
      
      for (const docSnapshot of snapshot.docs) {
        const friendId = docSnapshot.id;
        const data = docSnapshot.data();
        
        // Get friend's profile
        const profile = await ProfileService.getProfileByUserId(friendId);
        
        if (profile) {
          friends.push({
            userId: friendId,
            addedAt: data.addedAt,
            ...profile
          });
        }
      }
      
      return friends;
    } catch (error) {
      console.error('Error getting friends:', error);
      throw error;
    }
  }

  /**
   * Get friendship status between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<Object>} - Friendship status object
   */
  static async getFriendshipStatus(userId1, userId2) {
    try {
      // Check if they're friends
      const areFriends = await this.areFriends(userId1, userId2);
      
      // Check for pending requests
      const sentRequest = await this.checkExistingRequest(userId1, userId2);
      const receivedRequest = await this.checkExistingRequest(userId2, userId1);
      
      return {
        areFriends,
        sentRequest: !!sentRequest,
        receivedRequest: !!receivedRequest,
        receivedRequestId: receivedRequest?.id || null
      };
    } catch (error) {
      console.error('Error getting friendship status:', error);
      return {
        areFriends: false,
        sentRequest: false,
        receivedRequest: false,
        receivedRequestId: null
      };
    }
  }

  /**
   * Check if two users are friends
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<boolean>} - True if friends
   */
  static async areFriends(userId1, userId2) {
    try {
      const friendDoc = await getDoc(doc(db, 'userFriends', userId1, 'friends', userId2));
      return friendDoc.exists();
    } catch (error) {
      console.error('Error checking friendship:', error);
      return false;
    }
  }

  /**
   * Check for existing friend request
   * @param {string} fromId - Sender ID
   * @param {string} toId - Recipient ID
   * @returns {Promise<Object|null>} - Request document or null
   */
  static async checkExistingRequest(fromId, toId) {
    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('from', '==', fromId),
        where('to', '==', toId)
      );
      
      const snapshot = await getDocs(requestsQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking existing request:', error);
      return null;
    }
  }

  /**
   * Get mutual friends between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @returns {Promise<Object>} - Mutual friends info
   */
  static async getMutualFriends(userId1, userId2) {
    try {
      const [friends1, friends2] = await Promise.all([
        this.getFriendIds(userId1),
        this.getFriendIds(userId2)
      ]);
      
      const mutualIds = friends1.filter(id => friends2.includes(id));
      
      // Get profiles for first 3 mutual friends
      const mutualProfiles = [];
      for (let i = 0; i < Math.min(3, mutualIds.length); i++) {
        const profile = await ProfileService.getProfileByUserId(mutualIds[i]);
        if (profile) {
          mutualProfiles.push(profile);
        }
      }
      
      return {
        total: mutualIds.length,
        profiles: mutualProfiles,
        hasMore: mutualIds.length > 3
      };
    } catch (error) {
      console.error('Error getting mutual friends:', error);
      return { total: 0, profiles: [], hasMore: false };
    }
  }

  /**
   * Get friend count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Number of friends
   */
  static async getFriendCount(userId) {
    try {
      const friendsQuery = query(collection(db, 'userFriends', userId, 'friends'));
      const snapshot = await getDocs(friendsQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting friend count:', error);
      return 0;
    }
  }

  /**
   * Get array of friend IDs (helper method)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of friend user IDs
   */
  static async getFriendIds(userId) {
    try {
      const friendsQuery = query(collection(db, 'userFriends', userId, 'friends'));
      const snapshot = await getDocs(friendsQuery);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error getting friend IDs:', error);
      return [];
    }
  }
}
