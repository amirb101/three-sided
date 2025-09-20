import { SecurityService } from './securityService';
import globalCache from './cacheService';

/**
 * Import/Export Service for deck formats
 * Supports Obsidian markdown and Anki CSV/HTML formats
 */
export class ImportExportService {
  
  // Rate limiting and security constants
  static limits = {
    maxCardsPerImport: 100,
    maxContentSize: 1024 * 1024, // 1MB
    maxImportsPerHour: 10
  };

  /**
   * Auto-detect format from content
   */
  static detectFormat(content) {
    if (!content || typeof content !== 'string') return 'unknown';
    
    const trimmedContent = content.trim();
    
    // Obsidian markdown format: ## Title or statement :: hint :: proof
    if (trimmedContent.includes(' :: ') && (trimmedContent.includes('##') || /^[^:]+\s+::\s+[^:]*\s+::\s+/m.test(trimmedContent))) {
      return 'obsidian';
    }
    
    // Anki HTML format
    if (trimmedContent.includes('<') && (trimmedContent.includes('<div>') || trimmedContent.includes('<p>') || trimmedContent.includes('<br'))) {
      return 'anki-html';
    }
    
    // CSV format (tab or comma separated)
    if (trimmedContent.includes('\t') || (trimmedContent.includes(',') && trimmedContent.includes('\n'))) {
      return 'csv';
    }
    
    // Simple two-sided format (line by line)
    const lines = trimmedContent.split('\n').filter(line => line.trim());
    if (lines.length >= 2 && lines.every(line => !line.includes(' :: ') && !line.includes('<'))) {
      return 'simple';
    }
    
    return 'unknown';
  }

  /**
   * Export deck to specified format
   */
  static async exportDeck(deckId, format = 'obsidian') {
    try {
      // Get deck and cards using DeckService
      const { DeckService } = await import('./deckService');
      const deck = await DeckService.getDeck(deckId);
      const cards = await DeckService.getDeckCards(deckId, 1000); // Get all cards
      
      if (!deck) {
        throw new Error('Deck not found');
      }

      if (!cards || cards.length === 0) {
        throw new Error('No cards found in deck');
      }

      switch (format) {
        case 'obsidian':
          return this.exportToObsidian(deck, cards);
        case 'anki-csv':
          return this.exportToAnkiCSV(deck, cards);
        case 'anki-html':
          return this.exportToAnkiHTML(deck, cards);
        case 'csv':
          return this.exportToCSV(deck, cards);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  /**
   * Export to Obsidian markdown format
   */
  static exportToObsidian(deck, cards) {
    const header = `# ${deck.name}\n\n`;
    const description = deck.description ? `${deck.description}\n\n` : '';
    const metadata = `Created: ${new Date().toLocaleDateString()}\nCards: ${cards.length}\n\n---\n\n`;
    
    const cardContent = cards.map(card => {
      // Create a title from the statement (truncated if too long)
      const title = this.createCardTitle(card.statement || card.question || 'Untitled');
      
      // Format: statement :: hint :: proof
      const statement = this.sanitizeForMarkdown(card.statement || card.question || '');
      const hints = this.sanitizeForMarkdown(card.hints || '');
      const proof = this.sanitizeForMarkdown(card.proof || card.answer || '');
      
      let cardText = `## ${title}\n${statement} :: ${hints} :: ${proof}`;
      
      // Add tags if present
      if (card.tags && card.tags.length > 0) {
        cardText += `\nTags: ${card.tags.join(', ')}`;
      }
      
      return cardText;
    }).join('\n\n');
    
    return header + description + metadata + cardContent;
  }

  /**
   * Export to Anki CSV format
   */
  static exportToAnkiCSV(deck, cards) {
    const header = 'Front,Back,Tags\n';
    
    const rows = cards.map(card => {
      const front = this.sanitizeForCSV(card.statement || card.question || '');
      
      // Combine hints and proof for the back
      const hints = card.hints ? this.sanitizeForCSV(card.hints) : '';
      const proof = this.sanitizeForCSV(card.proof || card.answer || '');
      const back = hints ? `${hints}\n\n${proof}` : proof;
      
      const tags = card.tags ? card.tags.join(' ') : '';
      
      return `"${front}","${back}","${tags}"`;
    }).join('\n');
    
    return header + rows;
  }

  /**
   * Export to Anki HTML format
   */
  static exportToAnkiHTML(deck, cards) {
    const cardsHTML = cards.map(card => {
      const front = this.sanitizeHTML(card.statement || card.question || '');
      const hints = card.hints ? this.sanitizeHTML(card.hints) : '';
      const proof = this.sanitizeHTML(card.proof || card.answer || '');
      
      const back = hints ? `<div class="hints">${hints}</div><hr><div class="proof">${proof}</div>` : `<div class="proof">${proof}</div>`;
      
      return `<div class="card">
  <div class="front">${front}</div>
  <div class="back">${back}</div>
  <div class="tags">${(card.tags || []).join(' ')}</div>
</div>`;
    }).join('\n\n');
    
    return `<html>
<head>
  <title>${deck.name} - Anki Export</title>
  <meta charset="utf-8">
</head>
<body>
<h1>${deck.name}</h1>
${deck.description ? `<p>${deck.description}</p>` : ''}

${cardsHTML}
</body>
</html>`;
  }

  /**
   * Export to simple CSV format
   */
  static exportToCSV(deck, cards) {
    const header = 'Statement,Hints,Proof,Tags\n';
    
    const rows = cards.map(card => {
      const statement = this.sanitizeForCSV(card.statement || card.question || '');
      const hints = this.sanitizeForCSV(card.hints || '');
      const proof = this.sanitizeForCSV(card.proof || card.answer || '');
      const tags = card.tags ? card.tags.join(';') : '';
      
      return `"${statement}","${hints}","${proof}","${tags}"`;
    }).join('\n');
    
    return header + rows;
  }

  /**
   * Import cards from content
   */
  static async importCards(content, format = 'auto', options = {}) {
    try {
      // Security validation
      await this.validateImportContent(content);
      
      // Auto-detect format if needed
      if (format === 'auto') {
        format = this.detectFormat(content);
      }
      
      let cards = [];
      
      switch (format) {
        case 'obsidian':
          cards = this.parseObsidian(content);
          break;
        case 'anki-html':
          cards = this.parseAnkiHTML(content);
          break;
        case 'csv':
        case 'anki-csv':
          cards = this.parseCSV(content);
          break;
        case 'simple':
          cards = this.parseSimple(content);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
      
      // Validate and sanitize each card
      cards = await Promise.all(cards.map(card => this.validateAndSanitizeCard(card)));
      
      // Remove empty cards
      cards = cards.filter(card => 
        (card.statement && card.statement.trim()) || 
        (card.proof && card.proof.trim())
      );
      
      if (cards.length === 0) {
        throw new Error('No valid cards found in the imported content');
      }
      
      if (cards.length > this.limits.maxCardsPerImport) {
        throw new Error(`Too many cards. Maximum allowed: ${this.limits.maxCardsPerImport}`);
      }
      
      return {
        cards,
        format,
        count: cards.length
      };
      
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  }

  /**
   * Parse Obsidian format
   */
  static parseObsidian(content) {
    const cards = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, headers, and metadata
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('Tags:') || trimmed.startsWith('Created:') || trimmed === '---') {
        continue;
      }
      
      // Look for the three-sided format: statement :: hint :: proof
      if (trimmed.includes(' :: ')) {
        const parts = trimmed.split(' :: ');
        if (parts.length >= 2) {
          const statement = parts[0].replace(/^##\s*/, '').trim();
          const hints = parts[1] ? parts[1].trim() : '';
          const proof = parts[2] ? parts[2].trim() : parts[1].trim(); // If only 2 parts, second is proof
          
          if (statement) {
            cards.push({
              statement,
              hints: parts.length >= 3 ? hints : '', // Only use hints if 3 parts
              proof,
              tags: []
            });
          }
        }
      }
    }
    
    return cards;
  }

  /**
   * Parse CSV format
   */
  static parseCSV(content) {
    const cards = [];
    const lines = content.split('\n');
    
    // Skip header if present
    const startIndex = lines[0] && (lines[0].toLowerCase().includes('front') || lines[0].toLowerCase().includes('statement')) ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quoted fields)
      const fields = this.parseCSVLine(line);
      
      if (fields.length >= 2) {
        const statement = fields[0] || '';
        const hints = fields.length >= 3 ? fields[1] : '';
        const proof = fields.length >= 3 ? fields[2] : fields[1];
        const tags = fields.length >= 4 ? fields[3].split(/[;,]/).map(t => t.trim()).filter(Boolean) : [];
        
        if (statement.trim() || proof.trim()) {
          cards.push({
            statement: statement.trim(),
            hints: hints.trim(),
            proof: proof.trim(),
            tags
          });
        }
      }
    }
    
    return cards;
  }

  /**
   * Parse simple format (line by line, assuming two-sided)
   */
  static parseSimple(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const cards = [];
    
    // Assume pairs of lines: question, answer
    for (let i = 0; i < lines.length - 1; i += 2) {
      const statement = lines[i];
      const proof = lines[i + 1];
      
      if (statement && proof) {
        cards.push({
          statement,
          hints: '', // Two-sided cards have no hints
          proof,
          tags: []
        });
      }
    }
    
    return cards;
  }

  /**
   * Parse Anki HTML format (basic support)
   */
  static parseAnkiHTML(content) {
    const cards = [];
    
    // Extract content between div tags
    const divMatches = content.match(/<div[^>]*class="front"[^>]*>(.*?)<\/div>/gs);
    const backMatches = content.match(/<div[^>]*class="back"[^>]*>(.*?)<\/div>/gs);
    
    if (divMatches && backMatches && divMatches.length === backMatches.length) {
      for (let i = 0; i < divMatches.length; i++) {
        const statement = this.stripHTML(divMatches[i]).trim();
        const backContent = this.stripHTML(backMatches[i]).trim();
        
        if (statement && backContent) {
          cards.push({
            statement,
            hints: '', // HTML format typically doesn't separate hints
            proof: backContent,
            tags: []
          });
        }
      }
    }
    
    return cards;
  }

  /**
   * Validate import content for security
   */
  static async validateImportContent(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content provided');
    }
    
    if (content.length > this.limits.maxContentSize) {
      throw new Error(`Content too large. Maximum size: ${Math.round(this.limits.maxContentSize / 1024)}KB`);
    }
    
    // Check for suspicious content
    const suspiciousCheck = SecurityService.detectSuspiciousContent(content);
    if (suspiciousCheck.isSuspicious) {
      throw new Error(`Suspicious content detected: ${suspiciousCheck.reason}`);
    }
    
    return true;
  }

  /**
   * Validate and sanitize individual card
   */
  static async validateAndSanitizeCard(card) {
    // Length validation
    if (card.statement && card.statement.length > 1000) {
      throw new Error('Card statement too long (max 1000 characters)');
    }
    if (card.hints && card.hints.length > 2000) {
      throw new Error('Card hints too long (max 2000 characters)');
    }
    if (card.proof && card.proof.length > 5000) {
      throw new Error('Card proof too long (max 5000 characters)');
    }
    
    // Sanitize content
    return {
      statement: SecurityService.sanitizeHTML(card.statement || ''),
      hints: SecurityService.sanitizeHTML(card.hints || ''),
      proof: SecurityService.sanitizeHTML(card.proof || ''),
      tags: (card.tags || []).filter(tag => 
        /^[a-zA-Z0-9-_\s]+$/.test(tag) && tag.length <= 50
      ).slice(0, 10) // Max 10 tags
    };
  }

  // Utility methods
  static createCardTitle(statement) {
    if (!statement) return 'Untitled';
    
    // Remove any markdown formatting
    let title = statement.replace(/[#*_`]/g, '').trim();
    
    // Truncate if too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    return title;
  }

  static sanitizeForMarkdown(text) {
    if (!text) return '';
    return text.replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();
  }

  static sanitizeForCSV(text) {
    if (!text) return '';
    return text.replace(/"/g, '""').replace(/\n/g, '\\n').trim();
  }

  static sanitizeHTML(text) {
    if (!text) return '';
    return SecurityService.sanitizeHTML(text);
  }

  static stripHTML(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
  }

  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }
}

export default ImportExportService;
