import React, { useState } from 'react';
import { Plus, BookOpen, Star, ChevronLeft, ChevronRight, RotateCcw, Trash2 } from 'lucide-react';
import './MMM.css';

const MMM = ({ onCreateModel, onModelClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const models = [
    {
      id: 1,
      name: 'demo_calib',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '77.71%',
      confidenceLevelType: 'Medium',
      createdOn: 'Feb 20, 2024',
      lastRefreshedOn: 'Mar 04, 2024'
    },
    {
      id: 2,
      name: 'demo_kai',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '78.76%',
      confidenceLevelType: 'Medium',
      createdOn: 'Feb 20, 2024',
      lastRefreshedOn: 'Feb 20, 2024'
    },
    {
      id: 3,
      name: 'revenu_v2_calibration',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '84.39%',
      confidenceLevelType: 'High',
      createdOn: 'Feb 15, 2024',
      lastRefreshedOn: 'Feb 16, 2024'
    },
    {
      id: 4,
      name: 'revenue_2_cal_2',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '85.96%',
      confidenceLevelType: 'High',
      createdOn: 'Feb 09, 2024',
      lastRefreshedOn: 'Feb 09, 2024'
    },
    {
      id: 5,
      name: 'rev_test',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '91.58%',
      confidenceLevelType: 'Very High',
      createdOn: 'Feb 05, 2024',
      lastRefreshedOn: 'Feb 05, 2024'
    },
    {
      id: 6,
      name: 'Test_MMM_25thJan',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '85.20%',
      confidenceLevelType: 'High',
      createdOn: 'Jan 25, 2024',
      lastRefreshedOn: 'Feb 05, 2024'
    },
    {
      id: 7,
      name: 'mmm_orders',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Orders',
      confidenceLevel: '80.54%',
      confidenceLevelType: 'High',
      createdOn: 'Jan 23, 2024',
      lastRefreshedOn: 'Jan 23, 2024'
    },
    {
      id: 8,
      name: 'revenue_v2',
      status: 'Success',
      inputType: 'Upload',
      outcomeKPI: 'Revenue',
      confidenceLevel: '99.04%',
      confidenceLevelType: 'Very High',
      createdOn: 'Jan 23, 2024',
      lastRefreshedOn: 'Feb 28, 2024'
    }
  ];

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'inputType', label: 'Input Type' },
    { key: 'outcomeKPI', label: 'Outcome/KPI' },
    { key: 'confidenceLevel', label: 'Confidence Level' },
    { key: 'createdOn', label: 'Created On' },
    { key: 'lastRefreshedOn', label: 'Last Refreshed On' },
    { key: 'actions', label: '' }
  ];

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'Success':
        return <span className="status-indicator success">Success</span>;
      default:
        return <span className="status-indicator">{status}</span>;
    }
  };

  const getConfidenceLevelIndicator = (level, type) => {
    const getTypeClass = (type) => {
      switch (type) {
        case 'Medium':
          return 'confidence-medium';
        case 'High':
          return 'confidence-high';
        case 'Very High':
          return 'confidence-very-high';
        default:
          return 'confidence-medium';
      }
    };

    return (
      <div className="confidence-level">
        <span className="confidence-percentage">{level}</span>
        <span className={`confidence-type ${getTypeClass(type)}`}>{type}</span>
      </div>
    );
  };

  const totalPages = Math.ceil(models.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentModels = models.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="mmm-page">
      <div className="mmm-header">
        <div className="header-left">
          <h1>Marketing Mix Models</h1>
          <p>Analyze your historical data to evaluate and optimize the effectiveness of different marketing channels.</p>
          <a href="#" className="guide-link">
            <BookOpen size={16} />
            View the guide
          </a>
        </div>
        <div className="header-buttons">
          <button className="create-model-button" onClick={onCreateModel}>
            <Plus size={16} />
            Create Model
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="mmm-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentModels.map((model) => (
              <tr 
                key={model.id} 
                className="model-row"
                onClick={() => onModelClick && onModelClick(model)}
              >
                <td>
                  <div className="model-name">
                    {model.name}
                  </div>
                </td>
                <td>{getStatusIndicator(model.status)}</td>
                <td>
                  <span className={`input-type ${model.inputType.toLowerCase()}`}>
                    {model.inputType}
                  </span>
                </td>
                <td>{model.outcomeKPI}</td>
                <td>{getConfidenceLevelIndicator(model.confidenceLevel, model.confidenceLevelType)}</td>
                <td>{model.createdOn}</td>
                <td>{model.lastRefreshedOn}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-button refresh-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Refresh model:', model.name);
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button 
                      className="action-button delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Delete model:', model.name);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
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
        
        <div className="pagination-info">
          <span className="page-number">{currentPage}</span>
          <span className="pagination-separator">|</span>
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
        
        <button 
          className="pagination-button"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default MMM; 