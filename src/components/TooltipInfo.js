import React from 'react';
import { Info } from 'lucide-react';

const TooltipInfo = ({ title, content }) => {
  return (
    <span className="tooltip-info" tabIndex={0} aria-label={title}>
      <span className="tooltip-icon"><Info size={14} /></span>
      <span className="tooltip-panel" role="tooltip">
        {title && <div className="tooltip-title">{title}</div>}
        {content && <div className="tooltip-content">{content}</div>}
      </span>
    </span>
  );
};

export default TooltipInfo; 