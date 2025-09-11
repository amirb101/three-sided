import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { BotService } from '../../services/botService.js';

const BotManager = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newBot, setNewBot] = useState({
    displayName: '',
    email: '',
    password: '',
    bio: '',
    avatar: ''
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setLoading(true);
    try {
      const botAccounts = await BotService.getBotAccounts();
      setBots(botAccounts);
    } catch (error) {
      console.error('Error loading bots:', error);
      alert('Failed to load bot accounts');
    } finally {
      setLoading(false);
    }
  };

  const createBot = async () => {
    if (!newBot.displayName || !newBot.email || !newBot.password) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const botId = await BotService.createBotAccount(newBot);
      
      alert('Bot account created successfully!');
      setNewBot({ displayName: '', email: '', password: '', bio: '', avatar: '' });
      setShowCreateForm(false);
      loadBots();
    } catch (error) {
      console.error('Error creating bot:', error);
      alert('Failed to create bot account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteBot = async (botId) => {
    if (!confirm('Are you sure you want to delete this bot account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await BotService.deleteBotAccount(botId);
      
      alert('Bot account deleted successfully!');
      loadBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
      alert('Failed to delete bot account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBotStatus = async (botId, isActive) => {
    setLoading(true);
    try {
      const updateBotStatus = httpsCallable(functions, 'updateBotStatus');
      await updateBotStatus({ botId, isActive: !isActive });
      
      loadBots();
    } catch (error) {
      console.error('Error updating bot status:', error);
      alert('Failed to update bot status: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">🤖 Bot Account Management</h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Create New Bot'}
        </button>
        
        <button
          onClick={loadBots}
          disabled={loading}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Create Bot Form */}
      {showCreateForm && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Bot Account</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Name:</label>
              <input
                type="text"
                value={newBot.displayName}
                onChange={(e) => setNewBot({ ...newBot, displayName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., MathBot Pro"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email:</label>
              <input
                type="email"
                value={newBot.email}
                onChange={(e) => setNewBot({ ...newBot, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., mathbot1@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password:</label>
              <input
                type="password"
                value={newBot.password}
                onChange={(e) => setNewBot({ ...newBot, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Strong password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL (optional):</label>
              <input
                type="url"
                value={newBot.avatar}
                onChange={(e) => setNewBot({ ...newBot, avatar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio:</label>
            <textarea
              value={newBot.bio}
              onChange={(e) => setNewBot({ ...newBot, bio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Brief description of this bot..."
            />
          </div>

          {/* Avatar Preview */}
          {newBot.avatar && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Preview:</label>
              <img 
                src={newBot.avatar} 
                alt="Avatar preview" 
                className="w-16 h-16 rounded-full object-cover border border-gray-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={createBot}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Bot'}
            </button>
            
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bot List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bot Accounts ({bots.length})</h3>
        
        {loading && <div className="text-gray-600 py-4">Loading bot accounts...</div>}
        
        {bots.length === 0 && !loading && (
          <div className="text-gray-600 py-8 text-center">
            <p>No bot accounts found. Create your first bot to get started!</p>
          </div>
        )}
        
        <div className="grid gap-4">
          {bots.map(bot => (
            <div key={bot.id} className={`p-4 rounded-lg border ${bot.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">{bot.displayName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bot.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {bot.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium">Email:</span> {bot.email}</p>
                    <p><span className="font-medium">Bio:</span> {bot.bio || 'No bio set'}</p>
                    <p><span className="font-medium">Created:</span> {bot.createdAt ? (bot.createdAt.toDate ? bot.createdAt.toDate().toLocaleDateString() : new Date(bot.createdAt).toLocaleDateString()) : 'Unknown'}</p>
                    <p><span className="font-medium">Posts:</span> {bot.postCount || 0}</p>
                    <p><span className="font-medium">Last Active:</span> {bot.lastActive ? new Date(bot.lastActive).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => toggleBotStatus(bot.id, bot.isActive)}
                    disabled={loading}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${bot.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                  >
                    {bot.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  <button
                    onClick={() => deleteBot(bot.id)}
                    disabled={loading}
                    className="px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
        ))}
        </div>
      </div>
    </div>
  );
};

export default BotManager;
