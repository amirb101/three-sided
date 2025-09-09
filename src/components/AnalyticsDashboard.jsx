import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AnalyticsService } from '../services/analyticsService';

const AnalyticsDashboard = ({ onClose }) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState(null);
  const [timeframe, setTimeframe] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeframe]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [userAnalytics, userInsights] = await Promise.all([
        AnalyticsService.getUserAnalytics(user.uid),
        AnalyticsService.getUserInsights(user.uid, timeframe)
      ]);
      
      setAnalytics(userAnalytics);
      setInsights(userInsights);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPercentage = (value) => `${Math.round(value * 100)}%`;

  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center" style={{backgroundColor: 'var(--claude-background)'}}>
        <div className="claude-card p-8 text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="claude-text-secondary">Loading your analytics...</p>
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
              📊 Learning Analytics
            </h1>
            <p className="claude-text-secondary">
              Track your progress, identify patterns, and optimize your learning
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

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 claude-card p-1 rounded-2xl">
          {[
            { id: 'overview', label: '📈 Overview', icon: '📈' },
            { id: 'performance', label: '🎯 Performance', icon: '🎯' },
            { id: 'insights', label: '💡 Insights', icon: '💡' },
            { id: 'progress', label: '📚 Progress', icon: '📚' }
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
          <OverviewTab analytics={analytics} insights={insights} formatTime={formatTime} formatPercentage={formatPercentage} />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceTab analytics={analytics} insights={insights} formatPercentage={formatPercentage} />
        )}
        
        {activeTab === 'insights' && (
          <InsightsTab insights={insights} formatTime={formatTime} />
        )}
        
        {activeTab === 'progress' && (
          <ProgressTab analytics={analytics} insights={insights} formatPercentage={formatPercentage} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ analytics, insights, formatTime, formatPercentage }) => (
  <div className="space-y-8">
    {/* Key Metrics */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Study Time"
        value={formatTime(analytics?.totalStudyTime || 0)}
        icon="⏱️"
        color="blue"
        trend={insights?.studyTimeTrend}
      />
      <MetricCard
        title="Study Sessions"
        value={analytics?.totalSessions || 0}
        icon="📚"
        color="green"
      />
      <MetricCard
        title="Overall Accuracy"
        value={formatPercentage(analytics?.overallAccuracy || 0)}
        icon="🎯"
        color="purple"
        trend={insights?.accuracyTrend}
      />
      <MetricCard
        title="Study Streak"
        value={`${analytics?.studyStreak || 0} days`}
        icon="🔥"
        color="orange"
      />
    </div>

    {/* Study Overview */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Recent Activity */}
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          📅 Recent Activity
        </h3>
        <div className="space-y-4">
          {analytics?.deckStats && Object.entries(analytics.deckStats).slice(0, 5).map(([deckId, stats]) => (
            <div key={deckId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div>
                <div className="font-medium">Deck {deckId.slice(-6)}</div>
                <div className="text-sm claude-text-muted">{stats.sessions} sessions</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatPercentage(stats.accuracy)}</div>
                <div className="text-sm claude-text-muted">{formatTime(stats.studyTime)}</div>
              </div>
            </div>
          ))}
          {(!analytics?.deckStats || Object.keys(analytics.deckStats).length === 0) && (
            <div className="text-center py-8 claude-text-muted">
              No study activity yet. Start studying to see your progress!
            </div>
          )}
        </div>
      </div>

      {/* Performance Trends */}
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          📈 Performance Trends
        </h3>
        <div className="space-y-4">
          <TrendIndicator
            label="Accuracy Trend"
            value={insights?.accuracyTrend || 0}
            description="How your accuracy has changed recently"
          />
          <TrendIndicator
            label="Study Time Trend"
            value={insights?.studyTimeTrend || 0}
            description="How your study duration has changed"
          />
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-800">Mastery Progress</div>
            <div className="text-sm text-blue-600 mb-2">
              Overall understanding: {formatPercentage(insights?.masteryProgress || 0)}
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{width: `${(insights?.masteryProgress || 0) * 100}%`}}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Performance Tab Component
const PerformanceTab = ({ analytics, insights, formatPercentage }) => (
  <div className="space-y-8">
    {/* Subject Performance */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        📊 Subject Performance
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analytics?.subjectStats && Object.entries(analytics.subjectStats).map(([subject, stats]) => (
          <div key={subject} className="p-4 border rounded-lg">
            <div className="font-medium mb-2">{subject || 'General'}</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm claude-text-muted">Accuracy:</span>
                <span className="font-medium">{formatPercentage(stats.accuracy)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm claude-text-muted">Mastery:</span>
                <span className="font-medium">{formatPercentage(stats.masteryLevel || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{width: `${stats.accuracy * 100}%`}}
                ></div>
              </div>
            </div>
          </div>
        ))}
        {(!analytics?.subjectStats || Object.keys(analytics.subjectStats).length === 0) && (
          <div className="col-span-full text-center py-8 claude-text-muted">
            No subject data available yet. Study more to see subject breakdown!
          </div>
        )}
      </div>
    </div>

    {/* Struggling Cards */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        ⚠️ Cards Needing Attention
      </h3>
      <div className="space-y-4">
        {insights?.strugglingCards && insights.strugglingCards.length > 0 ? (
          insights.strugglingCards.map((card, index) => (
            <div key={card.cardId} className="flex items-center justify-between p-4 border-l-4 border-red-500 bg-red-50">
              <div>
                <div className="font-medium">Card {card.cardId.slice(-6)}</div>
                <div className="text-sm text-red-600">{card.totalReviews} attempts</div>
              </div>
              <div className="text-right">
                <div className="text-red-700 font-bold">{formatPercentage(card.accuracy)}</div>
                <div className="text-sm text-red-600">accuracy</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-green-600">
            🎉 Great job! No cards need special attention right now.
          </div>
        )}
      </div>
    </div>
  </div>
);

// Insights Tab Component
const InsightsTab = ({ insights, formatTime }) => (
  <div className="space-y-8">
    {/* Recommendations */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        💡 Personalized Recommendations
      </h3>
      <div className="space-y-4">
        {insights?.recommendations && insights.recommendations.length > 0 ? (
          insights.recommendations.map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'high' ? 'border-red-500 bg-red-50' :
              rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-500 bg-blue-50'
            }`}>
              <div className={`font-medium ${
                rec.priority === 'high' ? 'text-red-800' :
                rec.priority === 'medium' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {rec.title}
              </div>
              <div className={`text-sm mt-1 ${
                rec.priority === 'high' ? 'text-red-600' :
                rec.priority === 'medium' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {rec.description}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 claude-text-muted">
            Keep studying to get personalized recommendations!
          </div>
        )}
      </div>
    </div>

    {/* Study Habits */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          ⏰ Optimal Study Time
        </h3>
        <div className="text-center">
          <div className="text-3xl mb-2">
            {insights?.optimalStudyTime === 'morning' ? '🌅' :
             insights?.optimalStudyTime === 'afternoon' ? '☀️' : '🌙'}
          </div>
          <div className="text-lg font-medium capitalize">
            {insights?.optimalStudyTime || 'Not enough data'}
          </div>
          <div className="text-sm claude-text-muted mt-2">
            You perform best during this time
          </div>
        </div>
      </div>

      <div className="claude-card p-6 rounded-2xl">
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
          📊 Consistency Score
        </h3>
        <div className="text-center">
          <div className="text-3xl font-bold mb-2" style={{color: 'var(--claude-accent)'}}>
            {Math.round((insights?.consistencyScore || 0) * 100)}%
          </div>
          <div className="text-sm claude-text-muted">
            How consistent your study sessions are
          </div>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
            <div 
              className="claude-gradient h-3 rounded-full transition-all duration-300"
              style={{width: `${(insights?.consistencyScore || 0) * 100}%`}}
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Progress Tab Component
const ProgressTab = ({ analytics, insights, formatPercentage }) => (
  <div className="space-y-8">
    {/* Overall Progress */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        📈 Learning Progress
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2" style={{color: 'var(--claude-success)'}}>
            {formatPercentage(insights?.masteryProgress || 0)}
          </div>
          <div className="text-sm claude-text-muted">Overall Mastery</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2" style={{color: 'var(--claude-accent)'}}>
            {analytics?.studyStreak || 0}
          </div>
          <div className="text-sm claude-text-muted">Day Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold mb-2" style={{color: 'var(--claude-warning)'}}>
            {analytics?.longestStreak || 0}
          </div>
          <div className="text-sm claude-text-muted">Longest Streak</div>
        </div>
      </div>
    </div>

    {/* Strong Subjects */}
    <div className="claude-card p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4" style={{color: 'var(--claude-heading)'}}>
        🌟 Your Strongest Subjects
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights?.strongSubjects && insights.strongSubjects.length > 0 ? (
          insights.strongSubjects.map((subject, index) => (
            <div key={subject} className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-medium text-green-800">{subject}</div>
              <div className="text-sm text-green-600">Strong performance</div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 claude-text-muted">
            Keep studying to identify your strongest subjects!
          </div>
        )}
      </div>
    </div>
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, icon, color, trend }) => (
  <div className="claude-card p-6 rounded-2xl relative overflow-hidden">
    <div className="flex items-center justify-between mb-4">
      <div className="text-2xl">{icon}</div>
      {trend !== undefined && (
        <div className={`text-sm font-medium ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {trend > 0 ? '↗️' : trend < 0 ? '↘️' : '→'} {Math.abs(trend * 100).toFixed(1)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold mb-1" style={{color: `var(--claude-${color || 'accent'})`}}>
      {value}
    </div>
    <div className="text-sm claude-text-muted">{title}</div>
  </div>
);

// Trend Indicator Component
const TrendIndicator = ({ label, value, description }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div>
      <div className="font-medium">{label}</div>
      <div className="text-sm claude-text-muted">{description}</div>
    </div>
    <div className={`text-right ${
      value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
    }`}>
      <div className="font-bold">
        {value > 0 ? '↗️' : value < 0 ? '↘️' : '→'} {Math.abs(value * 100).toFixed(1)}%
      </div>
      <div className="text-sm">
        {value > 0 ? 'Improving' : value < 0 ? 'Declining' : 'Stable'}
      </div>
    </div>
  </div>
);

export default AnalyticsDashboard;
