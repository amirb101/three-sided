import { auth } from '../firebase';

class AIService {
  /**
   * Auto-fill hints, proof, and tags from a statement
   * @param {string} statement - The problem statement
   * @returns {Promise<{hints: string, proof: string, tags: string[]}>}
   */
  static async autoFillFromStatement(statement) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/deepseekAutofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ statement })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();
      return {
        hints: data.hints || '',
        proof: data.proof || '',
        tags: data.tags || []
      };
    } catch (error) {
      console.error('Error with AI autofill:', error);
      throw error;
    }
  }

  /**
   * Generate tags only from a statement
   * @param {string} statement - The problem statement
   * @returns {Promise<string[]>}
   */
  static async autoTagOnly(statement) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/autoTagOnly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ statement })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Error with AI auto-tagging:', error);
      throw error;
    }
  }

  /**
   * Convert natural language to LaTeX
   * @param {string} input - Natural language mathematical text
   * @returns {Promise<string>}
   */
  static async convertToLaTeX(input) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/convertToLatex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ input })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();
      return data.latex || input;
    } catch (error) {
      console.error('Error converting to LaTeX:', error);
      throw error;
    }
  }
}

export default AIService;
