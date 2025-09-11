const { onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Define secret for DeepSeek API
const deepseekSecret = defineSecret("DEEPSEEK_API_KEY");

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Enhanced automation logging function
async function logAutomationAttempt(status, details = {}) {
  try {
    const logEntry = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: status, // 'started', 'step_success', 'step_failed', 'success', 'failed', 'skipped', 'retry_scheduled', 'retrying'
      details: details,
      environment: 'scheduled_automation',
      runId: details.runId || `run_${Date.now()}`
    };

    await db.collection('automationLogs').add(logEntry);
    console.log(`📝 Automation log: ${status} - ${JSON.stringify(details)}`);
  } catch (error) {
    console.error('Failed to log automation attempt:', error);
  }
}

// Helper function to determine if an error is retryable
function isRetryableError(error) {
  const errorMessage = error.message.toLowerCase();
  
  // Retryable errors (temporary issues)
  const retryablePatterns = [
    'rate limit', 'timeout', 'network', 'connection', 'fetch failed',
    'api.stackexchange.com', 'api.deepseek.com', 'temporary',
    'server error', '500', '502', '503', '504', 'econnreset',
    'failed to get random math post', 'failed to convert post'
  ];
  
  // Non-retryable errors (configuration/logic issues)
  const nonRetryablePatterns = [
    'no active bot accounts', 'permission denied', 'invalid argument',
    'not authorized', 'bad request', '400', '401', '403',
    'undefined (reading', 'cannot read properties', 'invalid url'
  ];
  
  // Check non-retryable first (higher priority)
  for (const pattern of nonRetryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return false;
    }
  }
  
  // Check retryable patterns
  for (const pattern of retryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return true;
    }
  }
  
  // Default: assume retryable for unknown errors
  return true;
}

// Helper function to schedule a retry with exponential backoff
async function scheduleRetry(currentRetryCount, maxRetries, errorMessage, originalRunId) {
  const newRetryCount = currentRetryCount + 1;
  
  // Exponential backoff: 2^retry_count minutes (2, 4, 8 minutes)
  const retryDelayMinutes = Math.pow(2, newRetryCount);
  const retryTime = new Date(Date.now() + (retryDelayMinutes * 60 * 1000));
  
  console.log(`🔄 Scheduling retry ${newRetryCount}/${maxRetries} in ${retryDelayMinutes} minutes`);
  console.log(`⏰ Retry scheduled for: ${retryTime.toISOString()}`);
  
  // Update automation settings with retry info
  await db.collection('automation').doc('settings').update({
    currentRetryCount: newRetryCount,
    nextRetryTime: admin.firestore.FieldValue.serverTimestamp(),
    retryScheduledFor: retryTime,
    lastRetryReason: errorMessage
  });
  
  // Log the retry scheduling
  await logAutomationAttempt('retry_scheduled', {
    runId: originalRunId,
    message: `Retry ${newRetryCount}/${maxRetries} scheduled`,
    retryDelayMinutes: retryDelayMinutes,
    retryTime: retryTime.toISOString(),
    originalError: errorMessage,
    retryCount: newRetryCount,
    maxRetries: maxRetries
  });
}

/**
 * Automated StackExchange to Flashcard Pipeline
 * Runs every X hours to automatically create and publish flashcards
 */
exports.automatedStackExchangePipeline = onSchedule({
  schedule: '*/15 * * * *', // Every 15 minutes
  timeZone: 'UTC',
  secrets: [deepseekSecret]
}, async (event) => {
  const startTime = new Date();
  const runId = `auto_${Date.now()}`;
  
  console.log('🤖 ==========================================');
  console.log(`🤖 AUTOMATION PIPELINE STARTED: ${startTime.toISOString()}`);
  console.log(`🤖 RUN ID: ${runId}`);
  console.log('🤖 ==========================================');
  
  // Log automation start
  await logAutomationAttempt('started', {
    runId: runId,
    message: 'Scheduled automation pipeline initiated',
    scheduledTime: startTime.toISOString()
  });
  
  try {
    // Step 1: Get automation settings
    console.log('📋 STEP 1: Loading automation settings...');
    const settingsDoc = await db.collection('automation').doc('settings').get();
    if (!settingsDoc.exists) {
      console.log('❌ STEP 1 FAILED: No automation settings found');
      await logAutomationAttempt('failed', {
        runId: runId,
        step: 'load_settings',
        error: 'No automation settings document found',
        message: 'Automation settings collection needs to be initialized'
      });
      return;
    }
    console.log('✅ STEP 1 SUCCESS: Automation settings loaded');
    
    const settings = settingsDoc.data();
    console.log(`⚙️  Settings: enabled=${settings.enabled}, interval=${settings.interval}min`);
    
    if (!settings.enabled) {
      console.log('⏸️  PIPELINE STOPPED: Automation is disabled');
      await logAutomationAttempt('skipped', {
        runId: runId,
        message: 'Automation is disabled in settings',
        settings: { enabled: settings.enabled, interval: settings.interval }
      });
      return;
    }
    
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'load_settings',
      message: 'Automation settings loaded successfully',
      settings: { enabled: settings.enabled, interval: settings.interval }
    });
    
    // Step 2: Check timing (including retry scheduling)
    console.log('⏰ STEP 2: Checking if it\'s time to run...');
    const now = new Date();
    const lastRun = settings.lastRun ? settings.lastRun.toDate() : new Date(0);
    const intervalMs = settings.interval * 60 * 1000; // Convert minutes to milliseconds
    const timeSinceLastRun = now.getTime() - lastRun.getTime();
    const minutesSinceLastRun = Math.floor(timeSinceLastRun / (1000 * 60));
    
    // Check if this is a retry run
    const isRetryRun = settings.currentRetryCount > 0 && settings.retryScheduledFor;
    let shouldRun = false;
    let runReason = '';
    
    if (isRetryRun) {
      const retryTime = settings.retryScheduledFor.toDate();
      const isRetryTime = now >= retryTime;
      
      console.log(`🔄 RETRY CHECK: Retry ${settings.currentRetryCount} scheduled for ${retryTime.toISOString()}`);
      console.log(`⏰ RETRY CHECK: Current time ${now.toISOString()}`);
      console.log(`✅ RETRY CHECK: Ready to retry: ${isRetryTime}`);
      
      if (isRetryTime) {
        shouldRun = true;
        runReason = `retry_${settings.currentRetryCount}`;
        
        // Log retry attempt
        await logAutomationAttempt('retrying', {
          runId: runId,
          message: `Starting retry attempt ${settings.currentRetryCount}`,
          retryInfo: {
            retryCount: settings.currentRetryCount,
            originalError: settings.lastRetryReason,
            scheduledTime: retryTime.toISOString(),
            actualTime: now.toISOString()
          }
        });
      } else {
        const minutesUntilRetry = Math.ceil((retryTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`⏰ RETRY WAIT: ${minutesUntilRetry} minutes until retry`);
        
        await logAutomationAttempt('skipped', {
          runId: runId,
          message: `Waiting for retry time - ${minutesUntilRetry} minutes remaining`,
          retryInfo: {
            retryCount: settings.currentRetryCount,
            minutesUntilRetry: minutesUntilRetry,
            scheduledTime: retryTime.toISOString()
          }
        });
        return;
      }
    } else {
      // Normal interval check
      console.log(`⏱️  Last run: ${lastRun.toISOString()}`);
      console.log(`⏱️  Minutes since last run: ${minutesSinceLastRun}`);
      console.log(`⏱️  Required interval: ${settings.interval} minutes`);
      
      if (timeSinceLastRun >= intervalMs) {
        shouldRun = true;
        runReason = 'scheduled_interval';
      } else {
        const minutesRemaining = settings.interval - minutesSinceLastRun;
        console.log(`⏰ PIPELINE STOPPED: Not time to run yet (need ${minutesRemaining} more minutes)`);
        await logAutomationAttempt('skipped', {
          runId: runId,
          message: 'Too early to run - waiting for interval',
          timingInfo: {
            lastRun: lastRun.toISOString(),
            minutesSinceLastRun: minutesSinceLastRun,
            requiredInterval: settings.interval,
            minutesRemaining: minutesRemaining
          }
        });
        return;
      }
    }
    
    console.log(`✅ STEP 2 SUCCESS: Ready to run (${runReason})`);
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'timing_check',
      message: `Timing check passed - ready to execute (${runReason})`,
      runReason: runReason,
      isRetryRun: isRetryRun
    });
    
    // Step 3: Get active bot accounts
    console.log('🤖 STEP 3: Loading active bot accounts...');
    const botsSnapshot = await db.collection('botAccounts')
      .where('isActive', '==', true)
      .get();
    
    if (botsSnapshot.empty) {
      console.log('❌ STEP 3 FAILED: No active bot accounts found');
      await logAutomationAttempt('failed', {
        runId: runId,
        step: 'load_bots',
        error: 'No active bot accounts found',
        message: 'Need to create and activate bot accounts'
      });
      return;
    }
    
    const bots = botsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`✅ STEP 3 SUCCESS: Found ${bots.length} active bots`);
    bots.forEach((bot, index) => {
      console.log(`   ${index + 1}. ${bot.displayName} (${bot.email}) - Posts: ${bot.postCount || 0}`);
    });
    
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'load_bots',
      message: `Found ${bots.length} active bot accounts`,
      botInfo: bots.map(bot => ({
        displayName: bot.displayName,
        postCount: bot.postCount || 0,
        institution: bot.institution
      }))
    });
    
    // Step 4: Select random bot
    console.log('🎲 STEP 4: Selecting random bot...');
    const randomIndex = Math.floor(Math.random() * bots.length);
    const selectedBot = bots[randomIndex];
    console.log(`✅ STEP 4 SUCCESS: Selected bot #${randomIndex + 1}`);
    console.log(`🎯 Selected bot: ${selectedBot.displayName} (${selectedBot.id})`);
    console.log(`📊 Bot stats: Posts=${selectedBot.postCount || 0}, Active=${selectedBot.isActive}`);
    
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'select_bot',
      message: `Selected bot: ${selectedBot.displayName}`,
      selectedBot: {
        id: selectedBot.id,
        displayName: selectedBot.displayName,
        institution: selectedBot.institution,
        postCount: selectedBot.postCount || 0
      }
    });
    
    // Step 5: Get random math post
    console.log('📡 STEP 5: Fetching random StackExchange post...');
    const randomPost = await getRandomMathPost();
    if (!randomPost) {
      console.log('❌ STEP 5 FAILED: Failed to get random math post');
      await logAutomationAttempt('failed', {
        runId: runId,
        step: 'fetch_post',
        error: 'Failed to get random math post',
        message: 'StackExchange API error or no suitable posts found'
      });
      return;
    }
    console.log('✅ STEP 5 SUCCESS: Found suitable post');
    
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'fetch_post',
      message: 'Successfully fetched StackExchange post',
      postInfo: {
        title: randomPost.question.title.substring(0, 100),
        url: randomPost.url,
        score: randomPost.score,
        tags: randomPost.question.tags
      }
    });
    console.log(`📝 Post title: "${randomPost.question.title}"`);
    console.log(`📊 Post stats: Score=${randomPost.score}, HasAnswer=${randomPost.hasAcceptedAnswer}`);
    console.log(`🔗 Post URL: ${randomPost.url}`);
    
    // Step 6: Convert to flashcard
    console.log('🧠 STEP 6: Converting post to flashcard with DeepSeek...');
    const conversion = await convertStackExchangePost(randomPost.url);
    if (!conversion) {
      console.log('❌ STEP 6 FAILED: Failed to convert post to flashcard');
      await logAutomationAttempt('failed', {
        runId: runId,
        step: 'convert_post',
        error: 'Failed to convert post to flashcard',
        message: 'DeepSeek AI conversion failed'
      });
      return;
    }
    console.log('✅ STEP 6 SUCCESS: Post converted to flashcard');
    console.log(`📋 Statement length: ${conversion.statement?.length || 0} chars`);
    console.log(`💡 Hints length: ${conversion.hints?.length || 0} chars`);
    console.log(`📖 Proof length: ${conversion.proof?.length || 0} chars`);
    console.log(`🏷️  Tags: ${conversion.tags?.join(', ') || 'none'}`);
    
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'convert_post',
      message: 'Successfully converted post to flashcard',
      conversionInfo: {
        statementLength: conversion.statement?.length || 0,
        hintsLength: conversion.hints?.length || 0,
        proofLength: conversion.proof?.length || 0,
        tagsCount: conversion.tags?.length || 0,
        tags: conversion.tags?.join(', ') || 'none'
      }
    });
    
    // Step 7: Publish flashcard
    console.log('🚀 STEP 7: Publishing flashcard...');
    const publishedCard = await publishFlashcard(conversion, selectedBot);
    if (!publishedCard) {
      console.log('❌ STEP 7 FAILED: Failed to publish flashcard');
      await logAutomationAttempt('failed', {
        runId: runId,
        step: 'publish_card',
        error: 'Failed to publish flashcard',
        message: 'Error creating flashcard document'
      });
      return;
    }
    console.log('✅ STEP 7 SUCCESS: Flashcard published');
    console.log(`📄 Card ID: ${publishedCard.id}`);
    console.log(`👤 Author: ${selectedBot.displayName} (bot)`);
    
    await logAutomationAttempt('step_success', {
      runId: runId,
      step: 'publish_card',
      message: 'Successfully published flashcard',
      cardInfo: {
        id: publishedCard.id,
        slug: publishedCard.slug,
        author: selectedBot.displayName,
        cardUrl: `https://three-sided.com/card/${publishedCard.slug}`
      }
    });
    
    // Step 8: Bot self-like
    console.log('👍 STEP 8: Bot liking own post...');
    const likeSuccess = await addBotSelfLike(publishedCard.id, selectedBot);
    if (likeSuccess) {
      console.log(`✅ STEP 8 SUCCESS: Bot ${selectedBot.displayName} liked their own post`);
    } else {
      console.log(`⚠️  STEP 8 WARNING: Failed to add bot self-like (non-critical)`);
    }
    
    // Step 9: Update automation settings
    console.log('💾 STEP 9: Updating automation settings...');
    await db.collection('automation').doc('settings').update({
      lastRun: admin.firestore.FieldValue.serverTimestamp(),
      nextRun: new Date(now.getTime() + intervalMs),
      totalPosts: admin.firestore.FieldValue.increment(1),
      lastPostId: publishedCard.id
    });
    console.log('✅ STEP 9 SUCCESS: Automation settings updated');
    console.log(`⏰ Next run scheduled: ${new Date(now.getTime() + intervalMs).toISOString()}`);
    
    // Step 10: Log automation event
    console.log('📝 STEP 10: Logging automation event...');
    await db.collection('automationLogs').add({
      type: 'automated_post',
      botId: selectedBot.id,
      botName: selectedBot.displayName,
      postId: publishedCard.id,
      stackExchangeUrl: randomPost.url,
      success: true,
      executionTimeMs: Date.now() - startTime.getTime(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ STEP 10 SUCCESS: Event logged to automationLogs collection');
    
    // Step 11: Update bot statistics and reset retry count
    console.log('📊 STEP 11: Updating bot statistics and resetting retry count...');
    await db.collection('botAccounts').doc(selectedBot.id).update({
      postCount: admin.firestore.FieldValue.increment(1),
      lastActive: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Reset retry count on successful completion
    await db.collection('automation').doc('settings').update({
      currentRetryCount: 0,
      retryScheduledFor: admin.firestore.FieldValue.delete(),
      lastRetryReason: admin.firestore.FieldValue.delete(),
      lastSuccessTime: admin.firestore.FieldValue.serverTimestamp()
    });
    
    const newPostCount = (selectedBot.postCount || 0) + 1;
    console.log('✅ STEP 11 SUCCESS: Bot statistics updated and retry count reset');
    console.log(`📈 Bot ${selectedBot.displayName} now has ${newPostCount} posts`);
    
    const endTime = new Date();
    const executionTimeMs = endTime.getTime() - startTime.getTime();
    
    // Log final success
    await logAutomationAttempt('success', {
      runId: runId,
      message: 'Automation pipeline completed successfully',
      executionTimeMs: executionTimeMs,
      finalResults: {
        cardId: publishedCard.id,
        cardSlug: publishedCard.slug,
        botName: selectedBot.displayName,
        postTitle: randomPost.question.title.substring(0, 100),
        cardUrl: `https://three-sided.com/card/${publishedCard.slug}`,
        likeAdded: likeSuccess
      }
    });
    
    console.log('🎉 ==========================================');
    console.log('🎉 AUTOMATION PIPELINE COMPLETED SUCCESSFULLY!');
    console.log(`🎉 Total execution time: ${executionTimeMs}ms (${(executionTimeMs/1000).toFixed(2)}s)`);
    console.log(`🎉 Card published: ${publishedCard.id}`);
    console.log(`🎉 Bot used: ${selectedBot.displayName}`);
    console.log(`🎉 Next run: ${new Date(now.getTime() + intervalMs).toISOString()}`);
    console.log('🎉 ==========================================');
    
  } catch (error) {
    const endTime = new Date();
    const executionTimeMs = endTime.getTime() - startTime.getTime();
    
    // Determine if this error is retryable
    const isRetryable = isRetryableError(error);
    
    // Get retry information from automation settings
    let retryCount = 0;
    let maxRetries = 3; // Default max retries
    
    try {
      const settingsDoc = await db.collection('automation').doc('settings').get();
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        retryCount = data.currentRetryCount || 0;
        maxRetries = data.maxRetries || 3;
      }
    } catch (settingsError) {
      console.error('Error getting retry settings:', settingsError);
    }
    
    // Log the error
    await logAutomationAttempt('failed', {
      runId: runId,
      message: 'Automation pipeline failed with error',
      error: error.message,
      stack: error.stack,
      executionTimeMs: executionTimeMs,
      isRetryable: isRetryable,
      retryCount: retryCount,
      maxRetries: maxRetries
    });
    
    console.error('❌ ==========================================');
    console.error('❌ AUTOMATION PIPELINE FAILED!');
    console.error(`❌ Execution time: ${executionTimeMs}ms`);
    console.error(`❌ Error: ${error.message}`);
    console.error(`❌ Retryable: ${isRetryable}`);
    console.error(`❌ Retry Count: ${retryCount}/${maxRetries}`);
    console.error('❌ ==========================================');
    
    // Schedule retry if error is retryable and we haven't exceeded max retries
    if (isRetryable && retryCount < maxRetries) {
      await scheduleRetry(retryCount, maxRetries, error.message, runId);
    } else {
      // Reset retry count after max retries reached or non-retryable error
      await db.collection('automation').doc('settings').update({
        currentRetryCount: 0,
        lastFailureReason: error.message,
        lastFailureTime: admin.firestore.FieldValue.serverTimestamp()
      });
      
      if (!isRetryable) {
        await logAutomationAttempt('failed', {
          runId: runId,
          message: 'Non-retryable error - manual intervention required',
          error: error.message,
          reason: 'Error type not suitable for automatic retry'
        });
      } else {
        await logAutomationAttempt('failed', {
          runId: runId,
          message: 'Max retries exceeded - giving up',
          error: error.message,
          finalRetryCount: retryCount
        });
      }
    }
  }
});

/**
 * Manual trigger for automation (for testing)
 */
exports.triggerAutomation = onCall({
  secrets: [deepseekSecret]
}, async (request) => {
  // Admin authorization check
  if (!request.auth || request.auth.token.email !== "three.dash.sided@gmail.com") {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  console.log('🔧 Manual automation trigger requested');
  
  try {
    // Get active bot accounts
    const botsSnapshot = await db.collection('botAccounts')
      .where('isActive', '==', true)
      .get();
    
    if (botsSnapshot.empty) {
      throw new Error('No active bot accounts found');
    }
    
    const bots = botsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const selectedBot = bots[Math.floor(Math.random() * bots.length)];
    
    // Get random math post
    const randomPost = await getRandomMathPost();
    if (!randomPost) {
      throw new Error('Failed to get random math post');
    }
    
    // Convert to flashcard
    const conversion = await convertStackExchangePost(randomPost.url);
    if (!conversion) {
      throw new Error('Failed to convert post to flashcard');
    }
    
    // Publish flashcard
    const publishedCard = await publishFlashcard(conversion, selectedBot);
    if (!publishedCard) {
      throw new Error('Failed to publish flashcard');
    }
    
    // Add bot self-like
    const likeSuccess = await addBotSelfLike(publishedCard.id, selectedBot);
    console.log(`🎯 triggerAutomation: Bot self-like ${likeSuccess ? 'successful' : 'failed'}`);
    
    return {
      success: true,
      botId: selectedBot.id,
      botName: selectedBot.displayName,
      postId: publishedCard.id,
      cardSlug: publishedCard.id, // The slug for URL construction
      stackExchangeUrl: randomPost.url,
      cardUrl: `https://three-sided.com/card/${publishedCard.id}`
    };
    
  } catch (error) {
    console.error('❌ Error in manual automation trigger:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Helper function to get random math post with specific criteria:
 * - Has accepted answer
 * - Not too popular (score between 2-15)
 * - Recent enough (within last 2 years)
 * - Good tags for undergraduate level
 */
async function getRandomMathPost() {
  console.log('📡 getRandomMathPost: Starting StackExchange post search...');
  try {
    // Define search criteria for quality posts
    const searchCriteria = [
      {
        tags: 'calculus;derivatives;integrals',
        description: 'Calculus topics'
      },
      {
        tags: 'linear-algebra;matrices;vector-spaces',
        description: 'Linear Algebra'
      },
      {
        tags: 'abstract-algebra;group-theory;ring-theory',
        description: 'Abstract Algebra'
      },
      {
        tags: 'real-analysis;sequences-and-series;limits',
        description: 'Real Analysis'
      },
      {
        tags: 'discrete-mathematics;combinatorics;graph-theory',
        description: 'Discrete Math'
      },
      {
        tags: 'probability;statistics;random-variables',
        description: 'Probability & Statistics'
      }
    ];

    // Randomly select a topic area
    const selectedCriteria = searchCriteria[Math.floor(Math.random() * searchCriteria.length)];
    console.log(`🎯 getRandomMathPost: Selected topic area - ${selectedCriteria.description}`);
    console.log(`🏷️  getRandomMathPost: Using tags - ${selectedCriteria.tags}`);

    // Calculate date range (last 2 years)
    const twoYearsAgo = Math.floor((Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)) / 1000);
    
    const params = {
      site: 'math',
      tagged: selectedCriteria.tags,
      sort: 'activity', // Recently active posts
      order: 'desc',
      pagesize: 50, // Reduce to avoid rate limits
      page: Math.floor(Math.random() * 2) + 1, // Random page 1-2 to reduce API calls
      filter: 'withbody', // Include question body
      min: twoYearsAgo, // Only posts from last 2 years
      accepted: 'True', // ONLY questions with accepted answers
      key: 'U4DMV*8nvpm3EOpvf69Rxw((' // Add your StackExchange API key if you have one
    };

    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const url = `https://api.stackexchange.com/2.3/questions?${queryString}`;
    
    console.log(`📡 getRandomMathPost: Fetching from StackExchange API...`);
    console.log(`🔗 getRandomMathPost: API URL - ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`❌ getRandomMathPost: API request failed with status ${response.status}`);
      if (response.status === 429) {
        throw new Error(`StackExchange API rate limit exceeded. Try again later.`);
      } else if (response.status >= 500) {
        throw new Error(`StackExchange API server error (${response.status}). Try again later.`);
      } else {
        throw new Error(`StackExchange API request failed: ${response.status}`);
      }
    }
    console.log('✅ getRandomMathPost: API request successful');
    
    const data = await response.json();
    console.log(`📊 getRandomMathPost: API response - quota_remaining: ${data.quota_remaining || 'unknown'}`);
    
    // Check for API quota issues
    if (data.quota_remaining !== undefined && data.quota_remaining < 100) {
      console.log(`⚠️ getRandomMathPost: Low API quota remaining: ${data.quota_remaining}`);
    }
    
    if (data.error_message) {
      console.log(`❌ getRandomMathPost: API error - ${data.error_message}`);
      throw new Error(`StackExchange API error: ${data.error_message}`);
    }

    if (!data.items || data.items.length === 0) {
      console.log('❌ getRandomMathPost: No questions found with current criteria');
      console.log(`💭 getRandomMathPost: Try different search criteria or check API quota`);
      return null;
    }

    console.log(`📊 getRandomMathPost: Found ${data.items.length} raw questions, applying quality filters...`);

    // Filter for ideal posts: 
    // - Score between 2-15 (not too popular, but quality)
    // - Has body text (not just title)
    // - Reasonable length (not too short/long)
    const filteredQuestions = data.items.filter(q => {
      const score = q.score || 0;
      const bodyLength = (q.body || '').length;
      
      return score >= 2 && 
             score <= 15 && 
             bodyLength > 100 && 
             bodyLength < 3000 &&
             q.accepted_answer_id && // Ensure it has accepted answer
             !q.closed_date; // Not closed
    });

    if (filteredQuestions.length === 0) {
      console.log('❌ getRandomMathPost: No questions passed quality filters');
      console.log('💭 getRandomMathPost: Consider adjusting filter criteria');
      return null;
    }

    console.log(`✅ getRandomMathPost: ${filteredQuestions.length} questions passed quality filters`);

    // Select random question from filtered results
    const randomIndex = Math.floor(Math.random() * filteredQuestions.length);
    const question = filteredQuestions[randomIndex];

    console.log(`🎲 getRandomMathPost: Selected question #${randomIndex + 1} from filtered results`);
    console.log(`📝 getRandomMathPost: Title - "${question.title}"`);
    console.log(`📊 getRandomMathPost: Score=${question.score}, Views=${question.view_count}, Answers=${question.answer_count}`);
    console.log(`✅ getRandomMathPost: Has accepted answer=${!!question.accepted_answer_id}`);

    const result = {
      question,
      url: `https://math.stackexchange.com/questions/${question.question_id}`,
      score: question.score,
      hasAcceptedAnswer: !!question.accepted_answer_id
    };
    
    console.log(`🔗 getRandomMathPost: Final URL - ${result.url}`);
    console.log('✅ getRandomMathPost: Post selection completed successfully');
    return result;
  } catch (error) {
    console.error('❌ getRandomMathPost: Error getting random math post:', error);
    console.error(`❌ getRandomMathPost: Error message - ${error.message}`);
    return null;
  }
}

/**
 * Helper function to convert StackExchange post
 */
async function convertStackExchangePost(url) {
  console.log('🧠 convertStackExchangePost: Starting post conversion...');
  console.log(`🔗 convertStackExchangePost: Input URL - ${url}`);
  try {
    // Extract question ID from URL
    console.log('🔍 convertStackExchangePost: Extracting question ID from URL...');
    const questionId = url.match(/questions\/(\d+)/)?.[1];
    if (!questionId) {
      console.log('❌ convertStackExchangePost: Invalid Stack Exchange URL format');
      throw new Error('Invalid Stack Exchange URL');
    }
    console.log(`🆔 convertStackExchangePost: Extracted question ID - ${questionId}`);

    // Fetch question data
    console.log('📡 convertStackExchangePost: Fetching detailed question data...');
    const apiUrl = `https://api.stackexchange.com/2.3/questions/${questionId}?site=math&filter=withbody`;
    console.log(`🔗 convertStackExchangePost: API URL - ${apiUrl}`);
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log(`❌ convertStackExchangePost: API request failed with status ${response.status}`);
      throw new Error(`API request failed: ${response.status}`);
    }
    console.log('✅ convertStackExchangePost: Question data fetched successfully');
    
    const data = await response.json();
    console.log(`📊 convertStackExchangePost: API quota remaining - ${data.quota_remaining || 'unknown'}`);
    
    if (!data.items || data.items.length === 0) {
      console.log('❌ convertStackExchangePost: Question not found in API response');
      throw new Error('Question not found');
    }

    const question = data.items[0];
    console.log(`📝 convertStackExchangePost: Question title - "${question.title}"`);
    console.log(`📊 convertStackExchangePost: Question stats - Score: ${question.score}, Views: ${question.view_count}`);
    
    // Use DeepSeek to convert to flashcard format with robust prompt
    console.log('🧹 convertStackExchangePost: Cleaning HTML and formatting question body...');
    const cleanBody = question.body.replace(/<[^>]*>/g, '').replace(/\$\$([^$]+)\$\$/g, '$1').trim();
    console.log(`📏 convertStackExchangePost: Cleaned body length - ${cleanBody.length} characters`);
    
    console.log('📝 convertStackExchangePost: Preparing DeepSeek prompt...');
    const prompt = `You are an expert mathematics educator creating high-quality flashcards for undergraduate students.

TASK: Convert the following Math StackExchange question into a structured flashcard.

INPUT DATA:
Title: "${question.title}"
Question Body: "${cleanBody}"

STRICT OUTPUT REQUIREMENTS:
1. You MUST respond with ONLY a valid JSON object
2. You MUST NOT include any text before or after the JSON
3. You MUST follow this EXACT schema:

{
  "statement": "string - A clear, concise mathematical statement or problem (max 200 words)",
  "hints": "string - 2-3 helpful hints for solving, separated by newlines (max 150 words)", 
  "proof": "string - Step-by-step solution with mathematical reasoning (max 300 words)",
  "tags": ["string", "string", "string"] - Exactly 3 relevant math tags from: ["algebra", "calculus", "geometry", "topology", "analysis", "linear-algebra", "abstract-algebra", "number-theory", "probability", "statistics", "discrete-math", "differential-equations", "complex-analysis", "real-analysis", "set-theory", "logic", "combinatorics", "graph-theory"]
}

CONTENT GUIDELINES:
- Use LaTeX notation for mathematical expressions: $x^2 + y^2 = r^2$
- Keep language clear and educational
- Focus on undergraduate-level concepts
- Avoid copying text verbatim from the source
- Ensure mathematical accuracy
- Make hints progressive (easier to harder)
- Include key steps in the proof

FORBIDDEN:
- Do not hallucinate mathematical facts
- Do not include advanced graduate-level concepts
- Do not use undefined notation
- Do not include non-mathematical content

EXAMPLE OUTPUT FORMAT:
{"statement": "Find the derivative of $f(x) = x^3 + 2x^2 - 5x + 1$", "hints": "Use the power rule for differentiation.\nRemember that the derivative of a constant is zero.\nApply the rule term by term.", "proof": "Using the power rule $\\frac{d}{dx}[x^n] = nx^{n-1}$:\n$f'(x) = 3x^2 + 4x - 5$\nEach term: $\\frac{d}{dx}[x^3] = 3x^2$, $\\frac{d}{dx}[2x^2] = 4x$, $\\frac{d}{dx}[-5x] = -5$, $\\frac{d}{dx}[1] = 0$", "tags": ["calculus", "derivatives", "algebra"]}

NOW CONVERT THE GIVEN QUESTION:`;

    console.log(`📏 convertStackExchangePost: Final prompt length - ${prompt.length} characters`);

    // Check if API key is available
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('❌ convertStackExchangePost: DEEPSEEK_API_KEY environment variable not set');
      throw new Error('DeepSeek API key not configured');
    }
    
    // Call DeepSeek API
    console.log('🧠 convertStackExchangePost: Sending request to DeepSeek API...');
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1500 // Add explicit token limit
      })
    });

    if (!deepseekResponse.ok) {
      console.log(`❌ convertStackExchangePost: DeepSeek API request failed with status ${deepseekResponse.status}`);
      const errorText = await deepseekResponse.text();
      console.log(`❌ convertStackExchangePost: DeepSeek API error response: ${errorText}`);
      throw new Error(`DeepSeek API request failed: ${deepseekResponse.status} - ${errorText}`);
    }
    console.log('✅ convertStackExchangePost: DeepSeek API request successful');

    const deepseekData = await deepseekResponse.json();
    console.log(`📊 convertStackExchangePost: DeepSeek usage - prompt_tokens: ${deepseekData.usage?.prompt_tokens || 'unknown'}, completion_tokens: ${deepseekData.usage?.completion_tokens || 'unknown'}`);
    
    if (!deepseekData.choices || deepseekData.choices.length === 0) {
      console.log('❌ convertStackExchangePost: No choices in DeepSeek response');
      console.log(`📄 convertStackExchangePost: Full DeepSeek response: ${JSON.stringify(deepseekData, null, 2)}`);
      throw new Error('No response choices from DeepSeek API');
    }
    
    const content = deepseekData.choices[0].message.content;
    console.log(`📝 convertStackExchangePost: Raw DeepSeek response length - ${content.length} characters`);
    console.log(`🔍 convertStackExchangePost: Response preview - ${content.substring(0, 200)}...`);
    
    // Parse JSON response
    console.log('🔧 convertStackExchangePost: Parsing JSON response...');
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('❌ convertStackExchangePost: No valid JSON found in AI response');
      console.log(`📄 convertStackExchangePost: Full response - ${content}`);
      throw new Error('Invalid response format from AI');
    }
    
    const jsonString = jsonMatch[0];
    console.log(`📏 convertStackExchangePost: Extracted JSON length - ${jsonString.length} characters`);
    
    const result = JSON.parse(jsonString);
    console.log('✅ convertStackExchangePost: JSON parsed successfully');
    console.log(`📊 convertStackExchangePost: Result summary - Statement: ${result.statement?.length || 0} chars, Hints: ${result.hints?.length || 0} chars, Proof: ${result.proof?.length || 0} chars, Tags: ${result.tags?.length || 0}`);
    
    return result;
  } catch (error) {
    console.error('❌ convertStackExchangePost: Error converting StackExchange post:', error);
    console.error(`❌ convertStackExchangePost: Error message - ${error.message}`);
    if (error.stack) {
      console.error(`❌ convertStackExchangePost: Error stack - ${error.stack}`);
    }
    
    // Try fallback: create a simple conversion from the original data
    console.log('🔄 convertStackExchangePost: Attempting fallback conversion...');
    try {
      const questionId = url.match(/questions\/(\d+)/)?.[1];
      if (questionId) {
        console.log('📡 convertStackExchangePost: Fetching basic question data for fallback...');
        const apiUrl = `https://api.stackexchange.com/2.3/questions/${questionId}?site=math&filter=withbody`;
        const response = await fetch(apiUrl);
        
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const question = data.items[0];
            const cleanTitle = question.title.replace(/<[^>]*>/g, '').trim();
            const cleanBody = question.body.replace(/<[^>]*>/g, '').replace(/\$\$([^$]+)\$\$/g, '$1').trim().substring(0, 300);
            
            console.log('✅ convertStackExchangePost: Using fallback conversion');
            return {
              statement: cleanTitle.length > 200 ? cleanTitle.substring(0, 197) + '...' : cleanTitle,
              hints: "Consider the mathematical definitions and properties involved. Break down the problem into smaller steps. Look for patterns or known theorems that apply.",
              proof: `Problem from StackExchange: ${cleanBody}${cleanBody.length >= 300 ? '...' : ''}\n\nThis problem requires detailed mathematical analysis. Please refer to the original source for the complete solution and discussion.`,
              tags: ['mathematics', 'problem-solving', 'undergraduate']
            };
          }
        }
      }
    } catch (fallbackError) {
      console.error('❌ convertStackExchangePost: Fallback conversion also failed:', fallbackError);
    }
    
    return null;
  }
}

/**
 * Helper function to publish flashcard
 */
async function publishFlashcard(conversion, bot) {
  console.log('🚀 publishFlashcard: Starting flashcard publication...');
  console.log(`🤖 publishFlashcard: Bot - ${bot.displayName} (${bot.id})`);
  try {
    // Generate slug
    console.log('🔤 publishFlashcard: Generating URL slug from statement...');
    let baseSlug = conversion.statement
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    let slugExists = true;
    
    while (slugExists) {
      console.log(`🔍 publishFlashcard: Checking if slug exists - "${slug}"`);
      const existingDoc = await db.collection('publicCards').doc(slug).get();
      if (!existingDoc.exists) {
        slugExists = false;
        console.log(`✅ publishFlashcard: Unique slug found - "${slug}"`);
      } else {
        counter++;
        slug = `${baseSlug}-${counter}`;
        console.log(`⏭️ publishFlashcard: Slug exists, trying - "${slug}"`);
      }
    }
    
    // Create flashcard document
    console.log('📄 publishFlashcard: Preparing flashcard document data...');
    const authorSlug = bot.displayName.toLowerCase().replace(/\s+/g, '-');
    const flashcardData = {
      statement: conversion.statement,
      hints: conversion.hints,
      proof: conversion.proof,
      tags: conversion.tags || [],
      slug: slug, // CRITICAL: Add the slug field
      authorId: bot.id,
      authorSlug: authorSlug,
      userId: bot.id, // Add userId for compatibility
      isBotPost: true,
      botId: bot.id,
      viewCount: 0,
      likeCount: 1, // Bot likes its own post
      importCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log(`📊 publishFlashcard: Document data summary - Tags: ${flashcardData.tags.length}, Author: ${authorSlug}, Bot: ${flashcardData.isBotPost}, Slug: ${slug}`);
    
    console.log('💾 publishFlashcard: Setting document in publicCards collection with slug as ID...');
    const docRef = db.collection('publicCards').doc(slug);
    await docRef.set(flashcardData);
    console.log(`✅ publishFlashcard: Document created with slug ID - ${slug}`);
    
    // Add the ID field to match the document ID
    await docRef.update({ id: slug });
    console.log('✅ publishFlashcard: Document ID field updated to match slug');
    
    const result = { id: slug, ...flashcardData };
    console.log('🎉 publishFlashcard: Flashcard publication completed successfully');
    return result;
  } catch (error) {
    console.error('❌ publishFlashcard: Error publishing flashcard:', error);
    console.error(`❌ publishFlashcard: Error message - ${error.message}`);
    return null;
  }
}

/**
 * Helper function to add bot self-like
 */
async function addBotSelfLike(cardId, bot) {
  console.log('👍 addBotSelfLike: Starting bot self-like process...');
  console.log(`📄 addBotSelfLike: Card ID - ${cardId}`);
  console.log(`🤖 addBotSelfLike: Bot - ${bot.displayName} (${bot.id})`);
  try {
    // Add like to cardLikes collection (if it exists)
    console.log('📝 addBotSelfLike: Preparing like document data...');
    const userSlug = bot.displayName.toLowerCase().replace(/\s+/g, '-');
    const likeData = {
      cardId: cardId,
      userId: bot.id,
      userSlug: userSlug,
      isBot: true,
      botId: bot.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log(`📊 addBotSelfLike: Like data summary - User: ${userSlug}, Bot: ${likeData.isBot}`);
    
    // Add to likes collection
    console.log('💾 addBotSelfLike: Adding like to cardLikes collection...');
    const likeRef = await db.collection('cardLikes').add(likeData);
    console.log(`✅ addBotSelfLike: Like document created with ID - ${likeRef.id}`);
    
    // Increment like count on the card (cardId is now the slug)
    console.log('📈 addBotSelfLike: Incrementing like count on card...');
    await db.collection('publicCards').doc(cardId).update({
      likeCount: admin.firestore.FieldValue.increment(1)
    });
    console.log('✅ addBotSelfLike: Card like count incremented');
    
    console.log(`🎉 addBotSelfLike: Bot ${bot.displayName} successfully liked card ${cardId}`);
    return true;
  } catch (error) {
    console.error(`❌ addBotSelfLike: Error adding bot self-like for card ${cardId}:`, error);
    console.error(`❌ addBotSelfLike: Error message - ${error.message}`);
    return false;
  }
}
