import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Sparkles,
  Settings,
  Type,
  Square,
  Maximize
} from 'lucide-react';
import './VideoPlayer.css';

const VideoPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(29);
  const [totalTime] = useState(134); // 2:14 in seconds
  const [showCC, setShowCC] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  
  const progressRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSkipForward = () => {
    setCurrentTime(Math.min(currentTime + 10, totalTime));
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = Math.floor(percentage * totalTime);
      setCurrentTime(newTime);
    }
  };

  const handleSparklesToggle = () => {
    setShowSparkles(!showSparkles);
  };

  const handleCCToggle = () => {
    setShowCC(!showCC);
  };

  const handlePipToggle = () => {
    setIsPip(!isPip);
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Simulate video progress
  useEffect(() => {
    let interval;
    if (isPlaying && currentTime < totalTime) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalTime) {
            setIsPlaying(false);
            return totalTime;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, totalTime]);

  const progressPercentage = (currentTime / totalTime) * 100;

  return (
    <div className="video-player">
      <div className="video-progress" ref={progressRef} onClick={handleProgressClick}>
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      <div className="video-controls">
        <div className="controls-left">
          <button className="control-button" onClick={handlePlayPause}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          
          <button className="control-button" onClick={handleSkipForward}>
            <SkipForward size={16} />
          </button>
          
          <button className="control-button" onClick={handleMuteToggle}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(totalTime)}
          </div>
        </div>
        
        <div className="video-title">
          设置您的地理实验 {'>'}
        </div>
        
        <div className="controls-right">
          <button 
            className={`control-button ${showSparkles ? 'active' : ''}`} 
            onClick={handleSparklesToggle}
          >
            <Sparkles size={16} />
          </button>
          
          <div className="toggle-switch">
            <input type="checkbox" id="toggle" />
            <label htmlFor="toggle"></label>
          </div>
          
          <button className="control-button">
            <Play size={16} />
          </button>
          
          <button 
            className={`control-button ${showCC ? 'active' : ''}`} 
            onClick={handleCCToggle}
          >
            <Type size={16} />
          </button>
          
          <button className="control-button">
            <Settings size={16} />
          </button>
          
          <button 
            className={`control-button ${isPip ? 'active' : ''}`} 
            onClick={handlePipToggle}
          >
            <Square size={16} />
          </button>
          
          <button 
            className={`control-button ${isFullscreen ? 'active' : ''}`} 
            onClick={handleFullscreenToggle}
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer; 