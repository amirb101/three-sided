import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const AutomationMonitor = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(true);

  useEffect(() => {
    if (!isLiveMode) return;

    // Subscribe to automation logs in real-time
    const logsQuery = query(
      collection(db, 'automationLogs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to automation logs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isLiveMode]);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toLocaleString();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'started': return '🚀';
      case 'step_success': return '✅';
      case 'step_failed': return '❌';
      case 'success': return '🎉';
      case 'failed': return '💥';
      case 'skipped': return '⏸️';
      case 'retry_scheduled': return '⏰';
      case 'retrying': return '🔄';
      default: return '📝';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'started': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'step_success': return 'text-green-600 bg-green-50 border-green-200';
      case 'step_failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'success': return 'text-green-700 bg-green-100 border-green-300';
      case 'failed': return 'text-red-700 bg-red-100 border-red-300';
      case 'skipped': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'retry_scheduled': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'retrying': return 'text-blue-700 bg-blue-100 border-blue-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRunProgress = (runId) => {
    const runLogs = logs.filter(log => log.details?.runId === runId);
    if (runLogs.length === 0) return { total: 0, completed: 0, status: 'unknown' };

    const hasStarted = runLogs.some(log => log.status === 'started');
    const hasCompleted = runLogs.some(log => log.status === 'success');
    const hasFailed = runLogs.some(log => log.status === 'failed');
    const stepSuccesses = runLogs.filter(log => log.status === 'step_success').length;

    return {
      total: hasStarted ? 6 : 0, // Expected steps: settings, timing, bots, select, fetch, convert, publish
      completed: stepSuccesses,
      status: hasFailed ? 'failed' : hasCompleted ? 'success' : hasStarted ? 'running' : 'unknown'
    };
  };

  // Group logs by run ID
  const groupedLogs = logs.reduce((groups, log) => {
    const runId = log.details?.runId || 'unknown';
    if (!groups[runId]) {
      groups[runId] = [];
    }
    groups[runId].push(log);
    return groups;
  }, {});

  const sortedRuns = Object.entries(groupedLogs).sort((a, b) => {
    const aLatest = Math.max(...a[1].map(log => log.timestamp?.getTime() || 0));
    const bLatest = Math.max(...b[1].map(log => log.timestamp?.getTime() || 0));
    return bLatest - aLatest;
  });

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <h3 className="text-lg font-semibold text-gray-800">Loading Automation Monitor...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">📊 Automation Monitor</h3>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">{isLiveMode ? 'Live' : 'Paused'}</span>
          <button
            onClick={() => setIsLiveMode(!isLiveMode)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isLiveMode 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isLiveMode ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <h4 className="text-lg font-medium text-gray-600 mb-1">No automation logs yet</h4>
          <p className="text-gray-500">Logs will appear here when the automation runs</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {sortedRuns.slice(0, 10).map(([runId, runLogs]) => {
            const progress = getRunProgress(runId);
            const latestLog = runLogs[0]; // Most recent log for this run
            const isRecent = latestLog.timestamp && (Date.now() - latestLog.timestamp.getTime()) < 5 * 60 * 1000; // 5 minutes

            return (
              <div key={runId} className={`border rounded-lg p-4 ${isRecent ? 'ring-2 ring-blue-200 border-blue-300' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {runId.substring(0, 12)}...
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(progress.status)}`}>
                      {getStatusIcon(progress.status)} {progress.status.toUpperCase()}
                    </span>
                    {progress.total > 0 && (
                      <span className="text-xs text-gray-500">
                        {progress.completed}/{progress.total} steps
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(latestLog.timestamp)}
                  </span>
                </div>

                {progress.total > 0 && (
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress.status === 'failed' ? 'bg-red-500' :
                          progress.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {runLogs.slice(0, 3).map((log, index) => (
                    <div key={log.id} className="flex items-start gap-2 text-sm">
                      <span className="text-xs">{getStatusIcon(log.status)}</span>
                      <div className="flex-1">
                        <span className="text-gray-700">{log.details?.message || 'No message'}</span>
                        {log.details?.error && (
                          <div className="text-red-600 text-xs mt-1">
                            Error: {log.details.error}
                          </div>
                        )}
                        {log.details?.step && (
                          <span className="text-xs text-gray-500 ml-2">
                            [{log.details.step}]
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                  ))}
                  {runLogs.length > 3 && (
                    <div className="text-xs text-gray-500 pl-4">
                      +{runLogs.length - 3} more logs...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing last 50 automation logs</span>
          <span>Updates automatically every few seconds</span>
        </div>
      </div>
    </div>
  );
};

export default AutomationMonitor;
