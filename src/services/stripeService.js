import { auth } from '../firebase';

class StripeService {
  static async createCheckoutSession() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('User must be authenticated');
      }

      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      return data.id; // Stripe session ID
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  static async createPortalLink() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('User must be authenticated');
      }

      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/createPortalLink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal link');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error creating portal link:', error);
      throw error;
    }
  }

  static async redirectToCheckout(sessionId) {
    // Load Stripe.js
    const stripe = window.Stripe ? window.Stripe('pk_live_51RUu9KE3qmOAkttRGqw7Cr2wJ6qRHtCz9qXpHJHO0Bv4Q7gGHg5QXI9GFdXGh4IhQD5Xf9XUvLFCr9G2PHK0003w0Q') : null; // Replace with your actual publishable key
    
    if (!stripe) {
      throw new Error('Stripe.js not loaded. Please include the Stripe script in your HTML.');
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: sessionId
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}

export default StripeService;
