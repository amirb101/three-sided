const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const puppeteer = require('puppeteer');

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Generates dynamic card images for Google Images SEO
 * Similar to how Reddit generates preview images for posts
 * URL: /generateCardImage?slug=CARD_SLUG
 */
exports.generateCardImage = onRequest({
  timeoutSeconds: 30,
  memory: '1GiB',
  cpu: 1
}, async (req, res) => {
  try {
    const slug = req.query.slug;
    
    if (!slug) {
      return res.status(400).send('Missing card slug parameter');
    }

    // Get flashcard data
    console.log('🔍 Looking for card with slug:', slug);
    const cardDoc = await db.collection('publicCards').doc(slug).get();
    if (!cardDoc.exists) {
      console.log('❌ Card not found in publicCards collection');
      return res.status(404).send('Card not found');
    }

    const cardData = cardDoc.data();
    console.log('📄 Card data retrieved:', {
      statement: cardData.statement?.substring(0, 50) + '...',
      subject: cardData.subject,
      authorSlug: cardData.authorSlug,
      hasStatement: !!cardData.statement,
      hasHints: !!cardData.hints,
      hasProof: !!cardData.proof
    });
    
    // Get author profile info
    let authorInfo = { displayName: 'Anonymous', slug: '' };
    if (cardData.authorSlug) {
      const profileDoc = await db.collection('profiles').doc(cardData.authorSlug).get();
      if (profileDoc.exists) {
        authorInfo = profileDoc.data();
      }
    }

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport for optimal image size (1200x630 for Open Graph)
    await page.setViewport({ width: 1200, height: 630 });

    // Prepare card data for HTML template
    const statement = cardData.statement || cardData.question || 'Sample Mathematical Problem: Find the derivative of f(x) = x² + 3x + 2';
    const subject = cardData.subject || 'Mathematics';
    const tags = cardData.tags || ['calculus', 'derivatives'];
    const viewCount = cardData.viewCount || 42;
    const likeCount = cardData.likeCount || 7;
    const authorName = authorInfo.displayName || 'Anonymous';
    
    console.log('🎨 Rendering card with:', {
      statement: statement.substring(0, 100),
      subject,
      authorName,
      viewCount,
      likeCount,
      tagsCount: tags.length
    });
    
    // Clean statement for display (remove excessive LaTeX/HTML)
    const cleanStatement = statement
      .replace(/<[^>]*>/g, '') // Remove HTML
      .replace(/\$([^$]+)\$/g, '$1') // Simplify inline LaTeX
      .substring(0, 200); // Limit length

    // Create HTML template for the card image
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            width: 1200px;
            height: 630px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
          }
          
          .card {
            background: white;
            border-radius: 24px;
            padding: 40px;
            width: 100%;
            height: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
          }
          
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #667eea;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .subject-badge {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
          }
          
          .statement {
            font-size: 28px;
            font-weight: 600;
            color: #1a202c;
            line-height: 1.4;
            margin-bottom: 30px;
            flex-grow: 1;
            display: flex;
            align-items: center;
          }
          
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
          }
          
          .author {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 16px;
            color: #666;
          }
          
          .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 18px;
          }
          
          .stats {
            display: flex;
            gap: 24px;
            font-size: 16px;
            color: #666;
          }
          
          .stat {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .tags {
            position: absolute;
            bottom: 40px;
            right: 40px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            max-width: 300px;
          }
          
          .tag {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }
          
          .pattern {
            position: absolute;
            top: -50px;
            right: -50px;
            width: 200px;
            height: 200px;
            background: linear-gradient(45deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
            border-radius: 50%;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="pattern"></div>
          
          <div class="header">
            <div class="logo">
              📚 Three-Sided
            </div>
            <div class="subject-badge">${subject}</div>
          </div>
          
          <div class="statement">
            ${cleanStatement}
          </div>
          
          <div class="footer">
            <div class="author">
              <div class="avatar">${authorName.charAt(0).toUpperCase()}</div>
              <span>by ${authorName}</span>
            </div>
            
            <div class="stats">
              <div class="stat">
                <span>👁️</span>
                <span>${viewCount}</span>
              </div>
              <div class="stat">
                <span>❤️</span>
                <span>${likeCount}</span>
              </div>
            </div>
          </div>
          
          ${tags.length > 0 ? `
            <div class="tags">
              ${tags.slice(0, 4).map(tag => `<span class="tag">#${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `;

    // Load HTML content
    console.log('📝 Generated HTML snippet:', html.substring(html.indexOf('<body>'), html.indexOf('<body>') + 200));
    await page.setContent(html);
    
    // Wait for any fonts to load
    await page.waitForTimeout(1000);

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 }
    });

    await browser.close();

    // Set proper headers
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.set('Content-Disposition', `inline; filename="flashcard-${slug}.png"`);

    // Send the image
    res.send(screenshot);

  } catch (error) {
    console.error('Error generating card image:', error);
    res.status(500).send('Failed to generate image');
  }
});
