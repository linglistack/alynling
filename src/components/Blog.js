import React, { useState } from 'react';
import { ArrowLeft, Calendar, User, Tag, BarChart3, MapPin, Infinity, CheckCircle, XCircle } from 'lucide-react';
import './Blog.css';

const Blog = ({ onBack }) => {

  
  const openBlogInNewTab = (post) => {
    // 创建一个新的窗口来显示博客内容
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${post.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              background: #f8fafc;
              margin: 0;
              padding: 0;
            }
            .blog-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              min-height: 100vh;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .blog-header {
              background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .blog-title {
              font-size: 32px;
              font-weight: 700;
              margin: 0 0 10px 0;
              line-height: 1.2;
            }
            .blog-subtitle {
              font-size: 18px;
              opacity: 0.9;
              margin: 0 0 20px 0;
            }
            .blog-meta {
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;
            }
            .meta-item {
              background: rgba(255,255,255,0.2);
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
            }
            .blog-content {
              padding: 40px 30px;
            }
            .blog-article h2 {
              font-size: 28px;
              font-weight: 700;
              color: #1a1a1a;
              margin: 30px 0 20px 0;
              border-bottom: 3px solid #4f46e5;
              padding-bottom: 10px;
            }
            .blog-article h3 {
              font-size: 24px;
              font-weight: 600;
              color: #374151;
              margin: 25px 0 15px 0;
            }
            .blog-article h4 {
              font-size: 20px;
              font-weight: 600;
              color: #4b5563;
              margin: 20px 0 10px 0;
            }
            .blog-article p {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.7;
              margin: 0 0 16px 0;
            }
            .blog-article ul, .blog-article ol {
              margin: 16px 0;
              padding-left: 24px;
            }
            .blog-article li {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.6;
              margin: 8px 0;
            }
            .blog-article strong {
              color: #1a1a1a;
              font-weight: 600;
            }
            .close-btn {
              position: fixed;
              top: 20px;
              right: 20px;
              background: rgba(0,0,0,0.7);
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
              z-index: 1000;
            }
            .close-btn:hover {
              background: rgba(0,0,0,0.9);
            }
            @media (max-width: 768px) {
              .blog-container {
                margin: 0;
                box-shadow: none;
              }
              .blog-header {
                padding: 30px 20px;
              }
              .blog-title {
                font-size: 24px;
              }
              .blog-content {
                padding: 30px 20px;
              }
            }
          </style>
        </head>
        <body>
          <button class="close-btn" onclick="window.close()">✕ Close</button>
          <div class="blog-container">
            <div class="blog-header">
              <h1 class="blog-title">${post.title}</h1>
              ${post.subtitle ? `<p class="blog-subtitle">${post.subtitle}</p>` : ''}
              <div class="blog-meta">
                <span class="meta-item">${post.category}</span>
                <span class="meta-item">${post.date}</span>
                <span class="meta-item">${post.readTime}</span>
                <span class="meta-item">By ${post.author}</span>
              </div>
            </div>
            <div class="blog-content">
              ${post.content}
            </div>
          </div>
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  };
  
  const blogPosts = [
    {
      id: 1,
      title: 'Is Meta Incremental?',
      subtitle: '',
      category: 'Education',
      date: 'Aug 13, 2025',
      excerpt: 'We analyzed 640 Meta experiments on the Haus platform, revealing key insights into Meta\'s incrementality.',
      author: 'Data Science Team',
      tags: ['Meta', 'Incrementality', 'Experiments'],
      readTime: '8 min read',
      visualType: 'bars',
      visualColor: 'blue',
      content: `
        <div class="blog-article">
          <h2>Meta Incrementality Analysis</h2>
          <p>Our comprehensive analysis of 640 Meta experiments on the Haus platform reveals critical insights into Meta's incrementality performance across different campaign types and industries.</p>
          
          <h3>Key Findings</h3>
          <ul>
            <li><strong>Overall Incrementality:</strong> Meta shows positive incrementality in 78% of experiments</li>
            <li><strong>Campaign Type Impact:</strong> Brand awareness campaigns show higher incrementality than performance campaigns</li>
            <li><strong>Industry Variations:</strong> E-commerce and SaaS show different incrementality patterns</li>
            <li><strong>Budget Scale Effects:</strong> Larger budgets don't necessarily correlate with higher incrementality</li>
          </ul>
          
          <h3>Methodology</h3>
          <p>We used advanced causal inference methods including:</p>
          <ul>
            <li>Geographic lift testing</li>
            <li>Holdout group analysis</li>
            <li>Time-series decomposition</li>
            <li>Statistical significance testing</li>
          </ul>
          
          <h3>Implications for Marketers</h3>
          <p>These findings suggest that Meta advertising can be highly effective when properly measured and optimized. The key is understanding which campaign types and targeting strategies drive true incremental value.</p>
        </div>
      `
    },
    {
      id: 2,
      title: 'Geo Experiments: The Fundamentals',
      subtitle: '',
      category: 'Education',
      date: 'Aug 7, 2025',
      excerpt: 'Explore geo experiments from all angles — what they are, why they matter, and how you can use them to measure incremental impact.',
      author: 'Experimentation Team',
      tags: ['Geo Experiments', 'Incrementality', 'Fundamentals'],
      readTime: '10 min read',
      visualType: 'bars',
      visualColor: 'gray',
      content: `
        <div class="blog-article">
          <h2>Understanding Geographic Experiments</h2>
          <p>Geographic experiments are a powerful tool for measuring the true incremental impact of marketing campaigns by comparing treated regions with carefully selected control groups.</p>
          
          <h3>What Are Geo Experiments?</h3>
          <p>Geographic experiments divide markets into treatment and control groups based on geographic boundaries, allowing marketers to measure causal effects without cross-contamination.</p>
          
          <h3>Why They Matter</h3>
          <ul>
            <li>Eliminate cross-contamination between test and control groups</li>
            <li>Provide more accurate causal inference</li>
            <li>Suitable for large-scale marketing campaigns</li>
            <li>Handle time-varying effects effectively</li>
          </ul>
          
          <h3>Implementation Steps</h3>
          <ol>
            <li>Define treatment and control regions</li>
            <li>Collect pre-treatment data</li>
            <li>Run market selection analysis</li>
            <li>Execute the experiment</li>
            <li>Analyze results using causal inference methods</li>
          </ol>
        </div>
      `
    },
    {
      id: 3,
      title: 'GeoFences',
      subtitle: 'Precise Geographic Control for Marketing Experiments',
      category: 'From the Lab',
      date: 'Aug 6, 2025',
      excerpt: 'GeoFences enable you to exclude markets from your test that aren\'t relevant to your business — helping you focus more deeply on the ones that are.',
      author: 'Product Team',
      tags: ['GeoFences', 'Geographic Control', 'Experiments'],
      readTime: '6 min read',
      visualType: 'location',
      visualColor: 'dark-blue',
      content: `
        <div class="blog-article">
          <h2>Introducing GeoFences</h2>
          <p>GeoFences represent a breakthrough in geographic experiment design, allowing marketers to create precise boundaries for their test and control groups.</p>
          
          <h3>What Are GeoFences?</h3>
          <p>GeoFences are customizable geographic boundaries that enable precise control over which markets participate in experiments. They can be defined using various criteria including:</p>
          <ul>
            <li>Political boundaries (cities, states, countries)</li>
            <li>Custom radius around specific points</li>
            <li>Market characteristics and demographics</li>
            <li>Business relevance scores</li>
          </ul>
          
          <h3>Benefits</h3>
          <ul>
            <li>Exclude irrelevant markets from experiments</li>
            <li>Focus resources on high-value regions</li>
            <li>Improve experiment precision and power</li>
            <li>Reduce noise in control group selection</li>
          </ul>
          
          <h3>Use Cases</h3>
          <p>GeoFences are particularly valuable for:</p>
          <ul>
            <li>Regional marketing campaigns</li>
            <li>Store location experiments</li>
            <li>Market expansion testing</li>
            <li>Competitive market analysis</li>
          </ul>
        </div>
      `
    },
    {
      id: 4,
      title: 'MMM Software: What Should You Look For?',
      subtitle: '',
      category: 'Education',
      date: 'Aug 5, 2025',
      excerpt: 'We discuss some of the key questions to ask a potential MMM provider — and the importance of prioritizing causality.',
      author: 'MMM Specialists',
      tags: ['MMM', 'Software Selection', 'Causality'],
      readTime: '7 min read',
      visualType: 'browser',
      visualColor: 'blue',
      content: `
        <div class="blog-article">
          <h2>Selecting MMM Software</h2>
          <p>Choosing the right Marketing Mix Modeling (MMM) software is crucial for accurate attribution and ROI measurement. Here's what to look for when evaluating potential providers.</p>
          
          <h3>Key Questions to Ask</h3>
          <ul>
            <li><strong>Causal Inference Methods:</strong> Does the software use modern causal inference techniques?</li>
            <li><strong>Data Integration:</strong> How easily can you connect your data sources?</li>
            <li><strong>Model Transparency:</strong> Can you understand how the model makes decisions?</li>
            <li><strong>Validation Methods:</strong> How does the software validate its predictions?</li>
          </ul>
          
          <h3>Why Causality Matters</h3>
          <p>Traditional MMM often relies on correlation rather than causation, leading to:</p>
          <ul>
            <li>Inaccurate attribution</li>
            <li>Poor investment decisions</li>
            <li>Missed optimization opportunities</li>
            <li>Reduced ROI</li>
          </ul>
          
          <h3>Evaluation Criteria</h3>
          <ol>
            <li>Statistical methodology</li>
            <li>Data requirements and quality</li>
            <li>Implementation timeline</li>
            <li>Ongoing support and training</li>
            <li>Cost and ROI</li>
          </ol>
        </div>
      `
    },
    {
      id: 5,
      title: 'The Meta Report',
      subtitle: 'Lessons from 640 Haus incrementality experiments',
      category: 'From the Lab',
      date: 'Jul 28, 2025',
      excerpt: 'An exclusive Haus analysis show Meta is incremental in most cases — but is the platform\'s move toward automation improving incremental efficiency?',
      author: 'Research Team',
      tags: ['Meta', 'Automation', 'Incrementality'],
      readTime: '12 min read',
      visualType: 'infinity',
      visualColor: 'light-blue',
      content: `
        <div class="blog-article">
          <h2>Meta's Automation Journey</h2>
          <p>Our analysis of 640 incrementality experiments reveals that Meta's move toward automation is having mixed effects on campaign performance and efficiency.</p>
          
          <h3>Key Findings</h3>
          <ul>
            <li><strong>Automation Benefits:</strong> Improved targeting precision in 65% of cases</li>
            <li><strong>Efficiency Gains:</strong> Reduced cost per acquisition by 23% on average</li>
            <li><strong>Incrementality Impact:</strong> Automation shows positive effects in 71% of experiments</li>
            <li><strong>Learning Periods:</strong> Longer automation periods show better results</li>
          </ul>
          
          <h3>Automation Strategies</h3>
          <p>Different automation approaches show varying results:</p>
          <ul>
            <li><strong>Full Automation:</strong> Best for large budgets and long campaigns</li>
            <li><strong>Hybrid Approach:</strong> Combines automation with manual optimization</li>
            <li><strong>Selective Automation:</strong> Automates specific aspects while maintaining control</li>
          </ul>
          
          <h3>Recommendations</h3>
          <p>Based on our analysis, we recommend:</p>
          <ol>
            <li>Start with selective automation</li>
            <li>Allow sufficient learning periods</li>
            <li>Monitor incrementality metrics closely</li>
            <li>Combine automation with human expertise</li>
            <li>Regular performance reviews and adjustments</li>
          </ol>
        </div>
      `
    },
    {
      id: 6,
      title: 'When Is It Time To Start Incrementality Testing?',
      subtitle: '',
      category: 'Education',
      date: 'Jul 23, 2025',
      excerpt: 'At our Open Haus AMA, a customer asked us: \'How do you know when a brand is at the scale where investing in an incrementality tool makes sense?\'',
      author: 'Customer Success Team',
      tags: ['Incrementality Testing', 'Scale', 'Investment'],
      readTime: '5 min read',
      visualType: 'bars',
      visualColor: 'gray',
      content: `
        <div class="blog-article">
          <h2>Timing Your Incrementality Investment</h2>
          <p>Determining the right time to invest in incrementality testing is crucial for maximizing ROI and avoiding premature optimization costs.</p>
          
          <h3>Signs You're Ready</h3>
          <ul>
            <li><strong>Marketing Spend:</strong> $100K+ monthly marketing budget</li>
            <li><strong>Data Volume:</strong> Sufficient data for statistical significance</li>
            <li><strong>Business Maturity:</strong> Stable operations and predictable patterns</li>
            <li><strong>ROI Pressure:</strong> Need to prove marketing effectiveness</li>
          </ul>
          
          <h3>Common Misconceptions</h3>
          <p>Many brands make these mistakes:</p>
          <ul>
            <li>Waiting too long to start testing</li>
            <li>Starting before having sufficient data</li>
            <li>Expecting immediate results</li>
            <li>Underestimating implementation complexity</li>
          </ul>
          
          <h3>Getting Started</h3>
          <p>When you're ready to begin:</p>
          <ol>
            <li>Assess your current data capabilities</li>
            <li>Choose the right testing methodology</li>
            <li>Start with small, controlled experiments</li>
            <li>Build internal expertise gradually</li>
            <li>Scale successful approaches</li>
          </ol>
        </div>
      `
    },
    {
      id: 7,
      title: 'The Performance Marketer\'s Guide to Incrementality Testing',
      subtitle: 'Stop Wasting Budget on Channels That Steal Credit from Your Organic Growth',
      category: 'From the Lab',
      date: 'Jul 20, 2025',
      excerpt: 'A comprehensive guide based on real-world case studies from Honda, Phillips, and leading startups. This framework has helped performance marketing teams save millions in misdirected ad spend.',
      author: 'Performance Marketing Expert',
      tags: ['Incrementality Testing', 'Performance Marketing', 'Budget Optimization'],
      readTime: '15 min read',
      visualType: 'infinity',
      visualColor: 'dark-blue',
      content: `
        <div class="blog-article">
          <h2>The Performance Marketer's Guide to Incrementality Testing</h2>
          <p><strong>Stop Wasting Budget on Channels That Steal Credit from Your Organic Growth</strong></p>
          
          <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 18px; opacity: 0.9;">A comprehensive guide based on real-world case studies from Honda, Phillips, and leading startups. This framework has helped performance marketing teams save millions in misdirected ad spend while improving true conversion efficiency by 35%+.</p>
          </div>
          
          <h3>Section 1: The Attribution Crisis</h3>
          <p>Traditional attribution models create a dangerous illusion. They tell you which touchpoint got the last click, but they can't tell you whether that conversion would have happened anyway. This fundamental flaw is costing performance marketers millions in misallocated budget.</p>
          
          <div style="background: #fff8e1; border: 2px solid #ff9800; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #e65100; margin: 0 0 15px 0;">📊 Honda Riyadh Case Study</h4>
            <p><strong>The Problem:</strong> Honda Riyadh was getting 100 leads from Google Search campaigns and 50 from YouTube campaigns in May 2025. On the surface, Search appeared to be the clear winner with a 2:1 conversion ratio.</p>
            <p><strong>The Reality:</strong> Customers were seeing Honda ads on YouTube (mobile/TV), then later searching "Honda" when they were ready to buy. Search was getting the conversion credit, but YouTube was doing the heavy lifting of creating demand.</p>
            <p><strong>The Impact:</strong> Honda was over-investing in Search and under-investing in the YouTube campaigns that were actually driving brand awareness and purchase intent.</p>
          </div>
          
          <div style="background: #f8f9ff; border-left: 4px solid #2a5298; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>The Core Question Incrementality Testing Answers:</strong></p>
            <p style="font-style: italic; font-size: 20px; margin-top: 15px; text-align: center; color: #1e3c72;">
              "Are my ads actually driving additional conversions, or would these customers have converted anyway?"
            </p>
          </div>
          
          <h3>Section 2: Understanding Incrementality</h3>
          <p>Incrementality testing measures the true causal impact of your marketing efforts. Instead of relying on correlation-based attribution, it uses controlled experiments to determine how many additional conversions your ads actually drive.</p>
          
          <div style="background: #f5f7fa; border: 2px solid #ddd; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
            <h4 style="margin: 0 0 15px 0; color: #2a5298;">Incrementality Test Structure</h4>
            <div style="display: flex; justify-content: space-between; gap: 20px; margin: 20px 0;">
              <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 8px; width: 48%;">
                <h5 style="color: #2a5298; margin: 0 0 10px 0;">Control Group</h5>
                <p>Receives Meta ads</p>
                <div style="font-size: 24px; font-weight: bold; color: #e65100; margin: 10px 0;">5 conversions</div>
              </div>
              <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 8px; width: 48%;">
                <h5 style="color: #2a5298; margin: 0 0 10px 0;">Test Group</h5>
                <p>No Meta ads shown</p>
                <div style="font-size: 24px; font-weight: bold; color: #e65100; margin: 10px 0;">2 conversions</div>
              </div>
            </div>
          </div>
          
          <div style="background: #e8f5e8; border: 2px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; font-family: 'Courier New', monospace; font-weight: bold;">
            Incrementality Factor (%) = (Incremental Conversions ÷ Control Group Conversions) × 100
          </div>
          
          <h3>Section 3: The Four Testing Methods</h3>
          <p>There are four main incrementality testing methods, each suited for different organizational constraints and accuracy requirements:</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px;">
              <h5 style="color: #2a5298; margin: 0 0 10px 0;">1. Time-Based Split</h5>
              <p><strong>Method:</strong> Turn channel completely off for equal periods</p>
              <p><strong>Best for:</strong> Companies that can pause entire channels</p>
              <p><strong>Accuracy:</strong> Highest</p>
            </div>
            <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px;">
              <h5 style="color: #2a5298; margin: 0 0 10px 0;">2. Geo-Split</h5>
              <p><strong>Method:</strong> Test in similar geographic markets</p>
              <p><strong>Best for:</strong> Multi-location businesses</p>
              <p><strong>Accuracy:</strong> High</p>
            </div>
            <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px;">
              <h5 style="color: #2a5298; margin: 0 0 10px 0;">3. Audience Split</h5>
              <p><strong>Method:</strong> Divide audiences using CRM/CDP</p>
              <p><strong>Best for:</strong> Companies with robust data systems</p>
              <p><strong>Accuracy:</strong> High</p>
            </div>
            <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px;">
              <h5 style="color: #2a5298; margin: 0 0 10px 0;">4. Ghost Ads/PSA</h5>
              <p><strong>Method:</strong> Show PSA ads to control group</p>
              <p><strong>Best for:</strong> When other methods aren't feasible</p>
              <p><strong>Accuracy:</strong> Moderate</p>
            </div>
          </div>
          
          <h3>Section 4: Applications & Use Cases</h3>
          <p>Most companies want to understand the impact of each marketing channel. Apply incrementality factors to see true performance and optimize budget allocation accordingly.</p>
          
          <div style="background: #fff8e1; border: 2px solid #ff9800; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #e65100; margin: 0 0 15px 0;">📊 Budget Reallocation Example</h4>
            <p><strong>Original Attribution-Based Allocation:</strong></p>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0;">
              <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px; text-align: center;">
                <span style="font-size: 20px; font-weight: bold; color: #2a5298; display: block;">$40K</span>
                <span style="font-size: 14px; color: #666;">Google Search</span>
              </div>
              <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px; text-align: center;">
                <span style="font-size: 20px; font-weight: bold; color: #2a5298; display: block;">$30K</span>
                <span style="font-size: 14px; color: #666;">Meta Ads</span>
              </div>
              <div style="background: white; border: 2px solid #2a5298; padding: 15px; border-radius: 6px; text-align: center;">
                <span style="font-size: 20px; font-weight: bold; color: #2a5298; display: block;">$20K</span>
                <span style="font-size: 14px; color: #666;">YouTube</span>
              </div>
            </div>
            
            <p><strong>After Incrementality Testing:</strong></p>
            <ul>
              <li>Google Search: 85% incrementality → Increase to $45K</li>
              <li>YouTube: 90% incrementality → Increase to $30K (was undervalued!)</li>
              <li>Meta: 60% incrementality → Decrease to $15K (was overvalued)</li>
            </ul>
          </div>
          
          <h3>Section 5: Implementation Best Practices</h3>
          <div style="background: #fff3e0; border: 2px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #ff5722;">
            <h4 style="color: #e65100; margin: 0 0 15px 0;">⚠️ Common Pitfalls to Avoid</h4>
            <ul>
              <li><strong>Seasonality Contamination:</strong> Never run tests during holidays, sales events, or market disruptions</li>
              <li><strong>Insufficient Sample Size:</strong> Ensure statistical significance before making decisions</li>
              <li><strong>Short Test Duration:</strong> Run for at least one full purchase cycle</li>
              <li><strong>Multiple Variable Changes:</strong> Keep all other marketing constant during test</li>
            </ul>
          </div>
          
          <div style="background: #f8f9ff; border-left: 4px solid #2a5298; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <p><strong>Key Takeaway:</strong></p>
            <p style="font-style: italic; font-size: 18px; text-align: center; color: #1e3c72;">
              "Incrementality testing isn't just about measuring performance—it's about building a sustainable, privacy-compliant foundation for growth that gives you a competitive advantage in an increasingly complex digital landscape."
            </p>
          </div>
          
          <p style="text-align: center; margin-top: 30px; font-weight: bold; color: #2a5298;">
            Ready to implement incrementality testing? Start with a single channel test using the frameworks in this guide, then expand based on your results.
          </p>
        </div>
      `
    }
  ];

  const renderVisual = (post) => {
    switch (post.visualType) {
      case 'bars':
        return (
          <div className={`visual-bars ${post.visualColor}`}>
            <div className="bar bar-1"></div>
            <div className="bar bar-2"></div>
            <div className="bar bar-3"></div>
            <div className="circles">
              <div className="circle"></div>
              <div className="circle"></div>
              <div className="circle"></div>
            </div>
          </div>
        );
      case 'location':
        return (
          <div className="visual-location">
            <MapPin size={48} />
            <div className="location-circle"></div>
          </div>
        );
      case 'browser':
        return (
          <div className="visual-browser">
            <div className="browser-window">
              <BarChart3 size={24} />
              <CheckCircle size={20} className="check" />
            </div>
            <div className="browser-window">
              <BarChart3 size={24} />
              <XCircle size={20} className="x-mark" />
            </div>
            <div className="browser-window">
              <BarChart3 size={24} />
              <XCircle size={20} className="x-mark" />
            </div>
          </div>
        );
      case 'infinity':
        return (
          <div className="visual-infinity">
            <Infinity size={48} />
            <div className="infinity-icons">
              <div className="icon">💻</div>
              <div className="icon">📢</div>
              <div className="icon">💬</div>
              <div className="icon">📊</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="blog-page">
      <div className="blog-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1 className="blog-title">Latest Articles</h1>
        <p className="blog-subtitle">Insights and guides for experiment management and causal inference</p>
      </div>

      <div className="blog-content">
        <div className="blog-grid">
          {blogPosts.map((post) => (
            <article key={post.id} className="blog-card">
              <div className="blog-card-visual">
                {renderVisual(post)}
              </div>
              
              <div className="blog-card-content">
                <div className="blog-meta">
                  <span className="blog-category">{post.category}</span>
                  <span className="blog-date">{post.date}</span>
                </div>
                
                <h2 className="blog-card-title">{post.title}</h2>
                {post.subtitle && <h3 className="blog-card-subtitle">{post.subtitle}</h3>}
                <p className="blog-card-excerpt">{post.excerpt}</p>
                
                <div className="blog-tags">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="blog-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <button 
                  className="read-more-btn"
                  onClick={() => openBlogInNewTab(post)}
                >
                  Read More
                </button>
              </div>
              

            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;
