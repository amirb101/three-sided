class AIService {
  static async generateHint(question, answer) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful math tutor. Generate a helpful hint for a flashcard that guides the student toward the answer without giving it away completely.'
            },
            {
              role: 'user',
              content: `Question: ${question}\nAnswer: ${answer}\n\nGenerate a helpful hint:`
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating hint:', error);
      // Fallback to a generic hint
      return 'Try breaking down the problem into smaller steps.';
    }
  }

  static async generateProof(question, answer) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a math tutor. Provide a clear, step-by-step proof or solution for the given problem.'
            },
            {
              role: 'user',
              content: `Question: ${question}\nAnswer: ${answer}\n\nProvide a step-by-step proof:`
            }
          ],
          max_tokens: 300,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating proof:', error);
      // Fallback to a generic proof structure
      return '1. Start with the given information\n2. Apply relevant mathematical principles\n3. Work through the steps systematically\n4. Verify your answer';
    }
  }

  static async generateSuggestions(question, answer) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a math tutor. Suggest ways to improve this flashcard to make it more effective for learning.'
            },
            {
              role: 'user',
              content: `Question: ${question}\nAnswer: ${answer}\n\nSuggest improvements:`
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback to generic suggestions
      return 'Consider adding more context, breaking down complex steps, or including visual aids if applicable.';
    }
  }

  static async generateRelatedQuestions(question, answer) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a math tutor. Generate 2-3 related questions that would help reinforce the concepts in this flashcard.'
            },
            {
              role: 'user',
              content: `Question: ${question}\nAnswer: ${answer}\n\nGenerate related questions:`
            }
          ],
          max_tokens: 250,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating related questions:', error);
      // Fallback to generic related questions
      return '1. What if we change the parameters?\n2. How would you solve a similar problem?\n3. What are the key concepts here?';
    }
  }

  static async convertToLaTeX(naturalLanguage) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a LaTeX expert. Convert natural language mathematical expressions to proper LaTeX code. Only return the LaTeX code, nothing else.'
            },
            {
              role: 'user',
              content: `Convert this to LaTeX: ${naturalLanguage}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
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
