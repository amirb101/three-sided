const { onRequest } = require('firebase-functions/v2/https');

// Create a simple SVG-based image generator
function createCardSVG(cardData) {
  const statement = (cardData.statement || 'Three-Sided Flashcard - Master Any Subject')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .substring(0, 150);
  
  const subject = cardData.subject || 'Mathematics';
  const authorName = cardData.authorSlug || 'Three-Sided';
  const viewCount = cardData.viewCount || 100;
  const likeCount = cardData.likeCount || 25;
  
  return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bgGradient)"/>
      
      <!-- Card Background -->
      <rect x="40" y="40" width="1120" height="550" rx="24" fill="url(#cardGradient)" stroke="rgba(0,0,0,0.05)" stroke-width="1"/>
      
      <!-- Header -->
      <text x="80" y="110" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#667eea">📚 Three-Sided</text>
      <rect x="950" y="80" width="150" height="40" rx="20" fill="#667eea"/>
      <text x="1025" y="104" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle">${subject}</text>
      
      <!-- Statement -->
      <foreignObject x="80" y="160" width="1040" height="280">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; font-size: 32px; font-weight: 600; color: #1a202c; line-height: 1.4; word-wrap: break-word;">
          ${statement}
        </div>
      </foreignObject>
      
      <!-- Footer Line -->
      <line x1="80" y1="480" x2="1120" y2="480" stroke="#e2e8f0" stroke-width="2"/>
      
      <!-- Author -->
      <circle cx="110" cy="520" r="20" fill="#667eea"/>
      <text x="110" y="527" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle">${authorName.charAt(0).toUpperCase()}</text>
      <text x="145" y="527" font-family="system-ui, sans-serif" font-size="18" fill="#666">by ${authorName}</text>
      
      <!-- Stats -->
      <text x="950" y="520" font-family="system-ui, sans-serif" font-size="16" fill="#666">👁️ ${viewCount}</text>
      <text x="1050" y="520" font-family="system-ui, sans-serif" font-size="16" fill="#666">❤️ ${likeCount}</text>
    </svg>
  `;
}


/**
 * Generates dynamic card images for Google Images SEO
 * Simple SVG-based approach for reliability
 * URL: /generateCardImage?slug=CARD_SLUG
 */
exports.generateCardImage = onRequest({
  timeoutSeconds: 30,
  memory: '512MiB',
  invoker: 'public'
}, async (req, res) => {
  try {
    const slug = req.query.slug;
    
    if (!slug) {
      return res.status(400).send('Missing card slug parameter');
    }

    // Create default card data for testing
    const cardData = {
      statement: 'Three-Sided Flashcard - Master Any Subject with Interactive Learning',
      subject: 'Mathematics',
      authorSlug: 'three-sided',
      viewCount: 150,
      likeCount: 42
    };

    // Generate SVG
    const svg = createCardSVG(cardData);

    // Set proper headers
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.set('Content-Disposition', `inline; filename="flashcard-${slug}.svg"`);

    // Send the SVG
    res.send(svg);

  } catch (error) {
    console.error('Error generating card image:', error);
    res.status(500).send('Failed to generate image');
  }
});
