import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import BrokenCardsReview from './BrokenCardsReview';
import AutomationMonitor from './AutomationMonitor';
import { useAuth } from '../../contexts/AuthContext';
import { BotService } from '../../services/botService.js';
import DOMPurify from 'dompurify';

const StackExchangeConverter = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversion, setConversion] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bots, setBots] = useState([]);
  const [showBrokenCardsReview, setShowBrokenCardsReview] = useState(false);
  const [selectedBot, setSelectedBot] = useState('');
  const [automation, setAutomation] = useState({
    enabled: false,
    interval: 24, // hours
    lastRun: null,
    nextRun: null
  });

  useEffect(() => {
    loadBots();
    loadAutomationSettings();
  }, []);

  const loadBots = async () => {
    try {
      const botAccounts = await BotService.getBotAccounts();
      setBots(botAccounts);
    } catch (error) {
      console.error('Error loading bots:', error);
    }
  };

  const loadAutomationSettings = async () => {
    try {
      const settings = await BotService.getAutomationSettings();
      setAutomation(settings);
    } catch (error) {
      console.error('Error loading automation settings:', error);
    }
  };

  const getRandomMathPost = async () => {
    setLoading(true);
    try {
      const getRandomPost = httpsCallable(functions, 'getRandomMathPost');
      const result = await getRandomPost();
      
      const post = result.data;
      setUrl(post.url);
      
      // Auto-convert if user wants
      if (confirm(`Found: "${post.question.title}" (${post.question.score} votes)\n\nAuto-convert to flashcard?`)) {
        await convertStackExchangePost(post.url);
      }
    } catch (error) {
      console.error('Error getting random post:', error);
      alert('Failed to get random math post: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const convertStackExchangePost = async (postUrl = null) => {
    const targetUrl = postUrl || url;
    if (!targetUrl) {
      alert('Please enter a Stack Exchange URL');
      return;
    }

    setLoading(true);
    try {
      const convertPost = httpsCallable(functions, 'convertStackExchangePost');
      const result = await convertPost({ url: targetUrl });
      
      setConversion(result.data);
      setEditing(false);
    } catch (error) {
      console.error('Error converting post:', error);
      alert('Failed to convert post: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateConversion = (field, value) => {
    setConversion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const publishFlashcard = async () => {
    if (!selectedBot) {
      alert('Please select a bot account');
      return;
    }

    if (!conversion) {
      alert('No conversion data available');
      return;
    }

    setLoading(true);
    try {
      const publishFlashcard = httpsCallable(functions, 'publishStackExchangeFlashcard');
      const result = await publishFlashcard({
        conversion,
        botId: selectedBot
      });

      alert('Flashcard published successfully!');
      
      // Reset form
      setConversion(null);
      setUrl('');
      setSelectedBot('');
    } catch (error) {
      console.error('Error publishing flashcard:', error);
      alert('Failed to publish flashcard: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async () => {
    try {
      const newAutomation = {
        ...automation,
        enabled: !automation.enabled
      };
      
      await BotService.updateAutomationSettings(newAutomation);
      setAutomation(newAutomation);
    } catch (error) {
      console.error('Error updating automation:', error);
      alert('Failed to update automation settings');
    }
  };

  const updateAutomationInterval = async (interval) => {
    try {
      const newAutomation = {
        ...automation,
        interval: parseInt(interval)
      };
      
      await BotService.updateAutomationSettings(newAutomation);
      setAutomation(newAutomation);
    } catch (error) {
      console.error('Error updating automation interval:', error);
      alert('Failed to update automation interval');
    }
  };

  const triggerAutomationPipeline = async () => {
    // Check if there are active bots first
    if (bots.length === 0) {
      alert('❌ No bots available!\n\nYou need to create at least one bot account before triggering automation.\n\nGo to the "Bots" tab to create a bot first.');
      return;
    }

    const activeBots = bots.filter(bot => bot.isActive);
    if (activeBots.length === 0) {
      alert('❌ No active bots!\n\nYou have bots, but none are currently active.\n\nActivate at least one bot in the "Bots" tab before triggering automation.');
      return;
    }

    if (!confirm(`This will trigger the full automation pipeline:\n\n1. Select random bot (from ${activeBots.length} active bots)\n2. Get random StackExchange post\n3. Convert to flashcard with DeepSeek AI\n4. Publish as bot\n5. Bot likes own post\n\nContinue?`)) {
      return;
    }

    setLoading(true);
    try {
      const triggerAutomation = httpsCallable(functions, 'triggerAutomation');
      const result = await triggerAutomation();
      
      const data = result.data;
      alert(`✅ Automation completed successfully!\n\nBot: ${data.botName}\nPost ID: ${data.postId}\nCard URL: ${data.cardUrl || 'Not available'}\nSource: ${data.stackExchangeUrl}\n\nCheck the Cloud Functions logs for detailed execution info.`);
      
      // Refresh bots to see updated stats
      loadBots();
      loadAutomationSettings(); // Refresh automation stats
    } catch (error) {
      console.error('Error triggering automation:', error);
      let errorMsg = error.message;
      
      // Provide more helpful error messages
      if (errorMsg.includes('Failed to get random math post')) {
        errorMsg = 'StackExchange API issue - likely rate limited. Try again in a few minutes.';
      } else if (errorMsg.includes('No active bot accounts')) {
        errorMsg = 'No active bots found. Create and activate a bot first.';
      } else if (errorMsg.includes('DeepSeek')) {
        errorMsg = 'AI conversion failed. Check DeepSeek API key and credits.';
      }
      
      alert(`❌ Automation failed: ${errorMsg}\n\nCheck the browser console and Cloud Functions logs for more details.`);
    } finally {
      setLoading(false);
    }
  };


  const stopAutomation = async () => {
    if (!confirm('Are you sure you want to stop the automation? This will disable all scheduled automated posting.')) {
      return;
    }

    try {
      const stoppedAutomation = {
        ...automation,
        enabled: false,
        lastStopped: new Date().toISOString()
      };
      
      await BotService.updateAutomationSettings(stoppedAutomation);
      setAutomation(stoppedAutomation);
      
      alert('🛑 Automation has been stopped. No more automated posts will be created.');
    } catch (error) {
      console.error('Error stopping automation:', error);
      alert('Failed to stop automation: ' + error.message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">🔄 StackExchange to Flashcard Converter</h2>
      
      {/* Automation Settings */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">🤖 Automation Settings</h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${automation.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            <div className={`w-2 h-2 rounded-full ${automation.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            {automation.enabled ? 'ACTIVE' : 'STOPPED'}
          </div>
        </div>
        <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Automated Posting Control:</span>
                    <div className="flex gap-2">
                      {!automation.enabled ? (
                        <button
                          onClick={toggleAutomation}
                          disabled={loading || bots.length === 0 || bots.filter(bot => bot.isActive).length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <span className="animate-pulse">🚀</span>
                          Start Automation
                        </button>
                      ) : (
                        <button
                          onClick={stopAutomation}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          🛑 Stop Automation
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {bots.length === 0 && (
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                      ⚠️ Create bots first
                    </span>
                  )}
                  {bots.length > 0 && bots.filter(bot => bot.isActive).length === 0 && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                      ⚠️ Activate bots first
                    </span>
                  )}
                </div>
          
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Post every:</label>
            <select
              value={automation.interval}
              onChange={(e) => updateAutomationInterval(e.target.value)}
              disabled={!automation.enabled}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={180}>3 hours</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>
          
          {automation.lastRun && (
            <p className="text-sm text-gray-600">Last run: {new Date(automation.lastRun).toLocaleString()}</p>
          )}
          {automation.nextRun && (
            <p className="text-sm text-gray-600">Next run: {new Date(automation.nextRun).toLocaleString()}</p>
          )}
        </div>
      </div>

      {/* Manual Conversion */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Manual Conversion</h3>
        
        <div className="flex gap-3 mb-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://math.stackexchange.com/questions/..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => convertStackExchangePost()}
            disabled={loading || !url}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Converting...' : 'Convert to Flashcard'}
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={getRandomMathPost}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              🎲 Test: Get Random Math Post
            </button>
            
            <button
              onClick={() => setShowBrokenCardsReview(!showBrokenCardsReview)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {showBrokenCardsReview ? '🔼 Hide' : '🔍 Review'} Broken Cards
            </button>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm font-medium text-gray-700">Manual Testing:</span>
              {bots.length === 0 && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  ⚠️ Create bots first
                </span>
              )}
              {bots.length > 0 && bots.filter(bot => bot.isActive).length === 0 && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  ⚠️ Activate bots first
                </span>
              )}
            </div>
            <button
              onClick={triggerAutomationPipeline}
              disabled={loading || bots.length === 0 || bots.filter(bot => bot.isActive).length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Test Full Pipeline Once
            </button>
            <p className="text-xs text-gray-500 mt-1">
              This runs the entire automation once for testing. The scheduled automation above runs automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Result */}
      {conversion && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Conversion Result</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statement:</label>
              {editing ? (
                <textarea
                  value={conversion.statement}
                  onChange={(e) => updateConversion('statement', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
              ) : (
                <div className="p-4 bg-white border border-gray-200 rounded-lg prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(conversion.statement) }} />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hints:</label>
              {editing ? (
                <textarea
                  value={conversion.hints}
                  onChange={(e) => updateConversion('hints', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              ) : (
                <div className="p-4 bg-white border border-gray-200 rounded-lg prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(conversion.hints) }} />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proof:</label>
              {editing ? (
                <textarea
                  value={conversion.proof}
                  onChange={(e) => updateConversion('proof', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
              ) : (
                <div className="p-4 bg-white border border-gray-200 rounded-lg prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(conversion.proof) }} />
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags:</label>
              {editing ? (
                <input
                  type="text"
                  value={conversion.tags?.join(', ') || ''}
                  onChange={(e) => updateConversion('tags', e.target.value.split(',').map(t => t.trim()))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {conversion.tags?.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setEditing(!editing)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {editing ? 'Preview' : 'Edit'}
            </button>
            
            <button
              onClick={() => convertStackExchangePost()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Publishing */}
      {conversion && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Publish Flashcard</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Bot Account:</label>
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a bot...</option>
              {bots.map(bot => (
                <option key={bot.id} value={bot.id}>
                  {bot.displayName} ({bot.email})
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={publishFlashcard}
            disabled={loading || !selectedBot}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish Flashcard'}
          </button>
        </div>
      )}

      {/* Broken Cards Review */}
      {showBrokenCardsReview && (
        <BrokenCardsReview />
      )}

      {/* Automation Monitor */}
      <AutomationMonitor />
    </div>
  );
};

export default StackExchangeConverter;
