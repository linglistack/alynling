import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Minimize2, Maximize2, AlertCircle } from 'lucide-react';
import DynamicHypothesis from './DynamicHypothesis';
import { ragAPI, RAGAPIError } from '../utils/ragAPI';
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
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ragError, setRagError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  // Test RAG connectivity on component mount
  useEffect(() => {
    const testRAGConnection = async () => {
      try {
        await ragAPI.healthCheck();
        setRagEnabled(true);
        setRagError(null);
      } catch (error) {
        console.warn('RAG API not available, using fallback mode:', error.message);
        setRagEnabled(false);
        setRagError('AI knowledge base not available');
      }
    };

    testRAGConnection();
  }, []);

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
    // { text: "Create Experiment", action: "create_experiment" },
    // { text: "Analyze Data", action: "analyze_data" },
    // { text: "View MMM", action: "view_mmm" },
    // { text: "Help Docs", action: "help_docs" }
  ];

  const ragQuickActions = [
    { text: "What is holdout?", query: "What is holdout and how should I set it?" },
    { text: "Explain effect size", query: "What is effect size and how does it affect power analysis?" },
    { text: "Market selection tips", query: "How should I select test and control markets for GeoLift?" },
    { text: "Power analysis guide", query: "What is power analysis and what parameters should I consider?" }
  ];

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputMessage;
    setInputMessage('');
    setIsTyping(true);
    setRagError(null);

    try {
      // Use RAG AI for all queries if enabled
      if (ragEnabled) {
        const response = await ragAPI.askQuestion(currentQuery);
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.answer,
          timestamp: new Date(),
          source: 'rag'
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Only use mock responses if RAG is completely unavailable
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)],
          timestamp: new Date(),
          source: 'mock'
        };
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('RAG API Error:', error);
      setRagError(error.message);
      
      // Fallback to mock response on error
      const fallbackResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm having trouble accessing my knowledge base right now. Let me try to help with a general response: " + 
                mockBotResponses[Math.floor(Math.random() * mockBotResponses.length)],
        timestamp: new Date(),
        source: 'fallback',
        error: true
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = async (action) => {
    const actionText = quickActions.find(a => a.action === action)?.text || action;
    
    // Convert quick action to a RAG query
    const actionQueries = {
      create_experiment: "How do I create a new GeoLift experiment? What steps should I follow?",
      analyze_data: "How do I analyze my data with GeoLift? What data format is required?",
      view_mmm: "What is MMM analysis and how does it work?",
      help_docs: "What features and capabilities are available in GeoLift?"
    };

    const query = actionQueries[action] || actionText;
    
    // Use the same logic as handleSendMessage but for quick actions
    const actionMessage = {
      id: Date.now(),
      type: 'user',
      content: actionText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, actionMessage]);
    setIsTyping(true);
    setRagError(null);

    try {
      // Use RAG AI for all quick actions if enabled
      if (ragEnabled) {
        const response = await ragAPI.askQuestion(query);
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.answer,
          timestamp: new Date(),
          source: 'rag'
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Fallback only if RAG is completely unavailable
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
          timestamp: new Date(),
          source: 'mock'
        };
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      console.error('RAG API Error in quick action:', error);
      setRagError(error.message);
      
      // Fallback on error
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
        timestamp: new Date(),
        source: 'fallback'
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRagQuickAction = async (query) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setRagError(null);

    try {
      if (ragEnabled) {
        const response = await ragAPI.askQuestion(query);
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.answer,
          timestamp: new Date(),
          source: 'rag'
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        throw new Error('RAG not available');
      }
    } catch (error) {
      console.error('RAG Quick Action Error:', error);
      setRagError(error.message);
      
      const fallbackResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: "I'm having trouble accessing my knowledge base for that question. Please try asking in a different way or check if the AI service is running.",
        timestamp: new Date(),
        source: 'fallback',
        error: true
      };
      
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleHypothesisClick = (hypothesis) => {
    // User selected a hypothesis, add as user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: `I want to test this hypothesis: "${hypothesis}"`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Bot response
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: `Great choice! Based on the hypothesis "${hypothesis}", I suggest you:\n\n1. Determine test market and control market\n2. Set minimum detectable effect\n3. Determine test duration\n4. Configure experiment parameters\n\nWhich step would you like to start with? I can help you create this experiment.`,
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
      {/* Right side handle (always present, for open/close) */}
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

      {/* Chat window */}
      {isOpen && (
        <div className={`chat-container ${isMinimized ? 'minimized' : ''}`}>
          {/* Chat header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="bot-avatar">
                <Bot size={20} />
              </div>
              <div className="chat-title">
                <h3>Alyn AI Assistant</h3>
                <span className={`chat-status ${ragEnabled ? 'rag-enabled' : 'rag-disabled'}`}>
                  {ragEnabled ? '🧠 AI Knowledge Active' : '💬 General Mode'}
                  {ragError && (
                    <span className="rag-error" title={ragError}>
                      <AlertCircle size={12} />
                    </span>
                  )}
                </span>
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

          {/* Chat content */}
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
                          <div className="message-footer">
                            <div className="message-time">
                              {formatTime(message.timestamp)}
                            </div>
                            {message.source && (
                              <div className={`message-source ${message.source}`}>
                                {message.source === 'rag' && '🧠 AI Knowledge'}
                                {message.source === 'mock' && '💬 General'}
                                {message.source === 'fallback' && '⚠️ Fallback'}
                                {message.error && <AlertCircle size={12} />}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
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

              {/* Quick actions */}
              <div className="quick-actions">
                <div className="quick-actions-section">
                  <div className="quick-actions-grid">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        className="quick-action-btn general"
                        onClick={() => handleQuickAction(action.action)}
                      >
                        {action.text}
                      </button>
                    ))}
                  </div>
                </div>
                
                {ragEnabled && (
                  <div className="quick-actions-section">
                    <h4>GeoLift Questions</h4>
                    <div className="quick-actions-grid">
                      {ragQuickActions.map((action, index) => (
                        <button
                          key={index}
                          className="quick-action-btn rag"
                          onClick={() => handleRagQuickAction(action.query)}
                        >
                          {action.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
