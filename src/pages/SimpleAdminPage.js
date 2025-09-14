/**
 * 👑 SIMPLE ADMIN PAGE
 * 
 * MICRO-FEATURE: Simple admin interface for waitlist management
 * - No authentication required (URL-based access)
 * - View waitlist entries
 * - Export functionality
 * - Basic analytics
 */

import React, { useState, useEffect } from 'react';
import './SimpleAdminPage.style.css';

const SimpleAdminPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadEntries();
    loadStats();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/node/simple-waitlist/admin/entries');
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      } else {
        setError('Failed to load entries');
      }
    } catch (err) {
      console.error('Error loading entries:', err);
      setError('Network error loading entries');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/node/simple-waitlist/admin/stats');
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || {});
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/node/simple-waitlist/admin/export');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waitlist-entries-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setError('Failed to export entries');
      }
    } catch (err) {
      console.error('Error exporting entries:', err);
      setError('Network error during export');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const response = await fetch(`/api/node/simple-waitlist/admin/entries/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEntries(entries.filter(entry => entry._id !== id));
        loadStats(); // Refresh stats
      } else {
        setError('Failed to delete entry');
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Network error deleting entry');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredEntries = entries
    .filter(entry => 
      entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.company && entry.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  return (
    <div className="simple-admin-page">
      <div className="simple-admin-page__container">
        {/* Header */}
        <header className="simple-admin-page__header">
          <h1>AlynLing Admin</h1>
          <p>Waitlist Management Dashboard</p>
        </header>

        {error && (
          <div className="simple-admin-page__error">
            <span className="simple-admin-page__error-icon">⚠️</span>
            {error}
            <button 
              onClick={() => setError('')}
              className="simple-admin-page__error-close"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="simple-admin-page__stats">
          <div className="simple-admin-page__stat-card">
            <h3>Total Signups</h3>
            <div className="simple-admin-page__stat-number">{stats.total}</div>
          </div>
          <div className="simple-admin-page__stat-card">
            <h3>Today</h3>
            <div className="simple-admin-page__stat-number">{stats.today}</div>
          </div>
          <div className="simple-admin-page__stat-card">
            <h3>This Week</h3>
            <div className="simple-admin-page__stat-number">{stats.thisWeek}</div>
          </div>
          <div className="simple-admin-page__stat-card">
            <h3>This Month</h3>
            <div className="simple-admin-page__stat-number">{stats.thisMonth}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="simple-admin-page__controls">
          <div className="simple-admin-page__search">
            <input
              type="text"
              placeholder="Search by email, name, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="simple-admin-page__search-input"
            />
          </div>
          
          <div className="simple-admin-page__sort">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="simple-admin-page__sort-select"
            >
              <option value="submittedAt">Date Submitted</option>
              <option value="email">Email</option>
              <option value="name">Name</option>
              <option value="company">Company</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="simple-admin-page__sort-order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <button
            onClick={handleExport}
            className="simple-admin-page__export-btn"
          >
            Export CSV
          </button>

          <button
            onClick={loadEntries}
            className="simple-admin-page__refresh-btn"
          >
            Refresh
          </button>
        </div>

        {/* Entries Table */}
        <div className="simple-admin-page__table-container">
          {loading ? (
            <div className="simple-admin-page__loading">
              <div className="simple-admin-page__spinner"></div>
              Loading entries...
            </div>
          ) : (
            <table className="simple-admin-page__table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="simple-admin-page__no-data">
                      {searchTerm ? 'No entries match your search' : 'No entries yet'}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry._id}>
                      <td className="simple-admin-page__email">{entry.email}</td>
                      <td>{entry.name}</td>
                      <td>{entry.company || '-'}</td>
                      <td>{entry.role || '-'}</td>
                      <td className="simple-admin-page__date">
                        {formatDate(entry.submittedAt)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="simple-admin-page__delete-btn"
                          title="Delete entry"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <footer className="simple-admin-page__footer">
          <p>
            Showing {filteredEntries.length} of {entries.length} entries
          </p>
          <p>
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default SimpleAdminPage;





