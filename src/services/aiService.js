import { auth } from '../firebase';

class AIService {
  static async generateHint(question, answer) {
    try {
      // Use your existing deepseekAutofill Firebase Function
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/deepseekAutofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          statement: `Question: ${question}\nAnswer: ${answer}\n\nGenerate a helpful hint that guides the student toward the answer without giving it away completely.`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      return data.hints || 'Try breaking down the problem into smaller steps.';
    } catch (error) {
      console.error('Error generating hint:', error);
      // Fallback to a generic hint
      return 'Try breaking down the problem into smaller steps.';
    }
  }

  static async generateProof(question, answer) {
    try {
      // Use your existing deepseekAutofill Firebase Function
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/deepseekAutofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          statement: `Question: ${question}\nAnswer: ${answer}\n\nProvide a clear, step-by-step proof or solution.`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      return data.proof || '1. Start with the given information\n2. Apply relevant mathematical principles\n3. Work through the steps systematically\n4. Verify your answer';
    } catch (error) {
      console.error('Error generating proof:', error);
      // Fallback to a generic proof structure
      return '1. Start with the given information\n2. Apply relevant mathematical principles\n3. Work through the steps systematically\n4. Verify your answer';
    }
  }

  static async generateSuggestions(question, answer) {
    try {
      // Use your autoTagOnly function for suggestions
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/autoTagOnly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          statement: `Question: ${question}\nAnswer: ${answer}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      const tags = data.tags || [];
      return `Consider focusing on these topics: ${tags.join(', ')}. Also think about adding more context, breaking down complex steps, or including visual aids if applicable.`;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback to generic suggestions
      return 'Consider adding more context, breaking down complex steps, or including visual aids if applicable.';
    }
  }

  static async generateRelatedQuestions(question, answer) {
    try {
      // Use your deepseekAutofill function for related questions
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/deepseekAutofill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          statement: `Based on this flashcard - Question: ${question}\nAnswer: ${answer}\n\nGenerate 2-3 related questions that would help reinforce these concepts.`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      return data.hints || '1. What if we change the parameters?\n2. How would you solve a similar problem?\n3. What are the key concepts here?';
    } catch (error) {
      console.error('Error generating related questions:', error);
      // Fallback to generic related questions
      return '1. What if we change the parameters?\n2. How would you solve a similar problem?\n3. What are the key concepts here?';
    }
  }

  static async convertToLaTeX(naturalLanguage) {
    try {
      // Use your existing convertToLatex Firebase Function
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('https://us-central1-three-sided-flashcard-app.cloudfunctions.net/convertToLatex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          input: naturalLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      return data.latex || naturalLanguage;
    } catch (error) {
      console.error('Error converting to LaTeX:', error);
      // Fallback to common LaTeX patterns
      const fallbacks = {
        'direct sum': '\\oplus',
        'integral': '\\int',
        'infinity': '\\infty',
        'squared': '^2',
        'cubed': '^3',
        'square root': '\\sqrt{}',
        'derivative': '\\frac{d}{dx}',
        'limit': '\\lim_{x \\to }',
        'sum': '\\sum_{n=1}^{\\infty}',
        'product': '\\prod_{i=1}^{n}',
        'matrix': '\\begin{pmatrix} \\end{pmatrix}',
        'fraction': '\\frac{}{}',
        'absolute value': '| |',
        'greater than': '>',
        'less than': '<',
        'greater than or equal': '\\geq',
        'less than or equal': '\\leq'
      };

      let result = naturalLanguage;
      Object.entries(fallbacks).forEach(([key, value]) => {
        result = result.replace(new RegExp(key, 'gi'), value);
      });

      return result || '\\text{LaTeX conversion failed}';
    }
  }
}

export default AIService;
