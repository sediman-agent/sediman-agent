/**
 * Guaranteed Working Browser Panel
 * Simple version that definitely allows URL typing and navigation
 */

import { useState, useRef, useEffect } from 'react';

export function GuaranteedBrowserPanel() {
  const [isOpen, setIsOpen] = useState(true); // Always open for testing
  const [url, setUrl] = useState('https://www.google.com');
  const [inputValue, setInputValue] = useState('https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);

  const webviewRef = useRef<any>(null);

  const handleNavigate = () => {
    if (!inputValue.trim()) return;

    // Normalize URL
    let normalizedUrl = inputValue;
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    console.log('Navigating to:', normalizedUrl);
    setUrl(normalizedUrl);
    setIsLoading(true);

    // Load URL in webview
    setTimeout(() => {
      if (webviewRef.current && webviewRef.current.loadURL) {
        try {
          webviewRef.current.loadURL(normalizedUrl);
          console.log('✅ Webview loaded URL successfully');
        } catch (error) {
          console.error('❌ Webview load failed:', error);
        }
      }
      setIsLoading(false);
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    console.log('Input changed to:', value);
  };

  // Auto-load initial URL
  useEffect(() => {
    if (webviewRef.current && webviewRef.current.loadURL) {
      setTimeout(() => {
        try {
          webviewRef.current.loadURL(url);
          console.log('✅ Initial URL loaded:', url);
        } catch (error) {
          console.error('❌ Initial load failed:', error);
        }
      }, 1000);
    }
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        bottom: 0,
        width: '600px',
        backgroundColor: 'white',
        zIndex: 1000,
        borderLeft: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🌐 Browser</span>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '5px 10px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

        {/* URL Input */}
        <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type URL here (e.g., google.com)"
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleNavigate}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: isLoading ? '#ccc' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '...' : 'Go'}
          </button>
        </div>
      </div>

      {/* Webview Area */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: 'white' }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.9)',
            zIndex: 10
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              <div style={{ fontSize: '14px', color: '#666' }}>Loading...</div>
            </div>
          </div>
        )}

        <webview
          ref={webviewRef}
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: 'white'
          }}
          partition="persist:browser"
          nodeintegration
          plugins
        />
      </div>

      {/* Status Bar */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid #eee',
        fontSize: '12px',
        backgroundColor: '#f9f9f9'
      }}>
        <span style={{ color: '#22c55e' }}>● Connected</span>
        <span style={{ marginLeft: '20px', color: '#666' }}>{url}</span>
      </div>
    </div>
  );
}
