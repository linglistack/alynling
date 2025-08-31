import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Minimize2, Maximize2 } from 'lucide-react';
import DynamicHypothesis from './DynamicHypothesis';
import './ChatBot.css';

const ChatBot = ({ onChatToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'hypothesis',
      content: "Here's an example of dynamic test hypotheses to inspire your experiments:",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const mockBotResponses = [
    "I can help you create a new experiment. What type would you like to set up?",
    "Let me help analyze your data. You can upload a CSV and I'll guide you through the steps.",
    "For GeoLift, I recommend first choosing test and control markets. Want the details?",
    "MMM analysis works best with 2–3 years of historical data. Is your data ready?",
    "Incrementality testing reveals true channel lift. Which channel do you want to evaluate?",
    "I can navigate you to a feature. Would you like to:\n1. Create Experiment\n2. Analyze Data\n3. View MMM\n4. Integrations",
    "Based on your question, I suggest reading a related blog article. Want me to open it?",
    "Great question! Here are some concrete steps you can follow..."
  ];

  const quickActions = [
    { text: "Create Experiment", action: "create_experiment" },
    { text: "Analyze Data", action: "analyze_data" },
    { text: "View MMM", action: "view_mmm" },
    { text: "Help Docs", action: "help_docs" }
  ];

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;

    const newMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulated AI reply
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // 1-3秒延迟
  };

  const handleQuickAction = (action) => {
    const actionMessage = {
      id: Date.now(),
      type: 'user',
      content: quickActions.find(a => a.action === action)?.text || action,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, actionMessage]);
    setIsTyping(true);

    // Simulated intent-specific reply
    setTimeout(() => {
      let response = '';
      switch (action) {
        case 'create_experiment':
          response = 'Great! I can help you create an experiment. Please share:\n1) Your hypothesis\n2) The primary KPI\n3) Expected test duration';
          break;
        case 'analyze_data':
          response = 'I can help analyze your data. You can:\n1) Upload a CSV\n2) Connect an existing source\n3) Review historical results\n\nShall I take you to the upload page?';
          break;
        case 'view_mmm':
          response = 'MMM helps you understand true channel contribution. Do you want to:\n1) Create a new MMM model\n2) View existing results\n3) Learn MMM basics';
          break;
        case 'help_docs':
          response = 'I can share docs for:\n1) GeoLift Guide\n2) Incrementality Best Practices\n3) Data Format Requirements\n4) FAQs\n\nWhich one would you like?';
          break;
        default:
          response = mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)];
      }

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleHypothesisClick = (hypothesis) => {
    // 用户选择了一个假设，添加为用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: `我想测试这个假设: "${hypothesis}"`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // 机器人回应
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: `很好的选择！基于假设 "${hypothesis}"，我建议您：\n\n1. 确定测试市场和控制市场\n2. 设置最小可检测效应\n3. 确定测试持续时间\n4. 配置实验参数\n\n您想从哪一步开始？我可以帮您创建这个实验。`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* 右侧拉手（始终存在，用于打开/关闭） */}
      <button 
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          onChatToggle?.(next);
        }}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        <MessageCircle size={20} />
        <span className="chat-badge">COPILOT</span>
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className={`chat-container ${isMinimized ? 'minimized' : ''}`}>
          {/* 聊天头部 */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="bot-avatar">
                <Bot size={20} />
              </div>
              <div className="chat-title">
                <h3>Alyn AI助手</h3>
                <span className="chat-status">在线</span>
              </div>
            </div>
            <div className="chat-controls">
              <button 
                className="control-btn"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button 
                className="control-btn"
                onClick={() => {
                  setIsOpen(false);
                  onChatToggle?.(false);
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 聊天内容 */}
          {!isMinimized && (
            <>
              <div className="chat-messages">
                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.type}`}>
                    <div className="message-avatar">
                      {message.type === 'user' ? (
                        <User size={16} />
                      ) : (
                        <Bot size={16} />
                      )}
                    </div>
                    <div className="message-content">
                      {message.type === 'hypothesis' ? (
                        <div className="hypothesis-message">
                          <div className="message-text">
                            <p>{message.content}</p>
                          </div>
                          <div className="dynamic-hypothesis-container">
                            <DynamicHypothesis onHypothesisClick={handleHypothesisClick} />
                          </div>
                          <div className="message-time">
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="message-text">
                            {message.content.split('\n').map((line, index) => (
                              <p key={index}>{line}</p>
                            ))}
                          </div>
                          <div className="message-time">
                            {formatTime(message.timestamp)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* 打字指示器 */}
                {isTyping && (
                  <div className="message bot">
                    <div className="message-avatar">
                      <Bot size={16} />
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* 快捷操作 */}
              <div className="quick-actions">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="quick-action-btn"
                    onClick={() => handleQuickAction(action.action)}
                  >
                    {action.text}
                  </button>
                ))}
              </div>

              {/* 输入区域 */}
              <div className="chat-input-container">
                <div className="chat-input-wrapper">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your question..."
                    className="chat-input"
                    rows={1}
                  />
                  <button 
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={inputMessage.trim() === ''}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="input-hint">Press Enter to send, Shift + Enter for newline</div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatBot;
