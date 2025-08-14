import React from 'react';
import { 
  Home, 
  BarChart3, 
  Zap, 
  TrendingUp, 
  Link, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ activeMenuItem, setActiveMenuItem, expandedMenu, setExpandedMenu }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { 
      id: 'analyze', 
      label: 'Analyze', 
      icon: BarChart3, 
      hasDropdown: true,
      subItems: []
    },
    { 
      id: 'action', 
      label: 'Action', 
      icon: Zap, 
      hasDropdown: true,
      subItems: []
    },
    { 
      id: 'measure', 
      label: 'Measure', 
      icon: TrendingUp, 
      hasDropdown: true,
      subItems: [
        { id: 'attribution', label: 'Attribution' },
        { id: 'mmm', label: 'MMM' },
        { id: 'experiments', label: 'Experiments' },
        { id: 'causal-inference', label: 'Causal Inference' }
      ]
    },
    { 
      id: 'connect', 
      label: 'Connect', 
      icon: Link, 
      hasDropdown: true,
      subItems: [
        { id: 'integrations', label: 'Integrations' }
      ]
    },
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: BookOpen, 
      hasDropdown: true,
      subItems: [
        { id: 'blog', label: 'Blog' },
        { id: 'faqs', label: 'FAQs' }
      ]
    },
    { id: 'support', label: 'Support', icon: HelpCircle }
  ];

  const toggleMenu = (menuId) => {
    if (expandedMenu === menuId) {
      setExpandedMenu(null);
    } else {
      setExpandedMenu(menuId);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Alyn</h2>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div key={item.id} className="menu-item-container">
            <div 
              className={`menu-item ${activeMenuItem === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.hasDropdown) {
                  toggleMenu(item.id);
                } else {
                  setActiveMenuItem(item.id);
                }
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.hasDropdown && (
                expandedMenu === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />
              )}
            </div>
            
            {item.hasDropdown && item.subItems && expandedMenu === item.id && (
              <div className="sub-menu">
                {item.subItems.map((subItem) => (
                  <div 
                    key={subItem.id}
                    className={`sub-menu-item ${activeMenuItem === subItem.id ? 'active' : ''}`}
                    onClick={() => setActiveMenuItem(subItem.id)}
                  >
                    {subItem.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 