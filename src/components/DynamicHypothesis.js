import React, { useState, useEffect, useMemo } from 'react';
import './DynamicHypothesis.css';

const DynamicHypothesis = ({ onHypothesisClick }) => {
  const platforms = useMemo(() => [
    'TikTok',
    'Pinterest', 
    'Snapchat',
    'Google',
    'YouTube',
    'Meta',
    "awareness campaigns",
    "brand search",
    "optimization for page-view",
    "optimization for add-to-cart",
    "optimization for purchase",
    "educational creative",
    "UGC creative"
  ], []);

  const metrics = useMemo(() => [
    'revenue',
    'DTC orders',
    'Amazon orders', 
    'efficiency'
  ], []);

  const [currentPlatformIndex, setCurrentPlatformIndex] = useState(0);
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const getPlatformClass = (platform) => {
    return platform.toLowerCase().replace(/\s+/g, '');
  };

  // 移除宽度计算，因为现在整个句子一起动画

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      
      setTimeout(() => {
        setCurrentPlatformIndex((prev) => (prev + 1) % platforms.length);
        setCurrentMetricIndex((prev) => (prev + 1) % metrics.length);
        setIsVisible(true);
      }, 400); // 淡出时间匹配CSS动画
      
    }, 3000); // 每3秒切换一次

    return () => {
      clearInterval(interval);
    };
  }, [platforms, metrics]);

  const handleClick = () => {
    const currentHypothesis = `Does ${platforms[currentPlatformIndex]} bring incremental ${metrics[currentMetricIndex]}?`;
    // 触发父组件的回调，传递当前假设
    if (onHypothesisClick) {
      onHypothesisClick(currentHypothesis);
    }
  };

  return (
    <div className="dynamic-hypothesis" onClick={handleClick}>
      <div className="hypothesis-text">
        <span className="full-sentence">
          Does{' '}
          <span className={`animated-text platform ${getPlatformClass(platforms[currentPlatformIndex])} ${isVisible ? 'visible' : 'hidden'}`}>
            {platforms[currentPlatformIndex]}
          </span>
          {' '}bring incremental{' '}
          <span className={`animated-text metric ${isVisible ? 'visible' : 'hidden'}`}>
            {metrics[currentMetricIndex]}
          </span>
          ?
        </span>
      </div>
      
      <div className="hypothesis-actions">
        <button className="use-hypothesis-btn" onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}>
          ✨ Test This
        </button>
      </div>
    </div>
  );
};

export default DynamicHypothesis;
