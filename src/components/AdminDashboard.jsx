import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdminService } from '../services/adminService.js';
import StackExchangeConverter from './admin/StackExchangeConverter';
import BotManager from './admin/BotManager';

// BotService is now imported separately to prevent tree-shaking issues


const AdminDashboard = ({ onClose }) => {
  const { user } = useAuth();
  const [adminStatus, setAdminStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [publicCards, setPublicCards] = useState([]);
  const [adminActivity, setAdminActivity] = useState([]);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      setIsLoading(true);
      const hasAccess = await AdminService.verifyAdminAccess(user);
      
      if (!hasAccess) {
        console.log('❌ No admin access, closing dashboard');
        // Not an admin - redirect or show error
        onClose && onClose();
        return;
      }
      
      const status = await AdminService.getAdminStatus(user.uid);
      setAdminStatus(status);
      
      // Load initial data
      await loadSystemStats();
      
    } catch (error) {
      console.error('❌ Error checking admin access:', error);
      onClose && onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      const stats = await AdminService.getSystemStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await AdminService.getAllUsers(100);
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadPublicCards = async () => {
    try {
      const cards = await AdminService.getPublicCardsForModeration(50);
      setPublicCards(cards);
    } catch (error) {
      console.error('Error loading public cards:', error);
    }
  };

  const loadAdminActivity = async () => {
    try {
      const activity = await AdminService.getAdminActivity(30);
      setAdminActivity(activity);
    } catch (error) {
      console.error('Error loading admin activity:', error);
    }
  };

  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    
    // Load data for specific tabs
    switch (tab) {
      case 'users':
        await loadUsers();
        break;
      case 'content':
        await loadPublicCards();
        break;
      case 'activity':
        await loadAdminActivity();
        break;
    }
  };

  const handleUserPremiumToggle = async (userId, isPremium) => {
    try {
      await AdminService.updateUserPremium(userId, isPremium);
      await AdminService.logAdminAction(user.uid, 'user_premium_update', {
        targetUserId: userId,
        newStatus: isPremium
      });
      await loadUsers(); // Refresh
    } catch (error) {
      console.error('Error updating user premium:', error);
      alert('Failed to update user premium status');
    }
  };

  const handleCardModeration = async (cardId, action, reason = '') => {
    try {
      await AdminService.moderateCard(cardId, action, reason);
      await AdminService.logAdminAction(user.uid, 'content_moderation', {
        cardId,
        action,
        reason
      });
      await loadPublicCards(); // Refresh
    } catch (error) {
      console.error('Error moderating card:', error);
      alert('Failed to moderate content');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="claude-text-secondary">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!adminStatus?.isAdmin) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
          <p className="claude-text-secondary mb-6">
            You don't have administrator privileges to access this dashboard.
          </p>
          <button onClick={onClose} className="claude-button-primary">
            Return to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20" style={{backgroundColor: 'var(--claude-background)'}}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-extrabold mb-2 text-red-600">
              🔧 Admin Dashboard
            </h1>
            <p className="claude-text-secondary">
              System management and content moderation
            </p>
            <div className="mt-2 flex items-center gap-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                {adminStatus.adminLevel.toUpperCase()} ADMIN
              </span>
              <span className="text-sm claude-text-muted">
                Logged in as: {user.email}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <button
              onClick={loadSystemStats}
              className="claude-button-secondary"
            >
              🔄 Refresh Data
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="claude-button-secondary"
              >
                ✕ Close Admin
              </button>
            )}
          </div>
        </div>

        {/* Admin Warning Banner */}
        <div className="mb-8 claude-card p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-red-800">Administrator Mode Active</div>
              <div className="text-sm text-red-600">
                All actions are logged. Use admin privileges responsibly.
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 claude-card p-1 rounded-2xl">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'users', label: '👥 Users', icon: '👥' },
            { id: 'content', label: '📝 Content', icon: '📝' },
            { id: 'activity', label: '📋 Activity', icon: '📋' },
            { id: 'stackexchange', label: '🔄 StackExchange', icon: '🔄' },
            { id: 'bots', label: '🤖 Bots', icon: '🤖' }
          ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'claude-text-secondary hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label.replace(/^.+\s/, '')}</span>
              </button>
            ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab systemStats={systemStats} />
        )}
        
        {activeTab === 'users' && (
          <UsersTab users={users} onPremiumToggle={handleUserPremiumToggle} />
        )}
        
        {activeTab === 'content' && (
          <ContentTab publicCards={publicCards} onModerate={handleCardModeration} />
        )}
        
        {activeTab === 'stackexchange' && (
          <div className="admin-section">
            <h3>🔄 StackExchange Integration</h3>
            <StackExchangeConverter />
          </div>
        )}
        
        {activeTab === 'bots' && (
          <div className="admin-section">
            <h3>🤖 Bot Management</h3>
            <BotManager />
          </div>
        )}
        
        {activeTab === 'activity' && (
          <ActivityTab adminActivity={adminActivity} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ systemStats }) => (
  <div className="space-y-8">
    {/* System Health */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AdminMetricCard
        title="Total Users"
        value={systemStats?.users?.total || 0}
        icon="👥"
        color="blue"
        subtitle={`${systemStats?.users?.recentlyActive || 0} active this week`}
      />
      <AdminMetricCard
        title="Premium Users"
        value={systemStats?.users?.premium || 0}
        icon="⭐"
        color="gold"
        subtitle={`${systemStats?.users?.conversionRate || 0}% conversion rate`}
      />
      <AdminMetricCard
        title="Total Content"
        value={systemStats?.content?.totalCards || 0}
        icon="📚"
        color="green"
        subtitle={`${systemStats?.content?.totalPublicCards || 0} public cards`}
      />
      <AdminMetricCard
        title="Recent Activity"
        value={systemStats?.content?.recentPublicCards || 0}
        icon="📈"
        color="purple"
        subtitle="New public cards this week"
      />
    </div>

    {/* System Status */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-green-500">🟢</span>
          System Status
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Database</span>
            <span className="text-green-600 font-medium">Operational</span>
          </div>
          <div className="flex justify-between">
            <span>Authentication</span>
            <span className="text-green-600 font-medium">Operational</span>
          </div>
          <div className="flex justify-between">
            <span>File Storage</span>
            <span className="text-green-600 font-medium">Operational</span>
          </div>
          <div className="flex justify-between">
            <span>Analytics</span>
            <span className="text-green-600 font-medium">Operational</span>
          </div>
        </div>
      </div>

      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4">📊 Usage Statistics</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Avg Cards per User</span>
            <span className="font-medium">{systemStats?.content?.avgCardsPerUser || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Admin Users</span>
            <span className="font-medium">{systemStats?.users?.admin || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Public vs Private</span>
            <span className="font-medium">
              {systemStats?.content?.totalPublicCards || 0} / {systemStats?.content?.totalPrivateCards || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Last Updated</span>
            <span className="font-medium text-sm">
              {systemStats?.system?.lastUpdated ? new Date(systemStats.system.lastUpdated).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Users Tab Component
const UsersTab = ({ users, onPremiumToggle }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold">User Management</h3>
      <div className="text-sm claude-text-muted">
        {users.length} users loaded
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map(user => (
        <div key={user.id} className="claude-card p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-bold">{user.displayName}</h4>
              <p className="text-sm claude-text-muted">{user.email}</p>
              <p className="text-xs claude-text-muted">
                Joined: {user.joinDate.toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {user.isPremium && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Premium</span>
              )}
              {user.isAdmin && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Admin</span>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span>Profile:</span>
              <span>{user.profile?.displayName ? 'Complete' : 'Incomplete'}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Seen:</span>
              <span>{user.lastSeen.toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onPremiumToggle(user.id, !user.isPremium)}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                user.isPremium 
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {user.isPremium ? '❌ Remove Premium' : '⭐ Grant Premium'}
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Content Tab Component
const ContentTab = ({ publicCards, onModerate }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold">Content Moderation</h3>
      <div className="text-sm claude-text-muted">
        {publicCards.length} public cards
      </div>
    </div>

    <div className="space-y-4">
      {publicCards.map(card => (
        <div key={card.id} className="claude-card p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h4 className="font-bold mb-2">{card.statement?.substring(0, 100)}...</h4>
              <div className="flex items-center gap-4 text-sm claude-text-muted">
                <span>By: {card.author?.displayName || card.author?.email || 'Unknown'}</span>
                <span>Created: {card.createdDate.toLocaleDateString()}</span>
                <span>Likes: {card.likeCount || 0}</span>
                <span>Views: {card.viewCount || 0}</span>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onModerate(card.id, 'hide', 'Hidden by admin')}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200"
              >
                👁️ Hide
              </button>
              <button
                onClick={() => onModerate(card.id, 'remove', 'Removed by admin')}
                className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
              >
                🗑️ Remove
              </button>
            </div>
          </div>

          {card.isHidden && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ This card is currently hidden from public view
            </div>
          )}
          
          {card.isRemoved && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              🚫 This card has been removed
            </div>
          )}
        </div>
      ))}
      
      {publicCards.length === 0 && (
        <div className="text-center py-8 claude-text-muted">
          No public cards found
        </div>
      )}
    </div>
  </div>
);

// Activity Tab Component
const ActivityTab = ({ adminActivity }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold">Admin Activity Log</h3>
      <div className="text-sm claude-text-muted">
        Recent {adminActivity.length} actions
      </div>
    </div>

    <div className="space-y-3">
      {adminActivity.map(activity => (
        <div key={activity.id} className="claude-card p-4 rounded-xl">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium">{activity.action.replace(/_/g, ' ').toUpperCase()}</div>
              <div className="text-sm claude-text-muted">
                By: {activity.admin?.displayName || activity.admin?.email || 'Unknown'}
              </div>
              {activity.details && Object.keys(activity.details).length > 0 && (
                <div className="text-xs claude-text-muted mt-1">
                  Details: {JSON.stringify(activity.details, null, 2)}
                </div>
              )}
            </div>
            <div className="text-xs claude-text-muted">
              {activity.timestamp.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
      
      {adminActivity.length === 0 && (
        <div className="text-center py-8 claude-text-muted">
          No admin activity recorded
        </div>
      )}
    </div>
  </div>
);

// Admin Metric Card Component
const AdminMetricCard = ({ title, value, icon, color, subtitle }) => (
  <div className="claude-card p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className="text-2xl">{icon}</div>
      <div className={`w-3 h-3 rounded-full bg-${color}-500`}></div>
    </div>
    <div className={`text-2xl font-bold mb-1 text-${color}-600`}>
      {value}
    </div>
    <div className="text-sm font-medium mb-1">{title}</div>
    {subtitle && (
      <div className="text-xs claude-text-muted">{subtitle}</div>
    )}
  </div>
);

export default AdminDashboard;
