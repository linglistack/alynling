import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Minimize2, Maximize2 } from 'lucide-react';
import './ChatBot.css';

const ChatBot = ({ onChatToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: '你好！我是Alyn AI助手。我可以帮你导航网站功能、解答实验相关问题，或协助你分析数据。你想了解什么？',
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
    "我可以帮你创建新的实验。你想设置什么类型的实验？",
    "让我帮你分析实验数据。你可以上传CSV文件，我会引导你完成数据分析流程。",
    "关于GeoLift实验，我建议首先确定测试市场和控制市场。需要我详细解释吗？",
    "MMM（营销组合模型）分析需要至少2-3年的历史数据。你的数据准备好了吗？",
    "增量测试可以帮你了解真实的广告效果。你想了解哪个渠道的增量效果？",
    "我可以帮你导航到相应的功能页面。你想要：\n1. 创建实验\n2. 分析数据\n3. 查看MMM模型\n4. 集成数据源",
    "基于你的问题，我建议查看我们的博客文章了解更多详情。要我为你打开相关文章吗？",
    "这是一个很好的问题！让我为你提供一些具体的操作步骤..."
  ];

  const quickActions = [
    { text: "创建新实验", action: "create_experiment" },
    { text: "分析数据", action: "analyze_data" },
    { text: "查看MMM", action: "view_mmm" },
    { text: "帮助文档", action: "help_docs" }
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

    // 模拟AI回复
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

    // 模拟针对性回复
    setTimeout(() => {
      let response = '';
      switch (action) {
        case 'create_experiment':
          response = '好的！我来帮你创建新实验。请告诉我：\n1. 你想测试什么假设？\n2. 目标指标是什么？\n3. 预计实验周期多长？';
          break;
        case 'analyze_data':
          response = '我来帮你分析数据！你可以：\n1. 上传CSV文件进行分析\n2. 连接现有数据源\n3. 查看历史实验结果\n\n需要我引导你到数据上传页面吗？';
          break;
        case 'view_mmm':
          response = 'MMM模型可以帮你了解各渠道的真实贡献。你想：\n1. 创建新的MMM模型\n2. 查看现有模型结果\n3. 了解MMM基础知识';
          break;
        case 'help_docs':
          response = '我可以为你提供以下帮助文档：\n1. GeoLift实验指南\n2. 增量测试最佳实践\n3. 数据格式要求\n4. 常见问题解答\n\n你想了解哪个方面？';
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

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('zh-CN', { 
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
                      <div className="message-text">
                        {message.content.split('\n').map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                      <div className="message-time">
                        {formatTime(message.timestamp)}
                      </div>
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
                    placeholder="输入你的问题..."
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
                <div className="input-hint">
                  按 Enter 发送，Shift + Enter 换行
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatBot;
