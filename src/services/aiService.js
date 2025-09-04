class AIService {
  constructor() {
    this.baseUrl = 'https://api.deepseek.com/v1';
    this.apiKey = process.env.REACT_APP_DEEPSEEK_API_KEY;
  }

  async generateHint(question, answer, subject = '') {
    try {
      const prompt = `Given this flashcard:
Question: ${question}
Answer: ${answer}
Subject: ${subject}

Generate a helpful hint that guides the student toward the answer without giving it away completely. The hint should be:
1. Specific and relevant to the question
2. Educational and instructive
3. Not too obvious but not too cryptic
4. Written in a friendly, encouraging tone

Hint:`;

      const response = await this.callDeepSeek(prompt);
      return response;
    } catch (error) {
      console.error('Error generating hint:', error);
      throw new Error('Failed to generate AI hint');
    }
  }

  async generateProof(question, answer, subject = '') {
    try {
      const prompt = `Given this flashcard:
Question: ${question}
Answer: ${answer}
Subject: ${subject}

Provide a step-by-step proof or explanation that shows how to arrive at this answer. The explanation should be:
1. Clear and logical
2. Educational and instructive
3. Suitable for a student studying this subject
4. Include key concepts and reasoning

Proof:`;

      const response = await this.callDeepSeek(prompt);
      return response;
    } catch (error) {
      console.error('Error generating proof:', error);
      throw new Error('Failed to generate AI proof');
    }
  }

  async suggestImprovements(question, answer, subject = '') {
    try {
      const prompt = `Given this flashcard:
Question: ${question}
Answer: ${answer}
Subject: ${subject}

Suggest 2-3 specific improvements to make this flashcard more effective for learning. Consider:
1. Clarity and precision of the question
2. Completeness and accuracy of the answer
3. Educational value and difficulty level
4. Potential for adding hints or context

Suggestions:`;

      const response = await this.callDeepSeek(prompt);
      return response;
    } catch (error) {
      console.error('Error suggesting improvements:', error);
      throw new Error('Failed to generate AI suggestions');
    }
  }

  async generateRelatedQuestions(question, answer, subject = '') {
    try {
      const prompt = `Given this flashcard:
Question: ${question}
Answer: ${answer}
Subject: ${subject}

Generate 3 related questions that would help students deepen their understanding of this topic. The questions should:
1. Build upon the concepts in the original question
2. Vary in difficulty (easy, medium, hard)
3. Cover different aspects of the same topic
4. Be specific and answerable

Related Questions:`;

      const response = await this.callDeepSeek(prompt);
      return response;
    } catch (error) {
      console.error('Error generating related questions:', error);
      throw new Error('Failed to generate AI related questions');
    }
  }

  async callDeepSeek(prompt) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational assistant helping students create and study flashcards. Provide clear, helpful, and educational responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated';
  }

  // Fallback method when AI is not available
  generateFallbackHint(question, answer, subject = '') {
    const hints = [
      'Think about the key concepts involved',
      'Consider what you already know about this topic',
      'Break down the problem into smaller parts',
      'Look for patterns or relationships',
      'Remember the fundamental principles'
    ];
    
    return hints[Math.floor(Math.random() * hints.length)];
  }

  generateFallbackProof(question, answer, subject = '') {
    return `To solve this problem, start by identifying the key concepts and then work through the solution step by step. Consider reviewing the fundamental principles of ${subject || 'this subject'} if you get stuck.`;
  }

  generateFallbackSuggestions(question, answer, subject = '') {
    return [
      'Make sure the question is clear and specific',
      'Consider adding more context to help understanding',
      'Verify that the answer is complete and accurate'
    ];
  }

  generateFallbackRelatedQuestions(question, answer, subject = '') {
    return [
      'What are the fundamental concepts behind this answer?',
      'How would you apply this knowledge to a similar problem?',
      'What are the common mistakes students make with this topic?'
    ];
  }
}

export const aiService = new AIService();
export default AIService;
