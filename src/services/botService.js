import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Bot Management Service
export class BotService {
  static async getBotAccounts() {
    try {
      const botsRef = collection(db, 'botAccounts');
      const snapshot = await getDocs(botsRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting bot accounts:', error);
      throw error;
    }
  }

  static async getAutomationSettings() {
    try {
      const settingsRef = doc(db, 'automation', 'settings');
      const snapshot = await getDoc(settingsRef);
      
      if (!snapshot.exists()) {
        // Return default settings if none exist
        return {
          enabled: false,
          interval: 24, // hours
          maxPostsPerDay: 5,
          tags: ['math', 'mathematics'],
          subjects: ['mathematics']
        };
      }
      
      return snapshot.data();
    } catch (error) {
      console.error('Error getting automation settings:', error);
      throw error;
    }
  }

  static async updateAutomationSettings(settings) {
    try {
      const settingsRef = doc(db, 'automation', 'settings');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating automation settings:', error);
      throw error;
    }
  }

  static async createBotAccount(botData) {
    try {
      const botRef = doc(collection(db, 'botAccounts'));
      await setDoc(botRef, {
        ...botData,
        createdAt: serverTimestamp(),
        isActive: true
      });
      return botRef.id;
    } catch (error) {
      console.error('Error creating bot account:', error);
      throw error;
    }
  }

  static async deleteBotAccount(botId) {
    try {
      const botRef = doc(db, 'botAccounts', botId);
      await deleteDoc(botRef);
    } catch (error) {
      console.error('Error deleting bot account:', error);
      throw error;
    }
  }
}
