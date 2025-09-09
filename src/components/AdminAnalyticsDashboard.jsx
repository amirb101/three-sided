import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { WebsiteAnalyticsService } from '../services/websiteAnalyticsService';

const AdminAnalyticsDashboard = ({ onClose }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [userJourney, setUserJourney] = useState(null);
  const [timeframe, setTimeframe] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState({
    activeSessions: 0,
    currentPageViews: 0,
    recentInteractions: []
  });

  useEffect(() => {
    if (user) {
      loadAnalytics();
      // Set up real-time updates every 30 seconds
      const interval = setInterval(loadAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [user, timeframe]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [websiteAnalytics, journeyAnalytics] = await Promise.all([
        WebsiteAnalyticsService.getAnalyticsSummary(timeframe),
        WebsiteAnalyticsService.getUserJourneyAnalytics(timeframe)
      ]);
      
      setAnalytics(websiteAnalytics);
      setUserJourney(journeyAnalytics);
      
      // Calculate real-time metrics
      const activeSessions = websiteAnalytics.sessions.filter(s => s.isActive).length;
      const recentInteractions = websiteAnalytics.sessions
        .flatMap(s => s.actionsPerformed || [])
        .slice(-10);
      
      setRealTimeData({
        activeSessions,
        currentPageViews: websiteAnalytics.summary.totalPageViews,
        recentInteractions
      });
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const formatPercentage = (value) => `${Math.round(value * 100)}%`;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="claude-text-secondary">Loading website analytics...</p>
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
            <h1 className="text-4xl font-extrabold mb-2" style={{color: 'var(--claude-heading)'}}>
              🚀 Website Analytics
            </h1>
            <p className="claude-text-secondary">
              Track growth, engagement, and user behavior across your platform
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="claude-input"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            
            <button
              onClick={loadAnalytics}
              className="claude-button-secondary"
            >
              🔄 Refresh
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="claude-button-secondary"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* Real-time Stats Banner */}
        <div className="mb-8 claude-card p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Live Now</span>
              </div>
              <div className="text-sm claude-text-muted">
                {realTimeData.activeSessions} active sessions • {realTimeData.currentPageViews} page views today
              </div>
            </div>
            <div className="text-xs claude-text-muted">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 claude-card p-1 rounded-2xl">
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'traffic', label: '🌐 Traffic', icon: '🌐' },
            { id: 'engagement', label: '👆 Engagement', icon: '👆' },
            { id: 'journeys', label: '🗺️ User Journeys', icon: '🗺️' },
            { id: 'realtime', label: '⚡ Real-time', icon: '⚡' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'claude-gradient text-white shadow-lg'
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
          <OverviewTab analytics={analytics} formatDuration={formatDuration} formatPercentage={formatPercentage} />
        )}
        
        {activeTab === 'traffic' && (
          <TrafficTab analytics={analytics} formatDuration={formatDuration} />
        )}
        
        {activeTab === 'engagement' && (
          <EngagementTab analytics={analytics} formatDuration={formatDuration} />
        )}
        
        {activeTab === 'journeys' && (
          <JourneysTab userJourney={userJourney} />
        )}
        
        {activeTab === 'realtime' && (
          <RealTimeTab realTimeData={realTimeData} analytics={analytics} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, formatDuration, formatPercentage }) => (
  <div className="space-y-8">
    {/* Key Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Unique Users"
        value={analytics?.summary?.uniqueUsers || 0}
        icon="👥"
        color="blue"
        description="Distinct users this period"
      />
      <MetricCard
        title="Total Sessions"
        value={analytics?.summary?.totalSessions || 0}
        icon="🎯"
        color="green"
        description="User sessions tracked"
      />
      <MetricCard
        title="Page Views"
        value={analytics?.summary?.totalPageViews || 0}
        icon="👀"
        color="purple"
        description="Total pages visited"
      />
      <MetricCard
        title="Avg Session Duration"
        value={formatDuration(analytics?.summary?.avgSessionDuration || 0)}
        icon="⏱️"
        color="orange"
        description="Average time per session"
      />
    </div>

    {/* Popular Pages */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          📈 Most Popular Pages
        </h3>
        <div className="space-y-4">
          {analytics?.popularPages?.slice(0, 8).map((page, index) => (
            <div key={page.page} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-800">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">{page.page}</div>
                  <div className="text-sm claude-text-muted">{page.views} views</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">{formatDuration(page.avgTimeOnPage || 0)}</div>
                <div className="text-sm claude-text-muted">avg time</div>
              </div>
            </div>
          ))}
          {(!analytics?.popularPages || analytics.popularPages.length === 0) && (
            <div className="text-center py-8 claude-text-muted">
              No page data available yet
            </div>
          )}
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          📱 Device Breakdown
        </h3>
        <div className="space-y-4">
          {analytics?.deviceStats && Object.entries(analytics.deviceStats).map(([device, count]) => {
            const total = Object.values(analytics.deviceStats).reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const icon = device === 'mobile' ? '📱' : device === 'tablet' ? '📚' : '💻';
            
            return (
              <div key={device} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div className="font-medium capitalize">{device}</div>
                    <div className="text-sm claude-text-muted">{count} sessions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{Math.round(percentage)}%</div>
                  <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{width: `${percentage}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

// Traffic Tab Component
const TrafficTab = ({ analytics, formatDuration }) => (
  <div className="space-y-8">
    {/* Traffic Overview */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricCard
        title="Pages per Session"
        value={analytics?.summary?.avgPagesPerSession || 0}
        icon="📄"
        color="blue"
        description="Average pages viewed per session"
      />
      <MetricCard
        title="Total Interactions"
        value={analytics?.summary?.totalInteractions || 0}
        icon="🖱️"
        color="green"
        description="Total clicks and interactions"
      />
      <MetricCard
        title="Bounce Rate"
        value={`${Math.round(((analytics?.summary?.totalSessions - analytics?.summary?.totalPageViews) / analytics?.summary?.totalSessions || 0) * 100)}%`}
        icon="⚡"
        color="orange"
        description="Single page sessions"
      />
    </div>

    {/* Detailed Page Analytics */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        📊 Detailed Page Analytics
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-medium claude-text-secondary">Page</th>
              <th className="text-right py-3 px-4 font-medium claude-text-secondary">Views</th>
              <th className="text-right py-3 px-4 font-medium claude-text-secondary">Avg Time</th>
              <th className="text-right py-3 px-4 font-medium claude-text-secondary">Interactions</th>
              <th className="text-right py-3 px-4 font-medium claude-text-secondary">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {analytics?.popularPages?.map((page, index) => {
              const engagementRate = page.views > 0 ? (page.interactions / page.views) * 100 : 0;
              return (
                <tr key={page.page} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{page.page}</div>
                  </td>
                  <td className="text-right py-3 px-4 font-medium">{page.views}</td>
                  <td className="text-right py-3 px-4">{formatDuration(page.avgTimeOnPage || 0)}</td>
                  <td className="text-right py-3 px-4">{page.interactions}</td>
                  <td className="text-right py-3 px-4">
                    <span className={`font-medium ${
                      engagementRate > 50 ? 'text-green-600' : 
                      engagementRate > 20 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(engagementRate)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Engagement Tab Component
const EngagementTab = ({ analytics, formatDuration }) => (
  <div className="space-y-8">
    {/* Engagement Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Click Rate"
        value={`${Math.round((analytics?.summary?.totalInteractions / analytics?.summary?.totalPageViews || 0) * 100)}%`}
        icon="👆"
        color="blue"
        description="Interactions per page view"
      />
      <MetricCard
        title="Session Depth"
        value={analytics?.summary?.avgPagesPerSession || 0}
        icon="📚"
        color="green"
        description="Pages explored per session"
      />
      <MetricCard
        title="Return Rate"
        value={`${Math.round(((analytics?.summary?.uniqueUsers / analytics?.summary?.totalSessions || 0)) * 100)}%`}
        icon="🔄"
        color="purple"
        description="Users who return"
      />
      <MetricCard
        title="Engagement Score"
        value={Math.round(((analytics?.summary?.avgSessionDuration || 0) / 60) * (analytics?.summary?.avgPagesPerSession || 0))}
        icon="⭐"
        color="orange"
        description="Overall engagement rating"
      />
    </div>

    {/* Most Engaging Content */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        🔥 Most Engaging Content
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analytics?.popularPages?.slice(0, 6).map((page, index) => {
          const engagementScore = (page.avgTimeOnPage || 0) * (page.interactions || 0) / 100;
          return (
            <div key={page.page} className="p-4 border rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium">{page.page}</h4>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  #{index + 1}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="claude-text-muted">Time on Page</div>
                  <div className="font-medium">{formatDuration(page.avgTimeOnPage || 0)}</div>
                </div>
                <div>
                  <div className="claude-text-muted">Interactions</div>
                  <div className="font-medium">{page.interactions || 0}</div>
                </div>
                <div>
                  <div className="claude-text-muted">Views</div>
                  <div className="font-medium">{page.views}</div>
                </div>
                <div>
                  <div className="claude-text-muted">Engagement</div>
                  <div className="font-medium text-green-600">{Math.round(engagementScore)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// User Journeys Tab Component
const JourneysTab = ({ userJourney }) => (
  <div className="space-y-8">
    {/* Common Paths */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        🗺️ Most Common User Paths
      </h3>
      <div className="space-y-4">
        {userJourney?.commonPaths?.slice(0, 8).map((path, index) => (
          <div key={path.path} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-800">
                {index + 1}
              </div>
              <div className="font-mono text-sm">{path.path}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-purple-600">{path.count}</div>
              <div className="text-sm claude-text-muted">transitions</div>
            </div>
          </div>
        ))}
        {(!userJourney?.commonPaths || userJourney.commonPaths.length === 0) && (
          <div className="text-center py-8 claude-text-muted">
            No user journey data available yet
          </div>
        )}
      </div>
    </div>

    {/* Entry and Exit Points */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          🚪 Top Entry Points
        </h3>
        <div className="space-y-3">
          {userJourney?.entryPoints?.map((entry, index) => (
            <div key={entry.page} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="font-medium">{entry.page}</div>
              <div className="text-green-700 font-bold">{entry.count}</div>
            </div>
          ))}
          {(!userJourney?.entryPoints || userJourney.entryPoints.length === 0) && (
            <div className="text-center py-8 claude-text-muted">No entry data</div>
          )}
        </div>
      </div>

      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          🚪 Top Exit Points
        </h3>
        <div className="space-y-3">
          {userJourney?.exitPoints?.map((exit, index) => (
            <div key={exit.page} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="font-medium">{exit.page}</div>
              <div className="text-red-700 font-bold">{exit.count}</div>
            </div>
          ))}
          {(!userJourney?.exitPoints || userJourney.exitPoints.length === 0) && (
            <div className="text-center py-8 claude-text-muted">No exit data</div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Real-time Tab Component
const RealTimeTab = ({ realTimeData, analytics }) => (
  <div className="space-y-8">
    {/* Live Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="claude-card p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-bold text-green-800">Active Now</h3>
        </div>
        <div className="text-3xl font-bold text-green-600 mb-2">{realTimeData.activeSessions}</div>
        <div className="text-sm text-green-700">Active sessions</div>
      </div>

      <div className="claude-card p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">👀</span>
          <h3 className="font-bold text-blue-800">Page Views</h3>
        </div>
        <div className="text-3xl font-bold text-blue-600 mb-2">{realTimeData.currentPageViews}</div>
        <div className="text-sm text-blue-700">Total today</div>
      </div>

      <div className="claude-card p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🖱️</span>
          <h3 className="font-bold text-purple-800">Interactions</h3>
        </div>
        <div className="text-3xl font-bold text-purple-600 mb-2">{analytics?.summary?.totalInteractions || 0}</div>
        <div className="text-sm text-purple-700">Total clicks</div>
      </div>
    </div>

    {/* Recent Activity */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        ⚡ Recent Activity
      </h3>
      <div className="space-y-3">
        {realTimeData.recentInteractions.slice(0, 10).map((action, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">{action}</span>
            </div>
            <span className="text-sm claude-text-muted">Just now</span>
          </div>
        ))}
        {realTimeData.recentInteractions.length === 0 && (
          <div className="text-center py-8 claude-text-muted">
            No recent interactions
          </div>
        )}
      </div>
    </div>

    {/* Active Sessions Details */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        👥 Active Sessions Detail
      </h3>
      <div className="space-y-4">
        {analytics?.sessions?.filter(s => s.isActive).slice(0, 5).map((session, index) => (
          <div key={session.sessionId} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Session {session.sessionId.slice(-6)}</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="claude-text-muted">Device</div>
                <div>{session.isMobile ? '📱 Mobile' : session.isTablet ? '📚 Tablet' : '💻 Desktop'}</div>
              </div>
              <div>
                <div className="claude-text-muted">Page Views</div>
                <div>{session.pageViews || 0}</div>
              </div>
              <div>
                <div className="claude-text-muted">Duration</div>
                <div>{Math.round((session.timeSpent || 0) / 60)}m</div>
              </div>
              <div>
                <div className="claude-text-muted">Current Page</div>
                <div className="truncate">{session.currentPage || 'Unknown'}</div>
              </div>
            </div>
          </div>
        ))}
        {analytics?.sessions?.filter(s => s.isActive).length === 0 && (
          <div className="text-center py-8 claude-text-muted">
            No active sessions
          </div>
        )}
      </div>
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, icon, color, description }) => (
  <div className="claude-card p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className="text-2xl">{icon}</div>
    </div>
    <div className="text-2xl font-bold mb-1" style={{color: `var(--claude-${color || 'accent'})`}}>
      {value}
    </div>
    <div className="text-sm font-medium mb-1">{title}</div>
    {description && (
      <div className="text-xs claude-text-muted">{description}</div>
    )}
  </div>
);

export default AdminAnalyticsDashboard;
