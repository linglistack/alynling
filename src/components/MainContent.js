import React, { useState } from 'react';
import { Plus, BookOpen, CheckCircle, Trash2, ChevronLeft, ChevronRight, BarChart3, Calendar } from 'lucide-react';
import './MainContent.css';

const MainContent = ({ onCreateExperiment, onAnalyzeExperiment, onExperimentClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState('01 Jan 23 - 01 Jan 24');

  const experiments = [
    {
      id: 1,
      name: 'Test 1',
      type: 'Geo',
      outcome: 'Number of Orders',
      lastProcessed: 'Today',
      startDate: 'Sep 8, 2023',
      endDate: 'Sep 8, 2023',
      status: 'Finding Markets',
      statusType: 'warning'
    },
    {
      id: 2,
      name: 'Test 2',
      type: 'Split',
      outcome: 'Purchase',
      lastProcessed: 'Yesterday',
      startDate: 'Sep 8, 2023',
      endDate: 'Sep 8, 2023',
      status: 'Running',
      statusType: 'info'
    },
    {
      id: 3,
      name: 'Test 3',
      type: 'Geo',
      outcome: 'Revenue',
      lastProcessed: '1 week ago',
      startDate: 'Sep 8, 2023',
      endDate: 'Sep 8, 2023',
      status: 'Finding Markets',
      statusType: 'warning'
    },
    {
      id: 4,
      name: 'Test 4',
      type: 'Spend',
      outcome: 'Revenue',
      lastProcessed: '3 weeks ago',
      startDate: 'Sep 8, 2023',
      endDate: 'Sep 8, 2023',
      status: 'Awaiting data',
      statusType: 'pending'
    },
    {
      id: 5,
      name: 'Test 5',
      type: 'Split',
      outcome: 'Purchase',
      lastProcessed: '1 month ago',
      startDate: 'Sep 8, 2023',
      endDate: 'Sep 8, 2023',
      status: 'Markets Ready',
      statusType: 'success'
    },
    {
      id: 6,
      name: 'Test 6',
      type: 'Split',
      outcome: 'Purchase',
      lastProcessed: '1 month ago',
      startDate: 'Sep 8, 2023',
      endDate: 'Sep 8, 2023',
      status: 'Completed',
      statusType: 'completed'
    }
  ];

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'outcome', label: 'Outcome/KPI' },
    { key: 'lastProcessed', label: 'Last Processed' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'status', label: 'Status' }
  ];

  const getTypeIndicator = (type) => {
    const getTypeClass = (type) => {
      switch (type) {
        case 'Geo':
          return 'type-geo';
        case 'Split':
          return 'type-split';
        case 'Spend':
          return 'type-spend';
        default:
          return 'type-default';
      }
    };

    return <span className={`type-indicator ${getTypeClass(type)}`}>{type}</span>;
  };

  const getStatusIndicator = (status, statusType) => {
    const getStatusClass = (statusType) => {
      switch (statusType) {
        case 'warning':
          return 'status-warning';
        case 'info':
          return 'status-info';
        case 'pending':
          return 'status-pending';
        case 'success':
          return 'status-success';
        case 'completed':
          return 'status-completed';
        default:
          return 'status-default';
      }
    };

    return <span className={`status-indicator ${getStatusClass(statusType)}`}>{status}</span>;
  };

  // Timeline chart component
  const TimelineChart = () => {
    const months = [
      'Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023',
      'Jul 2023', 'Aug 2023', 'Sep 2023', 'Oct 2023', 'Nov 2023', 'Dec 2023'
    ];

    const timelineExperiments = [
      { name: 'Calibrate Google TDF with Geo Experiments to imp...', month: 2, duration: 1, color: '#d1fae5' },
      { name: 'Calibrate Google TDF', month: 5, duration: 1, color: '#d1fae5' },
      { name: 'Calibrate Google TDF', month: 10, duration: 1, color: '#d1fae5' },
      { name: 'Calibrate Google TDF...', month: 2, duration: 1, color: '#fef3c7', top: 40 },
      { name: 'Calibrate Google TDF', month: 6, duration: 1, color: '#fef3c7', top: 40 },
      { name: 'Calibrate Google TDF...', month: 10, duration: 1, color: '#fef3c7', top: 40 }
    ];

    return (
      <div className="timeline-chart">
        <div className="timeline-header">
          {months.map((month, index) => (
            <div key={index} className="timeline-month">
              <span className="month-label">{month}</span>
            </div>
          ))}
        </div>
        <div className="timeline-content">
          {timelineExperiments.map((exp, index) => (
            <div
              key={index}
              className="timeline-experiment"
              style={{
                left: `${(exp.month / 12) * 100}%`,
                width: `${(exp.duration / 12) * 100}%`,
                backgroundColor: exp.color,
                top: exp.top || 10
              }}
            >
              <span className="experiment-label">{exp.name}</span>
            </div>
          ))}
          <div className="today-indicator">
            <div className="today-line"></div>
            <span className="today-label">Today</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="main-content">
      <div className="content-header">
        <div className="header-left">
          <h1>Experiments</h1>
        </div>
        <div className="header-buttons">
          <button className="create-button" onClick={onCreateExperiment}>
            <Plus size={16} />
            Create Experiment
          </button>
          <button className="analyze-button" onClick={onAnalyzeExperiment}>
            <BarChart3 size={16} />
            Analyze Experiment
          </button>
        </div>
      </div>

      <div className="date-range-section">
        <div className="date-range-label">Date Range</div>
        <div className="date-range-input">
          <Calendar size={16} />
          <input 
            type="text" 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            readOnly
          />
        </div>
      </div>

      <TimelineChart />

      <div className="table-container">
        <table className="experiments-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.label}
                  {column.key === 'lastProcessed' && (
                    <Trash2 size={14} className="header-icon" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {experiments.map((experiment) => (
              <tr 
                key={experiment.id} 
                className="experiment-row"
                onClick={() => onExperimentClick && onExperimentClick(experiment)}
              >
                <td>
                  <div className="experiment-name">
                    <span className="name-text">{experiment.name}</span>
                    {getTypeIndicator(experiment.type)}
                  </div>
                </td>
                <td>{experiment.outcome}</td>
                <td>{experiment.lastProcessed}</td>
                <td>{experiment.startDate}</td>
                <td>{experiment.endDate}</td>
                <td>{getStatusIndicator(experiment.status, experiment.statusType)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button 
          className="pagination-button" 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        
        <div className="page-numbers">
          <button 
            className={`page-number ${currentPage === 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>
          <button 
            className={`page-number ${currentPage === 2 ? 'active' : ''}`}
            onClick={() => setCurrentPage(2)}
          >
            2
          </button>
        </div>
        
        <button 
          className="pagination-button"
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
          <ChevronRight size={16} />
        </button>
        
        <select 
          value={itemsPerPage} 
          onChange={(e) => setItemsPerPage(Number(e.target.value))}
          className="items-per-page"
        >
          <option value={10}>10/page</option>
          <option value={20}>20/page</option>
          <option value={50}>50/page</option>
        </select>
      </div>
    </div>
  );
};

export default MainContent; 