const functions = require("firebase-functions/v2/https");
const { onCall } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

// Simple HTTP request using Node.js built-ins
const https = require('https');
const zlib = require('zlib');
const { URL } = require('url');

// Stack Exchange API specific request function
function makeStackExchangeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    // Add required headers for Stack Exchange API
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'ThreeSided-Flashcard-App/1.0 (https://three-sided.com; three.dash.sided@gmail.com)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      // Handle gzip compression if present
      let stream = res;
      if (res.headers['content-encoding'] === 'gzip') {
        const zlib = require('zlib');
        stream = res.pipe(zlib.createGunzip());
      }
      
      stream.on('data', chunk => data += chunk);
      stream.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          // Check for Stack Exchange API errors
          if (parsed.error_id) {
            reject(new Error(`Stack Exchange API error: ${parsed.error_name} - ${parsed.error_message}`));
            return;
          }
          
          resolve(parsed);
        } catch (e) {
          reject(new Error(`JSON parse failed: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000); // 10 second timeout
    req.end();
  });
}



function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

admin.initializeApp();
const db = admin.firestore();

// 🟢 Declare secrets
const stripeSecret = defineSecret("STRIPE_SECRET");
const webhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const deepseekSecret = defineSecret("DEEPSEEK_API_KEY");

const ALLOW_GUEST_USAGE = true; // ✅ Toggle this to false to disable guest access entirely
const GUEST_LIMIT = 5;
const USER_LIMIT = 1; // 1 per day for free users
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours (1 day)
const GUEST_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days


// 🟢 Use process.env inside runtime
const getStripe = () => require("stripe")(process.env.STRIPE_SECRET);

// ✅ createCheckoutSession
exports.createCheckoutSession = functions.onRequest(
  {
    region: "us-central1",
    secrets: [stripeSecret],
  },
  (req, res) => {
    cors(req, res, async () => {
      const stripe = getStripe();
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.split("Bearer ")[1]
        : null;

      if (!idToken) return res.status(401).json({ error: "Missing ID token" });

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "subscription",
          line_items: [
            {
              price: "price_1RUvcJE3qmOAkttR2Rh4YzOY", // replace if needed
              quantity: 1,
            },
          ],
          success_url:
            "https://three-sided.com/premium-success",
          cancel_url:
            "https://three-sided.com/premium-cancel",
          metadata: { firebaseUID: uid },
        });

        res.status(200).json({ id: session.id });
      } catch (err) {
        console.error("Checkout session error:", err.stack || err);
        res.status(500).json({
          error: "Internal Server Error",
          message: err.message,
        });
      }
    });
  }
);

// ✅ Simple Automated Post
exports.performAutomatedPost = onCall({ secrets: [deepseekSecret] }, async (request) => {
  // Admin authorization check
  if (!request.auth || request.auth.token.email !== "three.dash.sided@gmail.com") {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    console.log('Starting simple automated post...');
    
    const { selectedBotId } = request.data || {};
    
    if (!selectedBotId) {
      throw new functions.https.HttpsError('invalid-argument', 'selectedBotId is required');
    }

    // Step 1: Get random math post using direct Stack Exchange API call
    console.log('Step 1: Getting random math post...');
    const params = {
      site: 'math.stackexchange.com',
      tagged: 'abstract-algebra;linear-algebra;real-analysis;complex-analysis;topology',
      sort: 'votes',
      order: 'asc', // Changed to ascending to get less popular questions
      pagesize: '50', // Increased to get more variety
      page: Math.floor(Math.random() * 5) + 1, // Random page 1-5
      filter: 'withbody'
    };

    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `https://api.stackexchange.com/2.3/questions?${queryString}`;
    console.log('Fetching random math posts from:', url);

    try {
      const data = await makeStackExchangeRequest(url);
      console.log('Stack Exchange API response received, items count:', data.items ? data.items.length : 0);

      if (!data.items || data.items.length === 0) {
        console.error('No questions found in API response');
        throw new functions.https.HttpsError('not-found', 'No questions found');
      }

      // Pick a random question from the results
      const randomIndex = Math.floor(Math.random() * data.items.length);
      const question = data.items[randomIndex];
      console.log(`Selected question: "${question.title}"`);

      // Step 2: Convert to flashcard using existing logic
      console.log('Step 2: Converting to flashcard...');
      let flashcardData;
      try {
        // Pass the question data directly to avoid a second API call
        console.log('Calling convertStackExchangeToFlashcard with question data...');
        flashcardData = await convertStackExchangeToFlashcard(question.link, question);
        console.log('convertStackExchangeToFlashcard completed, result:', JSON.stringify(flashcardData, null, 2));
        
        if (!flashcardData || !flashcardData.statement || !flashcardData.proof) {
          console.error('Flashcard data validation failed:', flashcardData);
          throw new functions.https.HttpsError('failed-precondition', 'Failed to convert question to flashcard format');
        }
        
        console.log('Flashcard conversion successful');
      } catch (conversionError) {
        console.error('Flashcard conversion failed:', conversionError);
        console.error('Conversion error stack:', conversionError.stack);
        throw new functions.https.HttpsError('failed-precondition', `Flashcard conversion failed: ${conversionError.message}`);
      }

      // Step 3: Get the selected bot
      console.log('Step 3: Getting selected bot...');
      const botDoc = await db.collection('botAccounts').doc(selectedBotId).get();
      if (!botDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Selected bot not found');
      }
      
      const publishingBot = { id: botDoc.id, ...botDoc.data() };
      console.log(`Using bot: ${publishingBot.displayName}`);

      // Step 4: Publish using embedded logic
      console.log('Step 4: Publishing flashcard...');
      
      // Prepare flashcard data
      const cardData = {
        statement: flashcardData.statement,
        hint: flashcardData.hint,
        proof: flashcardData.proof,
        tags: flashcardData.tags,
        originalUrl: question.link,
        originalTitle: question.title
      };

      // Create unique slug
      const baseSlug = slugify(question.title);
      const uniqueSlug = await ensureUniqueCardSlug(baseSlug);

      // Ensure bot has user account
      let botUserId = publishingBot.userId;
      if (!botUserId) {
        console.log(`Creating user account for bot: ${publishingBot.displayName}`);
        
        try {
          const botUser = await admin.auth().createUser({
            email: publishingBot.email,
            displayName: publishingBot.displayName,
            password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
            disabled: false
          });
          
          botUserId = botUser.uid;
          
          // Create user document
          await db.collection("users").doc(botUserId).set({
            isPremium: false,
            email: publishingBot.email,
            displayName: publishingBot.displayName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isBot: true
          });
          
          // Create profile
          await db.collection("profiles").doc(publishingBot.slug).set({
            displayName: publishingBot.displayName,
            slug: publishingBot.slug,
            bio: publishingBot.bio || `Mathematics researcher at ${publishingBot.institution}`,
            institution: publishingBot.institution,
            userId: botUserId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isBot: true
          });
          
          // Create userToSlug mapping
          await db.collection("userToSlug").doc(botUserId).set({ slug: publishingBot.slug });
          
          // Update bot account with userId
          await db.collection("botAccounts").doc(publishingBot.id).update({ userId: botUserId });
          
          console.log(`Successfully created user account for bot: ${publishingBot.displayName}`);
        } catch (error) {
          console.error(`Failed to create user account for bot: ${publishingBot.displayName}`, error);
          throw new functions.https.HttpsError('internal', `Failed to create bot user account: ${error.message}`);
        }
      }

      // Create the flashcard
      console.log(`Creating flashcard with slug: ${uniqueSlug}`);
      
      let cardRef;
      try {
        cardRef = await db.collection("cards").add({
          statement: cardData.statement,
          hints: cardData.hint, // Just use whatever the AI returns
          proof: cardData.proof,
          tags: cardData.tags,
          userId: botUserId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isPublic: false
        });

        // Make it public
        await db.collection("publicCards").doc(uniqueSlug).set({
          statement: cardData.statement,
          hints: cardData.hint, // Just use whatever the AI returns
          proof: cardData.proof,
          tags: cardData.tags,
          userId: botUserId,
          authorSlug: publishingBot.slug,
          slug: uniqueSlug,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          likeCount: 0,
          viewCount: 0,
          importCount: 0
        });
        
        console.log(`Successfully created flashcard: ${cardRef.id}`);
      } catch (error) {
        console.error(`Failed to create flashcard: ${error.message}`);
        throw new functions.https.HttpsError('internal', `Failed to create flashcard: ${error.message}`);
      }

      // Track the automated card
      await db.collection("automatedCards").add({
        cardId: cardRef.id,
        botId: publishingBot.id,
        botName: publishingBot.displayName,
        public: true,
        originalUrl: question.link,
        originalTitle: question.title,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Automated post completed successfully');

      return {
        success: true,
        cardSlug: uniqueSlug,
        title: question.title,
        publishingBot: publishingBot.displayName,
        url: `https://three-sided.com/card/${uniqueSlug}`
      };

    } catch (apiError) {
      console.error('Stack Exchange API error:', apiError);
      throw new functions.https.HttpsError('internal', `Stack Exchange API error: ${apiError.message}`);
    }

  } catch (error) {
    console.error('Error performing automated post:', error);
    throw new functions.https.HttpsError('internal', `Failed to perform automated post: ${error.message}`);
  }
});

// Simple test function to verify automation components work - UPDATED
exports.testAutomationComponents = onCall({ secrets: [deepseekSecret] }, async (request) => {
  // Admin authorization check
  if (!request.auth || request.auth.token.email !== "three.dash.sided@gmail.com") {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    console.log('Testing automation components...');
    
    // Test 1: Check bot accounts first (simplest test)
    console.log('Test 1: Checking bot accounts...');
    const botSnapshot = await db.collection('botAccounts').get();
    console.log(`✅ Found ${botSnapshot.size} bot accounts`);

    // Test 2: Get random math post (using direct Stack Exchange API call)
    console.log('Test 2: Getting random math post...');
    const params = {
      site: 'math.stackexchange.com',
      tagged: 'abstract-algebra;linear-algebra;real-analysis;complex-analysis;topology',
      sort: 'votes',
      order: 'asc', // Changed to ascending to get less popular questions
      pagesize: '20', // Reduced for faster testing
      page: Math.floor(Math.random() * 3) + 1 // Random page 1-3
    };

    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `https://api.stackexchange.com/2.3/questions?${queryString}`;
    console.log('Fetching random math posts from:', url);

    const data = await makeStackExchangeRequest(url);

    if (!data.items || data.items.length === 0) {
      throw new functions.https.HttpsError('not-found', 'No questions found');
    }

    // Pick a random question from the results
    const randomIndex = Math.floor(Math.random() * data.items.length);
    const question = data.items[randomIndex];
    console.log('✅ Random math post works:', question.title);

    // Test 3: Convert to flashcard (skip if question is too complex)
    console.log('Test 3: Converting to flashcard...');
    let flashcardData;
    try {
      flashcardData = await convertStackExchangeToFlashcard(question.link);
      console.log('✅ Flashcard conversion works:', flashcardData.statement.substring(0, 50) + '...');
    } catch (flashcardError) {
      console.log('⚠️ Flashcard conversion failed, but continuing test:', flashcardError.message);
      flashcardData = { statement: 'Test statement', hint: 'Test hint', proof: 'Test proof', tags: ['test'] };
    }

    return {
      success: true,
      message: 'All automation components are working!',
      questionTitle: question.title,
      flashcardStatement: flashcardData.statement.substring(0, 100) + '...',
      botCount: botSnapshot.size
    };

  } catch (error) {
    console.error('Error testing automation components:', error);
    throw new functions.https.HttpsError('internal', `Test failed: ${error.message}`);
  }
});

// Very simple test function to isolate issues
exports.simpleTest = onCall({}, async (request) => {
  try {
    console.log('Simple test function called');
    
    // Test 1: Basic response
    console.log('Test 1: Basic response');
    
    // Test 2: Check bot accounts
    console.log('Test 2: Checking bot accounts...');
    const botSnapshot = await db.collection('botAccounts').get();
    console.log(`Found ${botSnapshot.size} bot accounts`);

    return {
      success: true,
      message: 'Simple test passed!',
      botCount: botSnapshot.size,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error in simple test:', error);
    throw new functions.https.HttpsError('internal', `Simple test failed: ${error.message}`);
  }
});

// Helper function to convert Stack Exchange post to flashcard
async function convertStackExchangeToFlashcard(url, questionData = null) {
  try {
    let question;
    
    if (questionData) {
      // Use provided question data
      question = questionData;
    } else {
      // Extract question ID from URL and fetch data
      const match = url.match(/\/questions\/(\d+)/);
      if (!match) {
        throw new Error('Invalid Stack Exchange URL');
      }
      
      const questionId = match[1];
      
      // Fetch question data
      const params = {
        site: 'math.stackexchange.com',
        order: 'desc',
        sort: 'votes',
        filter: 'withbody' // Add this to get the question body
      };
      
      const questionQueryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const questionUrl = `https://api.stackexchange.com/2.3/questions/${questionId}?${questionQueryString}`;
      const data = await makeStackExchangeRequest(questionUrl);
      
      if (!data.items || data.items.length === 0) {
        throw new Error('Question not found');
      }
      
      question = data.items[0];
    }
    
    // Use DeepSeek to convert to flashcard format
    const prompt = `
Convert this Math Stack Exchange question into a clean, educational flashcard for undergraduate mathematics students.

Title: ${question.title}
Question: ${question.body.replace(/<[^>]*>/g, '')}

Create a flashcard and return it as a JSON object with exactly these fields:

{
  "statement": "Write the core problem or question in clear, concise language. Focus on what the student needs to solve or understand. Use LaTeX for mathematical expressions.",
  "hint": "Provide 2-3 key concepts, theorems, or approaches that would help solve this problem. Be specific but don't give away the solution.",
  "proof": "Provide a complete, step-by-step solution. Use clear mathematical language and proper LaTeX formatting. Include all necessary steps and explanations.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANT REQUIREMENTS:
- Write as if explaining to a mathematics undergraduate student
- Use proper LaTeX syntax for all mathematical expressions
- Keep language clear and educational
- Do NOT include any meta-commentary about the flashcard quality
- Do NOT include phrases like "This flashcard demonstrates..." or "The solution shows..."
- Do NOT include educational notes or explanations about what the flashcard does well
- Focus purely on the mathematical content
- Make the statement concise but complete
- Ensure the proof is thorough and well-explained
- Use appropriate mathematical terminology for the level
- Return ONLY the JSON object, no additional text or commentary
- Tags should be an array of 3-5 relevant mathematical topics

Example tags: ["calculus", "differential equations", "optimization", "linear algebra", "mathematical modeling"]
`;

    const deepSeekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!deepSeekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepSeekResponse.status}`);
    }

    const deepSeekData = await deepSeekResponse.json();
    const content = deepSeekData.choices[0].message.content;

    // Parse JSON response
    let flashcardData;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/```\n?/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/```\n?/, '');
      }
      
      flashcardData = JSON.parse(cleanContent);
    } catch (parseError) {
      throw new Error('Failed to parse AI response');
    }

    // Ensure tags is an array
    if (!Array.isArray(flashcardData.tags)) {
      flashcardData.tags = [];
    }

    return flashcardData;

  } catch (error) {
    console.error('Error converting Stack Exchange post:', error);
    throw error;
  }
}

// ✅ getRandomMathPost
exports.getRandomMathPost = onCall({ secrets: [deepseekSecret] }, async (request) => {
  // Admin authorization check
  if (!request.auth || request.auth.token.email !== "three.dash.sided@gmail.com") {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  try {
    // Stack Exchange API parameters for random answered math questions
    const params = {
      site: 'math.stackexchange.com',
      tagged: 'abstract-algebra;linear-algebra;real-analysis;complex-analysis;topology',
      sort: 'votes',
      order: 'asc', // Changed to ascending to get less popular questions
      pagesize: '50',
      page: Math.floor(Math.random() * 5) + 1
    };

    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `https://api.stackexchange.com/2.3/questions?${queryString}`;
    console.log('Fetching random math posts from:', url);

    const data = await makeStackExchangeRequest(url);

    if (!data.items || data.items.length === 0) {
      throw new functions.https.HttpsError('not-found', 'No questions found');
    }

    // Pick a random question from the results
    const randomIndex = Math.floor(Math.random() * data.items.length);
    const question = data.items[randomIndex];

    // Get the accepted answer
    const answerParams = {
      site: 'math.stackexchange.com',
      order: 'desc',
      sort: 'votes'
    };

    const answerQueryString = Object.keys(answerParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(answerParams[key])}`)
      .join('&');

    const answerUrl = `https://api.stackexchange.com/2.3/questions/${question.question_id}/answers?${answerQueryString}`;
    const answerData = await makeStackExchangeRequest(answerUrl);

    let acceptedAnswer = null;
    if (answerData.items && answerData.items.length > 0) {
      // Find the accepted answer or the highest voted answer
      acceptedAnswer = answerData.items.find(ans => ans.is_accepted) || answerData.items[0];
    }

    return {
      question: {
        id: question.question_id,
        title: question.title,
        body: question.body,
        tags: question.tags,
        score: question.score,
        answer_count: question.answer_count,
        view_count: question.view_count,
        created_date: question.creation_date,
        link: question.link
      },
      acceptedAnswer: acceptedAnswer ? {
        id: acceptedAnswer.answer_id,
        body: acceptedAnswer.body,
        score: acceptedAnswer.score,
        is_accepted: acceptedAnswer.is_accepted
      } : null,
      url: question.link
    };

  } catch (error) {
    console.error('Error getting random math post:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get random math post');
  }
});

// ✅ handleStripeWebhook
exports.handleStripeWebhook = functions.onRequest(
  {
    region: "us-central1",
    secrets: [stripeSecret, webhookSecret],
    rawBody: true,
  },
  async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const uid = session.metadata.firebaseUID;
      const customerId = session.customer;

      try {
        await db.collection("users").doc(uid).update({
          isPremium: true,
          stripeCustomerId: customerId,
          subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Marked user ${uid} as premium.`);
        return res.status(200).send("Success");
      } catch (err) {
        console.error("Firestore update failed:", err);
        return res.status(500).send("Database update failed");
      }
    }

    res.status(200).send("Event received");
  }
);

// ✅ createPortalLink
exports.createPortalLink = functions.onRequest(
  {
    region: "us-central1",
    secrets: [stripeSecret],
  },
  async (req, res) => {
    const allowedOrigins = [
      "https://three-sided.com",
      "https://three-sided-flashcard-app.web.app"
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    (async () => {
      const stripe = getStripe();
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.split("Bearer ")[1]
        : null;

      if (!idToken) {
        console.warn("Missing ID token");
        return res.status(401).json({ error: "Missing ID token" });
      }

      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const doc = await db.collection("users").doc(uid).get();
        const customerId = doc.data()?.stripeCustomerId;

        if (!customerId) {
          return res
            .status(404)
            .json({ error: "No Stripe customer ID found" });
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: "https://three-sided.com/",
        });

        return res.status(200).json({ url: session.url });
      } catch (err) {
        console.error("Error creating billing portal:", err);
        return res
          .status(500)
          .json({ error: "Internal server error", message: err.message });
      }
    })();
  }
);

exports.deepseekAutofill = functions.onRequest(
  {
    region: "us-central1",
    secrets: [deepseekSecret],
  },
  async (req, res) => {
    const allowedOrigins = [
      "https://three-sided.com",
      "https://three-sided-flashcard-app.web.app"
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null;

    if (!idToken) {
        if (!ALLOW_GUEST_USAGE) {
            return res.status(401).json({ error: "Login required." });
        }

        // ✅ Guest rate limit handling
        const guestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const usageRef = db.collection("guestUsage").doc(guestIp);
        const usageSnap = await usageRef.get();
        const now = Date.now();
        const thirtyDays = GUEST_WINDOW_MS;

        const usage = usageSnap.exists ? usageSnap.data() : { timestamps: [] };
        const recentTimestamps = (usage.timestamps || []).filter(ts => now - ts < thirtyDays);

        if (recentTimestamps.length >= GUEST_LIMIT) {
            const retryAfter = thirtyDays - (now - Math.min(...recentTimestamps));
            return res.status(429).json({
            error: "Guest rate limit exceeded.",
            retryAfter
            });
        }
        if (recentTimestamps.length !== usage.timestamps.length) {
            await usageRef.set({ timestamps: [...recentTimestamps, now] });
        }

        }
    try {
  let uid = null;
  let isPremium = false;

  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;

      // 🔐 Check premium status
      const userDoc = await db.collection("users").doc(uid).get();
      isPremium = userDoc.exists && userDoc.data().isPremium;
    } catch (e) {
      console.warn("Invalid or expired token:", e.message);
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  }

  // 🟡 Rate limit free **logged-in** users (non-premium)
  if (uid && !isPremium) {
    const now = Date.now();
    const windowMs = WINDOW_MS; // 1 hour
    const usageRef = db.collection("users").doc(uid).collection("usage").doc("deepseek");

    const usageSnap = await usageRef.get();
    const usage = usageSnap.exists ? usageSnap.data() : { timestamps: [] };
    const recentTimestamps = usage.timestamps.filter(ts => now - ts < windowMs);

    if (recentTimestamps.length >= USER_LIMIT) {
      const retryAfter = windowMs - (now - Math.min(...recentTimestamps));
      return res.status(429).json({
        error: "Daily limit exceeded for free users. Upgrade to premium for unlimited access.",
        retryAfter
      });
    }

    if (recentTimestamps.length !== usage.timestamps.length) {
        await usageRef.set({ timestamps: [...recentTimestamps, now] });
    }

  }

  const { statement } = req.body;

  const openaiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `ROLE: You are a professional mathematics tutor and LaTeX expert.

TASK: Generate educational content for a mathematical statement.

INPUT FORMAT: You will receive a mathematical statement that may contain LaTeX notation.

OUTPUT FORMAT: You MUST respond with ONLY a valid JSON object. No other text, explanations, or formatting.

REQUIRED JSON STRUCTURE:
{
  "hints": "<string>",
  "proof": "<string>",
  "tags": ["<string>", "<string>", ...]
}

FIELD SPECIFICATIONS:
1. "hints": 
   - Must be a string (not null, not array)
   - 1-3 sentences maximum
   - Provide guidance without giving away the answer
   - Use LaTeX notation where appropriate: $...$ for inline, $$...$$ for display
   - Example: "Start by applying the definition of a derivative as a limit. Consider using the product rule for $f(x) = x \\sin(x)$."

2. "proof":
   - Must be a string (not null, not array)
   - Provide a complete, step-by-step mathematical proof
   - Use proper LaTeX notation throughout
   - Include line breaks using \\n for readability
   - Structure: Given → Method → Steps → Conclusion
   - Example format: "Given: ... \\n\\nMethod: We use... \\n\\nStep 1: ... \\n\\nStep 2: ... \\n\\nTherefore: ..."

3. "tags":
   - Must be an array of strings
   - Include 3-6 relevant mathematical topic tags
   - Use standard mathematical terminology
   - Examples: ["calculus", "derivatives", "limits", "trigonometry"]
   - No duplicates, lowercase preferred

CONSTRAINTS:
- Response must be valid JSON that can be parsed by JSON.parse()
- No markdown formatting, no code blocks, no backticks
- No explanatory text before or after the JSON
- If you cannot process the input, return: {"hints": "Unable to process", "proof": "Unable to process", "tags": ["general"]}

EXAMPLE OUTPUT:
{"hints": "Use the fundamental theorem of calculus and consider the chain rule for composite functions.", "proof": "Given: $\\frac{d}{dx}\\int_0^x f(t)dt$ \\n\\nBy the Fundamental Theorem of Calculus: \\n\\nStep 1: $\\frac{d}{dx}\\int_0^x f(t)dt = f(x)$ \\n\\nStep 2: This follows directly from FTC Part 1 \\n\\nTherefore: $\\frac{d}{dx}\\int_0^x f(t)dt = f(x)$", "tags": ["calculus", "fundamental-theorem", "integration", "differentiation"]}`
        },
        {
          role: "user",
          content: `Statement: ${statement}`
        }
      ]
    })
  });

  if (!openaiResponse.ok) {
    throw new Error(`DeepSeek API error: ${openaiResponse.status}`);
  }

  const result = await openaiResponse.json();
  const message = result.choices?.[0]?.message?.content || "";

  let parsed;
  try {
    const jsonMatch = message.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("Failed to parse JSON from DeepSeek:", message);
    return res.status(500).json({ error: "Malformed JSON from DeepSeek" });
  }

  res.status(200).json({
    hints: parsed.hints || "",
    proof: parsed.proof || "",
    tags: Array.isArray(parsed.tags) ? parsed.tags : []
  });

} catch (err) {
  console.error("DeepSeek autofill error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
}
}
);


exports.convertToLatex = functions.onRequest(
  {
    region: "us-central1",
    secrets: [deepseekSecret],
  },
  async (req, res) => {
    const allowedOrigins = [
      "https://three-sided.com",
      "https://three-sided-flashcard-app.web.app"
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    let uid = null;
    let isPremium = false;

    try {
      // 🔓 Authenticate and determine user type
      if (idToken) {
        try {
          const decoded = await admin.auth().verifyIdToken(idToken);
          uid = decoded.uid;

          const userDoc = await db.collection("users").doc(uid).get();
          isPremium = userDoc.exists && userDoc.data().isPremium === true;
        } catch (err) {
          console.warn("Invalid ID token:", err.message);
          return res.status(401).json({ error: "Invalid or expired token." });
        }
      } else if (!ALLOW_GUEST_USAGE) {
        return res.status(401).json({ error: "Login required." });
      }

      // 🔁 Rate limit guests
      if (!uid && ALLOW_GUEST_USAGE) {
        const guestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const usageRef = db.collection("guestUsage").doc(guestIp);
        const usageSnap = await usageRef.get();
        const now = Date.now();
        const thirtyDays = GUEST_WINDOW_MS;

        const usage = usageSnap.exists ? usageSnap.data() : { timestamps: [] };
        const recentTimestamps = usage.timestamps.filter(ts => now - ts < thirtyDays);

        if (recentTimestamps.length >= GUEST_LIMIT) {
          const retryAfter = thirtyDays - (now - Math.min(...recentTimestamps));
          return res.status(429).json({ error: "Guest rate limit exceeded", retryAfter });
        }

        if (recentTimestamps.length !== usage.timestamps.length) {
            await usageRef.set({ timestamps: [...recentTimestamps, now] });
        }

      }

      // 🔁 Rate limit non-premium users
      if (uid && !isPremium) {
        const now = Date.now();
        const windowMs = WINDOW_MS;
        const usageRef = db.collection("users").doc(uid).collection("usage").doc("convertToLatex");
        const usageSnap = await usageRef.get();
        const usage = usageSnap.exists ? usageSnap.data() : { timestamps: [] };
        const recent = usage.timestamps.filter(ts => now - ts < windowMs);

        if (recent.length >= USER_LIMIT) {
          const retryAfter = windowMs - (now - Math.min(...recent));
          return res.status(429).json({ error: "Rate limit exceeded", retryAfter });
        }

        if (recent.length !== usage.timestamps.length) {
          await usageRef.set({ timestamps: [...recent, now] });
        }
      }

      // 🧪 Validate input
      const input = req.body.input;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ error: "Invalid input" });
      }

      // 🧠 DeepSeek API call
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `ROLE: You are a professional LaTeX conversion expert.

TASK: Convert natural language mathematical text into properly formatted LaTeX notation.

INPUT FORMAT: You will receive natural language text describing mathematical concepts, equations, or expressions.

OUTPUT FORMAT: Return ONLY the LaTeX-formatted version of the input. No explanations, no additional text.

CONVERSION RULES:
1. INLINE MATH: Use $...$ for inline mathematical expressions
2. DISPLAY MATH: Use $$...$$ for standalone equations or complex expressions
3. PRESERVE TEXT: Keep non-mathematical text as regular text
4. COMMON CONVERSIONS:
   - "squared" → "^2"
   - "cubed" → "^3" 
   - "to the power of n" → "^n"
   - "square root of x" → "\\sqrt{x}"
   - "nth root of x" → "\\sqrt[n]{x}"
   - "infinity" → "\\infty"
   - "integral" → "\\int"
   - "sum from 1 to n" → "\\sum_{i=1}^{n}"
   - "limit as x approaches a" → "\\lim_{x \\to a}"
   - "derivative of f with respect to x" → "\\frac{df}{dx}"
   - "partial derivative" → "\\frac{\\partial f}{\\partial x}"
   - "greater than or equal" → "\\geq"
   - "less than or equal" → "\\leq"
   - "not equal" → "\\neq"
   - "approximately equal" → "\\approx"
   - "plus or minus" → "\\pm"
   - "multiplication" → "\\cdot" or "\\times"
   - "fraction a over b" → "\\frac{a}{b}"

FUNCTION CONVERSIONS:
- "sin", "cos", "tan" → "\\sin", "\\cos", "\\tan"
- "log" → "\\log"
- "ln" → "\\ln"
- "exp" → "\\exp"

GREEK LETTERS:
- "alpha" → "\\alpha", "beta" → "\\beta", "gamma" → "\\gamma"
- "delta" → "\\delta", "epsilon" → "\\epsilon", "theta" → "\\theta"
- "lambda" → "\\lambda", "mu" → "\\mu", "pi" → "\\pi"
- "sigma" → "\\sigma", "omega" → "\\omega"

SPECIAL SYMBOLS:
- "belongs to" → "\\in"
- "subset" → "\\subset"
- "union" → "\\cup"
- "intersection" → "\\cap"
- "empty set" → "\\emptyset"

CONSTRAINTS:
- Do not change text that is already in LaTeX format
- Preserve sentence structure and punctuation
- If input contains mixed text and math, format only the mathematical parts
- Return the converted text exactly as it should appear

EXAMPLES:
Input: "The derivative of x squared with respect to x is 2x"
Output: "The derivative of $x^2$ with respect to $x$ is $2x$"

Input: "Find the limit as x approaches infinity of 1 over x"
Output: "Find the $\\lim_{x \\to \\infty} \\frac{1}{x}$"

Input: "The integral from 0 to pi of sin x dx equals 2"
Output: "The $\\int_0^{\\pi} \\sin x \\, dx = 2$"`
            },
            {
              role: "user",
              content: input
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const result = await response.json();
      const message = result.choices?.[0]?.message?.content;

      if (!message) {
        throw new Error("DeepSeek response malformed");
      }

      res.status(200).json({ latex: message });

    } catch (err) {
      console.error("Latex conversion error:", err.stack || err.message);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

exports.removeFriendship = functions.onRequest(async (req, res) => {
  const { userId, friendId } = req.body;

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null;

  if (!idToken) return res.status(401).json({ error: "Missing ID token" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.uid !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const batch = db.batch();

    const userFriendRef = db.collection('userFriends').doc(userId).collection('friends').doc(friendId);
    const friendUserRef = db.collection('userFriends').doc(friendId).collection('friends').doc(userId);

    batch.delete(userFriendRef);
    batch.delete(friendUserRef);

    await batch.commit();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error removing friendship:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

exports.autoTagOnly = functions.onRequest(
  {
    region: "us-central1",
    secrets: [deepseekSecret],
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://three-sided.com");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null;

    if (!idToken) {
        if (!ALLOW_GUEST_USAGE) {
            return res.status(401).json({ error: "Login required." });
        }

        // ✅ Guest rate limit handling
        const guestIp = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
        const usageRef = db.collection("guestUsage").doc(guestIp);
        const usageSnap = await usageRef.get();
        const now = Date.now();
        const thirtyDays = GUEST_WINDOW_MS;

        const usage = usageSnap.exists ? usageSnap.data() : { timestamps: [] };
        const recentTimestamps = (usage.timestamps || []).filter(ts => now - ts < thirtyDays);

        if (recentTimestamps.length >= GUEST_LIMIT) {
            const retryAfter = thirtyDays - (now - Math.min(...recentTimestamps));
            return res.status(429).json({
            error: "Guest rate limit exceeded.",
            retryAfter
            });
        }

        if (recentTimestamps.length !== usage.timestamps.length) {
            await usageRef.set({ timestamps: [...recentTimestamps, now] });
        }


        // ⚠️ Proceed with guest access (no premium features)
        }


    try {
  let uid = null;
  let isPremium = false;

  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;

      const userDoc = await db.collection("users").doc(uid).get();
      isPremium = userDoc.exists && userDoc.data().isPremium;
    } catch (e) {
      console.warn("Invalid or expired ID token:", e.message);
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  }

  // 🟡 Rate limit for logged-in free users
  if (uid && !isPremium) {
    const now = Date.now();
    const windowMs = WINDOW_MS;
    const usageRef = db.collection("users").doc(uid).collection("usage").doc("autoTagOnly");

    const usageSnap = await usageRef.get();
    const usage = usageSnap.exists ? usageSnap.data() : { timestamps: [] };
    const recent = usage.timestamps.filter(ts => now - ts < windowMs);

    if (recent.length >= USER_LIMIT) {
      const retryAfter = windowMs - (now - Math.min(...recent));
      return res.status(429).json({ 
        error: "Daily limit exceeded for free users. Upgrade to premium for unlimited access.", 
        retryAfter 
      });
    }

    if (recent.length !== usage.timestamps.length) {
        await usageRef.set({ timestamps: [...recent, now] });
    }

  }

  // ✅ Validate input
  const { statement } = req.body;
  if (!statement || typeof statement !== "string") {
    return res.status(400).json({ error: "Invalid statement" });
  }

  // ✅ DeepSeek call
  const openaiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `ROLE: You are an expert mathematical topic classifier.

TASK: Generate topic tags for a mathematical statement.

INPUT FORMAT: You will receive a mathematical statement that may contain LaTeX notation.

OUTPUT FORMAT: You MUST respond with ONLY a valid JSON array. No other text, explanations, or formatting.

REQUIRED JSON STRUCTURE: ["tag1", "tag2", "tag3", ...]

SPECIFICATIONS:
- Response must be a JSON array of strings
- Include 3-6 relevant mathematical topic tags
- Use lowercase, hyphenated format (e.g., "linear-algebra", "differential-equations")
- Choose from standard mathematical domains:
  * "algebra", "calculus", "geometry", "trigonometry"
  * "linear-algebra", "differential-equations", "complex-analysis"
  * "topology", "number-theory", "probability", "statistics"
  * "discrete-math", "graph-theory", "optimization"
  * "real-analysis", "abstract-algebra", "functional-analysis"
- Be specific when possible (e.g., prefer "eigenvalues" over just "algebra")
- No duplicates, no empty strings
- If uncertain, include "general-mathematics"

CONSTRAINTS:
- Response must be valid JSON that can be parsed by JSON.parse()
- No explanatory text before or after the JSON array
- No markdown formatting, no code blocks
- If you cannot process the input, return: ["general-mathematics"]

EXAMPLE OUTPUTS:
["calculus", "derivatives", "limits"]
["linear-algebra", "eigenvalues", "matrix-theory"]
["differential-equations", "boundary-value-problems"]`
        },
        {
          role: "user",
          content: `Statement: ${statement}`
        }
      ]
    })
  });

  if (!openaiResponse.ok) {
    throw new Error(`DeepSeek API error: ${openaiResponse.status}`);
  }

  const result = await openaiResponse.json();
  const message = result.choices?.[0]?.message?.content;

  const jsonMatch = message.match(/\[.*?\]/s); // simple bracket capture
  if (!jsonMatch) throw new Error("No JSON array found");

  const tags = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(tags)) throw new Error("Tags is not an array");

  res.status(200).json({ tags });

} catch (err) {
  console.error("Auto-tag error:", err);
  res.status(500).json({ error: "Internal error", message: err.message });
}
  });

  const { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } = require("firebase-functions/v2/firestore");
  // Flashcard created
  exports.onFlashcardCreate = onDocumentCreated("flashcards/{docId}", async (event) => {
    const data = event.data?.data();
    const userId = data?.userId;
    if (!userId) return;
    const userRef = db.collection("users").doc(userId);
    await userRef.set({
      flashcardCount: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
  });
  
  // Flashcard deleted
  exports.onFlashcardDelete = onDocumentDeleted("flashcards/{docId}", async (event) => {
    const data = event.data?.data();
    const userId = data?.userId;
    if (!userId) return;
    const userRef = db.collection("users").doc(userId);
    await userRef.set({
      flashcardCount: admin.firestore.FieldValue.increment(-1),
    }, { merge: true });
  });

// --- Upvotes Received Tracking ---
exports.onPublicCardUpdate = onDocumentUpdated("publicCards/{cardId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!before || !after || before.likeCount === after.likeCount) return;

  const userId = after.userId;
  const diff = (after.likeCount || 0) - (before.likeCount || 0);
  if (!userId || diff === 0) return;

  const userRef = db.collection("users").doc(userId);
  await userRef.set({
    upvotesReceived: admin.firestore.FieldValue.increment(diff),
  }, { merge: true });
});




exports.upvotePublicCard = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  const { cardId } = request.data;

  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to upvote.');
  if (!cardId) throw new functions.https.HttpsError('invalid-argument', 'Missing cardId.');

  const upvoteRef = db.collection("publicCards").doc(cardId).collection("upvotes").doc(uid);
  const cardRef = db.collection("publicCards").doc(cardId);

  // Use a transaction for atomicity
  await db.runTransaction(async (txn) => {
    const upvoteDoc = await txn.get(upvoteRef);
    if (upvoteDoc.exists) {
      throw new functions.https.HttpsError('already-exists', 'You have already upvoted this card.');
    }
    txn.set(upvoteRef, { createdAt: admin.firestore.FieldValue.serverTimestamp() });
    txn.update(cardRef, { likeCount: admin.firestore.FieldValue.increment(1) });
  });

  return { success: true };
});

exports.updateLoginStreak = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not logged in');

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.data() || {};
  const now = admin.firestore.Timestamp.now();
  const lastLogin = userData.lastLogin ? userData.lastLogin.toDate() : null;
  const lastStreakUpdate = userData.lastStreakUpdate ? userData.lastStreakUpdate.toDate() : null;
  let streak = userData.loginStreak || 0;

  // Use UTC dates to avoid timezone issues
  const nowUTC = new Date(now.toDate().toISOString().split('T')[0] + 'T00:00:00.000Z');
  const lastLoginUTC = lastLogin ? new Date(lastLogin.toISOString().split('T')[0] + 'T00:00:00.000Z') : null;
  const lastStreakUpdateUTC = lastStreakUpdate ? new Date(lastStreakUpdate.toISOString().split('T')[0] + 'T00:00:00.000Z') : null;

  console.log('Login streak calculation:', {
    uid,
    nowUTC: nowUTC.toISOString(),
    lastLoginUTC: lastLoginUTC?.toISOString(),
    lastStreakUpdateUTC: lastStreakUpdateUTC?.toISOString(),
    currentStreak: streak
  });

  if (!lastLogin) {
    // First ever login
    streak = 1;
    console.log('First login, streak = 1');
  } else if (!lastStreakUpdate || lastStreakUpdateUTC.getTime() !== nowUTC.getTime()) {
    // Only update streak if we haven't already updated it today
    const daysDiff = Math.floor((nowUTC.getTime() - lastLoginUTC.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Days difference:', daysDiff);
    
    if (daysDiff === 0) {
      // Same day - keep existing streak, no change
      console.log('Same day login, keeping streak:', streak);
    } else if (daysDiff === 1) {
      // Consecutive day - increment streak
      streak += 1;
      console.log('Consecutive day, streak incremented to:', streak);
    } else {
      // Missed days - reset streak
      streak = 1;
      console.log('Missed days, streak reset to 1');
    }
  } else {
    console.log('Already updated streak today, no change');
  }

  await userRef.set({
    lastLogin: now,
    loginStreak: streak,
    lastStreakUpdate: now
  }, { merge: true });

  console.log('Final streak saved:', streak);
  return { loginStreak: streak };
});

// Admin function to reset all login streaks (for testing)
exports.resetAllLoginStreaks = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Not logged in');

  // Check if user is admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    const batch = db.batch();
    const usersSnapshot = await db.collection('users').get();
    
    let count = 0;
    usersSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        loginStreak: 0,
        lastLogin: null,
        lastStreakUpdate: null
      });
      count++;
    });

    await batch.commit();
    console.log(`Reset login streaks for ${count} users`);
    
    return { 
      success: true, 
      message: `Reset login streaks for ${count} users` 
    };
  } catch (error) {
    console.error('Error resetting login streaks:', error);
    throw new functions.https.HttpsError('internal', 'Failed to reset login streaks');
  }
});




exports.trackCardView = onCall({}, async (request) => {
  const { cardId } = request.data;
  const uid = request.auth?.uid;
  
  if (!cardId) {
    throw new functions.https.HttpsError('invalid-argument', 'Card ID is required');
  }
  
  try {
    // Only increment if user hasn't viewed this card recently (within 24 hours)
    const viewRef = admin.firestore().collection('cardViews').doc(`${cardId}_${uid || 'anonymous'}`);
    const now = admin.firestore.Timestamp.now();
    const oneDayAgo = new Date(now.toDate().getTime() - 24 * 60 * 60 * 1000);
    
    const viewDoc = await viewRef.get();
    if (!viewDoc.exists || viewDoc.data().lastViewed.toDate() < oneDayAgo) {
      // Update last viewed time
      await viewRef.set({
        cardId,
        userId: uid || null,
        lastViewed: now
      });
      
      // Increment view count on the card
      const cardRef = admin.firestore().collection('publicCards').doc(cardId);
      await cardRef.update({
        viewCount: admin.firestore.FieldValue.increment(1)
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error tracking card view:', error);
    throw new functions.https.HttpsError('internal', 'Failed to track view');
  }
});

exports.getLeaderboard = functions.onRequest({ cors: true }, async (req, res) => {
  try {
    const sort = req.query.sort || "upvotes";
    // Get all public profiles
    const profilesSnap = await db.collection("profiles").get();
    const leaderboard = [];

    for (const profileDoc of profilesSnap.docs) {
      const profile = profileDoc.data();
      const slug = profileDoc.id;
      const userId = profile.userId;

      // Get user stats
      const userDoc = await db.collection("users").doc(userId).get();
      const user = userDoc.exists ? userDoc.data() : {};

      leaderboard.push({
        id: userId,
        displayName: profile.displayName || "Anonymous",
        slug,
        upvotesReceived: user.upvotesReceived || 0,
        flashcardCount: user.flashcardCount || 0,
        loginStreak: user.loginStreak || 0,
      });
    }

    // Sort logic
    leaderboard.sort((a, b) => {
      if (sort === "flashcards") return (b.flashcardCount || 0) - (a.flashcardCount || 0);
      if (sort === "streak") return (b.loginStreak || 0) - (a.loginStreak || 0);
      // Default: upvotes
      return (b.upvotesReceived || 0) - (a.upvotesReceived || 0);
    });

    // Limit to top 10
    res.status(200).json({ leaderboard: leaderboard.slice(0, 10) });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Functions
exports.convertStackExchangePost = onCall({
  secrets: [deepseekSecret]
}, async (request) => {
  const { url } = request.data || {};
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Validate required parameters
  if (!url || typeof url !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'url is required and must be a string');
  }
  
  if (!url.includes('stackexchange.com') && !url.includes('stackoverflow.com')) {
    throw new functions.https.HttpsError('invalid-argument', 'url must be a valid Stack Exchange URL');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    // Extract question ID from URL
    const questionId = url.match(/questions\/(\d+)/)?.[1];
    if (!questionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid Stack Exchange URL');
    }

    // Fetch question data from Stack Exchange API
    const data = await makeStackExchangeRequest(`https://api.stackexchange.com/2.3/questions/${questionId}?site=math&filter=withbody`);
    
    if (!data.items || data.items.length === 0) {
      throw new functions.https.HttpsError('not-found', 'Question not found');
    }

    const question = data.items[0];
    
    // Use DeepSeek to convert to flashcard format
    const prompt = `
Convert this Math Stack Exchange question into a clean, educational flashcard for undergraduate mathematics students.

Title: ${question.title}
Question: ${question.body.replace(/<[^>]*>/g, '')}

Create a flashcard and return it as a JSON object with exactly these fields:

{
  "statement": "Write the core problem or question in clear, concise language. Focus on what the student needs to solve or understand. Use LaTeX for mathematical expressions.",
  "hint": "Provide 2-3 key concepts, theorems, or approaches that would help solve this problem. Be specific but don't give away the solution.",
  "proof": "Provide a complete, step-by-step solution. Use clear mathematical language and proper LaTeX formatting. Include all necessary steps and explanations.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

IMPORTANT REQUIREMENTS:
- Write as if explaining to a mathematics undergraduate student
- Use proper LaTeX syntax for all mathematical expressions
- Keep language clear and educational
- Do NOT include any meta-commentary about the flashcard quality
- Do NOT include phrases like "This flashcard demonstrates..." or "The solution shows..."
- Do NOT include educational notes or explanations about what the flashcard does well
- Focus purely on the mathematical content
- Make the statement concise but complete
- Ensure the proof is thorough and well-explained
- Use appropriate mathematical terminology for the level
- Return ONLY the JSON object, no additional text or commentary
- Tags should be an array of 3-5 relevant mathematical topics

Example tags: ["calculus", "differential equations", "optimization", "linear algebra", "mathematical modeling"]
`;

    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!deepSeekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepSeekResponse.status}`);
    }

    const deepSeekData = await deepSeekResponse.json();
    const content = deepSeekData.choices[0].message.content;

    // Log the raw content for debugging
    console.log('Raw AI response:', content);
    
    // Try to parse as JSON first
    let flashcardData;
    try {
      // Clean up the content - remove any markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/```\n?/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/```\n?/, '');
      }
      
      flashcardData = JSON.parse(cleanContent);
      console.log('Successfully parsed JSON:', flashcardData);
    } catch (parseError) {
      console.error('Failed to parse as JSON, falling back to regex parsing:', parseError);
      
      // Fallback to old regex parsing method
      let cleanContent = content.trim();
      
      // Remove any educational notes or meta-commentary that might appear at the end
      const sections = cleanContent.split(/(?=Statement:|Hint:|Proof:|Tags:)/);
      if (sections.length > 4) {
        cleanContent = sections.slice(0, 4).join('');
      }

      // Parse the response to extract statement, hint, proof, and tags
      const statementMatch = cleanContent.match(/Statement:(.*?)(?=Hint:|$)/s);
      const hintMatch = cleanContent.match(/Hint:(.*?)(?=Proof:|$)/s);
      const proofMatch = cleanContent.match(/Proof:(.*?)(?=Tags:|$)/s);
      const tagsMatch = cleanContent.match(/Tags:(.*?)(?:\n\n|\n$|$)/s) || cleanContent.match(/Tags:(.*)/s);

      flashcardData = {
        statement: statementMatch ? statementMatch[1].trim().replace(/^\s*[-*]\s*/, '') : 'Statement not found',
        hint: hintMatch ? hintMatch[1].trim().replace(/^\s*[-*]\s*/, '') : 'Hint not found',
        proof: proofMatch ? proofMatch[1].trim().replace(/^\s*[-*]\s*/, '') : 'Proof not found',
        tags: []
      };
      
      // Enhanced tags cleaning
      if (tagsMatch) {
        const rawTags = tagsMatch[1].trim();
        console.log('Raw tags found:', rawTags);
        
        // Split by comma and clean each tag
        flashcardData.tags = rawTags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0)
          .map(t => t.replace(/^\s*[-*]\s*/, '')) // Remove bullet points
          .filter(t => t.length > 0); // Filter again after cleaning
      }
    }
    
    // Ensure tags is an array
    if (!Array.isArray(flashcardData.tags)) {
      flashcardData.tags = [];
    }
    
    console.log('Final tags:', flashcardData.tags);
    
    // Fallback: if no tags found, try to extract from the content
    if (flashcardData.tags.length === 0) {
      console.log('No tags found, attempting fallback extraction...');
      
      // Look for common mathematical terms in the content
      const mathTerms = [
        'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics', 'probability',
        'linear algebra', 'differential equations', 'number theory', 'combinatorics',
        'topology', 'analysis', 'optimization', 'graph theory', 'set theory',
        'real analysis', 'complex analysis', 'abstract algebra', 'group theory',
        'ring theory', 'field theory', 'vector spaces', 'matrices', 'eigenvalues',
        'derivatives', 'integrals', 'limits', 'series', 'sequences', 'functions'
      ];
      
      const contentLower = content.toLowerCase();
      const foundTerms = mathTerms.filter(term => contentLower.includes(term));
      
      if (foundTerms.length > 0) {
        flashcardData.tags = foundTerms.slice(0, 5); // Take up to 5 relevant terms
        console.log('Fallback tags extracted:', flashcardData.tags);
      }
    }

    return {
      statement: flashcardData.statement,
      hint: flashcardData.hint,
      proof: flashcardData.proof,
      tags: flashcardData.tags,
      originalUrl: url,
      originalTitle: question.title
    };
  } catch (error) {
    console.error('Error converting Stack Exchange post:', error);
    throw new functions.https.HttpsError('internal', 'Failed to convert post');
  }
});

exports.generateBotProfile = onCall({
  secrets: [deepseekSecret]
}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    // Add some randomization to encourage variety
    const randomElements = [
      "Be extremely creative with names from all cultures",
      "Use names from different ethnic backgrounds",
      "Include names from various countries and regions",
      "Make each profile completely unique",
      "Avoid any repetitive patterns"
    ];
    const randomInstruction = randomElements[Math.floor(Math.random() * randomElements.length)];
    
    // Randomly select a university to encourage variety
    const universities = [
      "University of California Berkeley",
      "University of Michigan", 
      "University of Texas Austin",
      "University of Washington",
      "University of Wisconsin Madison",
      "University of Illinois Urbana-Champaign",
      "University of Maryland",
      "University of North Carolina Chapel Hill",
      "University of Virginia",
      "University of Florida",
      "University of British Columbia",
      "McGill University",
      "University of Edinburgh",
      "University of Manchester",
      "University of Bristol",
      "University of Warwick",
      "University of Oxford",
      "University of Cambridge",
      "Imperial College London",
      "University College London",
      "King's College London"
    ];
    
    // Randomly select 3-5 universities to show in the prompt
    const shuffled = universities.sort(() => 0.5 - Math.random());
    const selectedUniversities = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
    
    const prompt = `
Generate a realistic university student mathematician profile for a bot account. You must respond with ONLY a valid JSON object, no other text.

The JSON must have exactly these fields:
{
  "displayName": "Full name (be very creative and diverse with names from different cultures)",
  "institution": "University from this list: ${selectedUniversities.join(', ')}",
  "email": "Realistic university student email based on the name",
  "bio": "2-3 sentence bio describing their studies and passion for mathematics (be creative and diverse - avoid repetitive phrases)",
  "specialties": "3-4 mathematical areas of interest separated by commas (vary these widely)"
}

Requirements:
- ${randomInstruction}
- Use extremely diverse names from different cultures and backgrounds
- Focus on undergraduate/graduate students, NOT professors
- Make each bio unique and creative - avoid repetitive language
- Include realistic student interests and goals
- NO academic titles (Dr., Prof.) - just names
- Generate a university student email that matches the name
- Keep specialties relevant to undergraduate/graduate mathematics
- IMPORTANT: Choose a DIFFERENT university from the provided list each time - avoid repeating the same university
- Be very creative with bios - avoid phrases like "passionate about" or "enjoys solving"
- Return ONLY the JSON object, no markdown, no explanations

Example responses (show variety):
{"displayName":"Zara Patel","institution":"University of Edinburgh","email":"zara.patel@ed.ac.uk","bio":"Third-year mathematics student fascinated by the elegance of number theory and its applications. Currently exploring cryptography and its real-world implications.","specialties":"number theory, cryptography, discrete mathematics, statistics"}
{"displayName":"Alex Thompson","institution":"University of Michigan","email":"alex.thompson@umich.edu","bio":"Mathematics and computer science double major who loves the intersection of abstract concepts and practical applications. Working on machine learning algorithms.","specialties":"linear algebra, machine learning, optimization, probability"}
{"displayName":"Sofia Rodriguez","institution":"Imperial College London","email":"sofia.rodriguez@imperial.ac.uk","bio":"Mathematics student with a keen interest in mathematical modeling and its applications in physics. Enjoys tackling complex problems through systematic approaches.","specialties":"mathematical modeling, differential equations, physics, calculus"}
`;

    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 500
      })
    });

    if (!deepSeekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepSeekResponse.status}`);
    }

    const deepSeekData = await deepSeekResponse.json();
    const content = deepSeekData.choices[0].message.content;

    // Clean up the response and try to parse JSON
    let cleanContent = content.trim();
    
    // Remove any markdown code blocks if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/, '').replace(/```\n?/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/```\n?/, '').replace(/```\n?/, '');
    }
    
    // Try to parse the JSON
    let profile;
    try {
      profile = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', cleanContent);
      console.error('Parse error:', parseError);
      
      // Fallback: create a basic profile structure
      profile = {
        displayName: "AI Student",
        institution: "University of Mathematics",
        email: "ai.student@university.edu",
        bio: "AI-generated student mathematician profile. Please edit the details as needed.",
        specialties: "calculus, linear algebra, abstract algebra"
      };
    }

    // Validate required fields
    if (!profile.displayName || !profile.institution || !profile.email || !profile.bio || !profile.specialties) {
      console.error('AI response missing required fields:', profile);
      throw new Error('Generated profile is missing required fields');
    }

    return profile;
  } catch (error) {
    console.error('Error generating bot profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate bot profile');
  }
});

exports.publishBotFlashcard = onCall({
  secrets: [deepseekSecret]
}, async (request) => {
  const { botId, flashcard, makePublic, likerBotIds = [] } = request.data || {};
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Validate required parameters
  if (!botId || typeof botId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'botId is required and must be a string');
  }
  
  if (!flashcard || typeof flashcard !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', 'flashcard is required and must be an object');
  }
  
  if (!flashcard.statement || !flashcard.proof) {
    throw new functions.https.HttpsError('invalid-argument', 'flashcard must have statement and proof fields');
  }
  
  if (typeof makePublic !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'makePublic must be a boolean');
  }
  
  if (!Array.isArray(likerBotIds)) {
    throw new functions.https.HttpsError('invalid-argument', 'likerBotIds must be an array');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    // Get bot account details
    const botDoc = await db.collection("botAccounts").doc(botId).get();
    if (!botDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Bot account not found');
    }

    const bot = botDoc.data();
    
    // Ensure bot has a proper user account and profile
    let botUserId = bot.userId;
    if (!botUserId) {
      // Create a bot user account
      const botUser = await admin.auth().createUser({
        email: bot.email,
        displayName: bot.displayName,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password
        disabled: false
      });
      
      botUserId = botUser.uid;
      
      // Create user document
      await db.collection("users").doc(botUserId).set({
        isPremium: false,
        email: bot.email,
        displayName: bot.displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isBot: true
      });
      
      // Create profile
      await db.collection("profiles").doc(bot.slug).set({
        displayName: bot.displayName,
        slug: bot.slug,
        bio: bot.bio || `Mathematics researcher at ${bot.institution}`,
        institution: bot.institution,
        userId: botUserId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isBot: true
      });
      
      // Create userToSlug mapping
      await db.collection("userToSlug").doc(botUserId).set({ slug: bot.slug });
      
      // Update bot account with userId
      await db.collection("botAccounts").doc(botId).update({ userId: botUserId });
    }
    
    // Create the flashcard
    const cardData = {
      statement: flashcard.statement,
      hints: flashcard.hint,
      proof: flashcard.proof,
      tags: flashcard.tags,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isBotCreated: true,
      botId: botId,
      botName: bot.displayName
    };

    // Add to bot's flashcards
    const cardRef = await db.collection("flashcards").add({
      ...cardData,
      userId: botUserId
    });

    let publicCardSlug = null;

    // If making public, add to public cards
    if (makePublic) {
      const slug = flashcard.statement.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      const uniqueSlug = await ensureUniqueCardSlug(slug);
      publicCardSlug = uniqueSlug;
      
      await db.collection("publicCards").doc(uniqueSlug).set({
        ...cardData,
        userId: botUserId,
        authorSlug: bot.slug,
        slug: uniqueSlug,
        likeCount: 0,
        viewCount: 0,
        importCount: 0
      });
    }

    // Handle bot likes if public and likers are specified
    if (makePublic && likerBotIds.length > 0) {
      // Get liker bot details and ensure they have user accounts
      const likerBots = [];
      for (const likerBotId of likerBotIds) {
        const likerDoc = await db.collection("botAccounts").doc(likerBotId).get();
        if (likerDoc.exists) {
          const likerBot = likerDoc.data();
          
          // Ensure liker bot has a proper user account
          let likerUserId = likerBot.userId;
          if (!likerUserId) {
            // Create a bot user account for liker
            const likerUser = await admin.auth().createUser({
              email: likerBot.email,
              displayName: likerBot.displayName,
              password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12),
              disabled: false
            });
            
            likerUserId = likerUser.uid;
            
            // Create user document
            await db.collection("users").doc(likerUserId).set({
              isPremium: false,
              email: likerBot.email,
              displayName: likerBot.displayName,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              isBot: true
            });
            
            // Create profile
            await db.collection("profiles").doc(likerBot.slug).set({
              displayName: likerBot.displayName,
              slug: likerBot.slug,
              bio: likerBot.bio || `Mathematics researcher at ${likerBot.institution}`,
              institution: likerBot.institution,
              userId: likerUserId,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              isBot: true
            });
            
            // Create userToSlug mapping
            await db.collection("userToSlug").doc(likerUserId).set({ slug: likerBot.slug });
            
            // Update bot account with userId
            await db.collection("botAccounts").doc(likerBotId).update({ userId: likerUserId });
          }
          
          likerBots.push({ ...likerBot, userId: likerUserId });
        }
      }

      // Add likes from bot accounts
      console.log(`Adding ${likerBots.length} bot likes to card ${publicCardSlug}`);
      
      for (let i = 0; i < likerBots.length; i++) {
        const likerBot = likerBots[i];
        const currentLikerBotId = likerBotIds[i];
        
        console.log(`Adding like from bot: ${likerBot.displayName} (${currentLikerBotId})`);
        
        // Update the like count
        await db.collection("publicCards").doc(publicCardSlug).update({
          likeCount: admin.firestore.FieldValue.increment(1)
        });

        // Track the bot like
        await db.collection("botLikes").add({
          cardSlug: publicCardSlug,
          likerBotId: currentLikerBotId,
          likerBotName: likerBot.displayName,
          likerUserId: likerBot.userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Verify the final like count
      const finalCardDoc = await db.collection("publicCards").doc(publicCardSlug).get();
      const finalLikeCount = finalCardDoc.data()?.likeCount || 0;
      console.log(`Final like count for card ${publicCardSlug}: ${finalLikeCount}`);
    }

    // Track the automated card
    await db.collection("automatedCards").add({
      cardId: cardRef.id,
      botId: botId,
      botName: bot.displayName,
      public: makePublic,
      publicSlug: publicCardSlug,
      likerBotIds: likerBotIds,
      likerCount: likerBotIds.length,
      originalUrl: flashcard.originalUrl,
      originalTitle: flashcard.originalTitle,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      cardId: cardRef.id,
      publicSlug: publicCardSlug,
      likerCount: likerBotIds.length
    };
  } catch (error) {
    console.error('Error publishing bot flashcard:', error);
    throw new functions.https.HttpsError('internal', 'Failed to publish flashcard');
  }
});

// Helper function to create URL-friendly slugs
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
    .substring(0, 50);           // Limit length
}

async function ensureUniqueCardSlug(baseSlug) {
  let slug = baseSlug;
  let tries = 0;
  while (tries < 5) {
    const snap = await db.collection("publicCards").where("slug", "==", slug).limit(1).get();
    if (snap.empty) return slug;
    slug = baseSlug + "-" + Math.floor(Math.random() * 10000);
    tries++;
  }
  throw new Error("Failed to generate unique card slug after multiple attempts.");
}

// Admin function to delete a card
exports.deleteCard = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  const { cardId, cardSlug } = request.data || {};
  
  if (!cardId && !cardSlug) {
    throw new functions.https.HttpsError('invalid-argument', 'cardId or cardSlug is required');
  }

  try {
    console.log('Admin deleting card:', { cardId, cardSlug });
    
    // If we have a cardSlug, delete from publicCards
    if (cardSlug) {
      const publicCardDoc = await db.collection("publicCards").doc(cardSlug).get();
      if (publicCardDoc.exists) {
        await db.collection("publicCards").doc(cardSlug).delete();
        console.log(`Deleted public card: ${cardSlug}`);
      }
    }
    
    // If we have a cardId, delete from cards collection
    if (cardId) {
      const cardDoc = await db.collection("cards").doc(cardId).get();
      if (cardDoc.exists) {
        await db.collection("cards").doc(cardId).delete();
        console.log(`Deleted card: ${cardId}`);
      }
    }
    
    return {
      success: true,
      message: 'Card deleted successfully',
      cardId,
      cardSlug
    };

  } catch (error) {
    console.error('Error deleting card:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete card');
  }
});

// Admin function to delete a private card
exports.deletePrivateCard = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  const { cardId } = request.data || {};
  
  if (!cardId) {
    throw new functions.https.HttpsError('invalid-argument', 'cardId is required');
  }

  try {
    console.log('Admin deleting private card:', cardId);
    
    const cardDoc = await db.collection("flashcards").doc(cardId).get();
    if (!cardDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Private card not found');
    }
    
    await db.collection("flashcards").doc(cardId).delete();
    console.log(`Deleted private card: ${cardId}`);
    
    return {
      success: true,
      message: 'Private card deleted successfully',
      cardId
    };

  } catch (error) {
    console.error('Error deleting private card:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete private card');
  }
});

// Admin function to update a private card
exports.updatePrivateCard = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  const { cardId, statement, hint, proof, tags } = request.data || {};
  
  if (!cardId) {
    throw new functions.https.HttpsError('invalid-argument', 'cardId is required');
  }

  try {
    console.log('Admin updating private card:', cardId);
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (statement !== undefined) updateData.statement = statement;
    if (hint !== undefined) updateData.hints = hint;
    if (proof !== undefined) updateData.proof = proof;
    if (tags !== undefined) updateData.tags = tags;
    
    await db.collection("flashcards").doc(cardId).update(updateData);
    console.log(`Updated private card: ${cardId}`);
    
    return {
      success: true,
      message: 'Private card updated successfully',
      cardId
    };

  } catch (error) {
    console.error('Error updating private card:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update private card');
  }
});

// Admin function to get user's private cards
exports.getUserPrivateCards = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  const { userId } = request.data || {};
  
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  try {
    console.log('Admin getting private cards for user:', userId);
    
    const privateCardsSnapshot = await db.collection("flashcards")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();
    
    const cards = privateCardsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${cards.length} private cards for user ${userId}`);
    
    return {
      success: true,
      cards: cards
    };

  } catch (error) {
    console.error('Error getting user private cards:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user private cards');
  }
});

// Admin function to update user profile
exports.updateUserProfile = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  const { userId, displayName, bio, institution, specialties, isPublic } = request.data || {};
  
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  try {
    console.log('Admin updating user profile:', userId);
    
    // Update user document
    if (displayName !== undefined) {
      await db.collection("users").doc(userId).update({
        displayName: displayName
      });
    }
    
    // Get user's slug
    const slugDoc = await db.collection("userToSlug").doc(userId).get();
    if (slugDoc.exists) {
      const slug = slugDoc.data().slug;
      
      // Update profile document
      const profileUpdateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (bio !== undefined) profileUpdateData.bio = bio;
      if (institution !== undefined) profileUpdateData.institution = institution;
      if (specialties !== undefined) profileUpdateData.specialties = specialties;
      if (isPublic !== undefined) profileUpdateData.isPublic = isPublic;
      
      await db.collection("profiles").doc(slug).set(profileUpdateData, { merge: true });
    }
    
    console.log(`Updated user profile: ${userId}`);
    
    return {
      success: true,
      message: 'User profile updated successfully',
      userId
    };

  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user profile');
  }
});

// Simple sitemap update function
exports.updateSitemap = onCall({}, async (request) => {
  const uid = request.auth?.uid;
  
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Not logged in');
  }

  // Check if user is authorized admin
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data().email !== 'three.dash.sided@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized');
  }

  try {
    console.log('Starting sitemap update...');
    
    // Get all public cards
    const cardsSnapshot = await db.collection("publicCards").get();
    const cards = cardsSnapshot.docs.map(doc => ({
      slug: doc.id,
      ...doc.data()
    }));

    // Get all profiles
    const profilesSnapshot = await db.collection("profiles").get();
    const profiles = profilesSnapshot.docs.map(doc => ({
      slug: doc.id,
      ...doc.data()
    }));

    // Generate sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://three-sided.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://three-sided.com/search</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://three-sided.com/social</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    // Add card URLs
    for (const card of cards) {
      sitemap += `
  <url>
    <loc>https://three-sided.com/card/${card.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }

    // Add profile URLs
    for (const profile of profiles) {
      sitemap += `
  <url>
    <loc>https://three-sided.com/profile/${profile.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;
    
    console.log(`Sitemap generated with ${cards.length} cards and ${profiles.length} profiles`);
    
    return {
      success: true,
      cardsCount: cards.length,
      profilesCount: profiles.length,
      sitemap: sitemap
    };

  } catch (error) {
    console.error('Error updating sitemap:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update sitemap');
  }
});

// Export additional functions
const { generateCardImage } = require('./generateCardImage');
const { generateCardPage } = require('./generateCardPage');
exports.generateCardImage = generateCardImage;
exports.generateCardPage = generateCardPage;