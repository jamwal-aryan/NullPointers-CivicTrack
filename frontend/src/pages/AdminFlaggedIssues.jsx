import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminFlaggedIssues = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [flaggedIssues, setFlaggedIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'admin') {
      navigate('/login');
      return;
    }

    loadFlaggedIssues();
  }, [isAuthenticated, user, navigate]);

  const loadFlaggedIssues = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/flagged-issues', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load flagged issues');
      }

      const data = await response.json();
      setFlaggedIssues(data.issues || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewIssue = async (issueId, action, reason = '') => {
    try {
      const response = await fetch(`/api/admin/issues/${issueId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, reason })
      });

      if (!response.ok) {
        throw new Error('Failed to review issue');
      }

      // Reload flagged issues
      await loadFlaggedIssues();
      setSelectedIssue(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Loading flagged issues...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flagged Issues Review</h1>
          <p className="text-gray-600">
            Review and moderate flagged issues that require attention.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadFlaggedIssues}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Flagged Issues List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {flaggedIssues.map((issue) => (
              <li key={issue.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{issue.title}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        {issue.flag_count} flags
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{issue.description}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>Category: {issue.category}</span>
                      <span className="mx-2">•</span>
                      <span>Reported: {formatDate(issue.created_at)}</span>
                      <span className="mx-2">•</span>
                      <span>Status: {issue.status}</span>
                    </div>
                    {issue.flags && issue.flags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700">Flag Reasons:</p>
                        <div className="mt-1 space-y-1">
                          {issue.flags.map((flag, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              • {flag.reason} ({flag.flag_type})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="ml-6 flex space-x-2">
                    <button
                      onClick={() => setSelectedIssue(issue)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleReviewIssue(issue.id, 'approve')}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewIssue(issue.id, 'reject')}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {flaggedIssues.length === 0 && !loading && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No flagged issues</h3>
            <p className="mt-1 text-sm text-gray-500">
              All issues have been reviewed or there are no flagged issues at the moment.
            </p>
          </div>
        )}

        {/* Review Modal */}
        {selectedIssue && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Issue</h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2"><strong>Title:</strong> {selectedIssue.title}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Description:</strong> {selectedIssue.description}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Category:</strong> {selectedIssue.category}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>Flag Count:</strong> {selectedIssue.flag_count}</p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReviewIssue(selectedIssue.id, 'approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReviewIssue(selectedIssue.id, 'reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFlaggedIssues; 