'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, StopIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CodeExecutorProps {
  code: string;
  language: string;
  title?: string;
  className?: string;
}

export function CodeExecutor({ 
  code, 
  language, 
  title = 'Code Output',
  className = '' 
}: CodeExecutorProps) {
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isExecutable = () => {
    return ['javascript', 'typescript', 'jsx', 'tsx', 'html', 'css', 'python', 'py'].includes(language.toLowerCase());
  };

  const executeCode = () => {
    if (!isExecutable()) {
      setError('이 언어는 브라우저에서 실행할 수 없습니다.');
      return;
    }

    setIsRunning(true);
    setError('');
    setOutput('');

    try {
      if (language.toLowerCase() === 'html' || language.includes('html')) {
        executeHTML();
      } else if (['javascript', 'js', 'jsx', 'tsx', 'typescript', 'ts'].includes(language.toLowerCase())) {
        executeJavaScript();
      } else if (language.toLowerCase() === 'css') {
        executeCSS();
      } else if (['python', 'py'].includes(language.toLowerCase())) {
        executePython();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '실행 중 오류가 발생했습니다.');
      setIsRunning(false);
    }
  };

  const executeHTML = () => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (doc) {
      // 강화된 디버깅 스크립트
      const debugScript = `
<script>
(function() {
  function initDebugEnv() {
    const originalAlert = window.alert;
    const originalLog = console.log;
    const originalError = console.error;
    
    // 디버그 패널 생성
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = \`
      position: fixed !important; 
      top: 10px !important; 
      right: 10px !important; 
      z-index: 999999 !important; 
      width: 300px !important; 
      max-height: 350px !important; 
      overflow-y: auto !important;
      background: rgba(255,255,255,0.98) !important; 
      border: 2px solid #2196f3 !important; 
      border-radius: 8px !important; 
      padding: 12px !important; 
      font-family: 'Courier New', monospace !important; 
      font-size: 11px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
    \`;
    
    const header = document.createElement('div');
    header.style.cssText = 'font-weight: bold !important; color: #2196f3 !important; margin-bottom: 8px !important; border-bottom: 1px solid #eee !important; padding-bottom: 4px !important;';
    header.innerHTML = '🔍 Debug Output';
    debugPanel.appendChild(header);
    
    function addDebugEntry(content, type = 'log') {
      const entry = document.createElement('div');
      entry.style.cssText = 'margin: 4px 0 !important; padding: 6px 8px !important; border-radius: 4px !important; word-wrap: break-word !important; border-left: 3px solid #ddd !important;';
      
      let prefix = '';
      let styles = '';
      switch(type) {
        case 'alert':
          styles = 'background: #e3f2fd !important; border-left-color: #2196f3 !important; color: #1565c0 !important;';
          prefix = '🚨 ALERT: ';
          break;
        case 'error':
          styles = 'background: #ffebee !important; border-left-color: #f44336 !important; color: #c62828 !important;';
          prefix = '❌ ERROR: ';
          break;
        case 'log':
        default:
          styles = 'background: #f1f8e9 !important; border-left-color: #4caf50 !important; color: #2e7d32 !important;';
          prefix = '📝 LOG: ';
          break;
      }
      
      entry.style.cssText += styles;
      entry.innerHTML = prefix + String(content).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      debugPanel.appendChild(entry);
      debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    
    // alert 완전 재정의
    window.alert = function(message) {
      addDebugEntry(message, 'alert');
      try {
        originalAlert.call(window, message);
      } catch (e) {
        addDebugEntry('Native alert blocked in iframe', 'log');
      }
    };
    
    // console.log 완전 재정의
    console.log = function(...args) {
      const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Object]';
          }
        }
        return String(arg);
      }).join(' ');
      
      addDebugEntry(message, 'log');
      try {
        originalLog.apply(console, args);
      } catch (e) {}
    };
    
    // console.error 완전 재정의
    console.error = function(...args) {
      const message = args.map(arg => String(arg)).join(' ');
      addDebugEntry(message, 'error');
      try {
        originalError.apply(console, args);
      } catch (e) {}
    };
    
    // 패널을 body에 추가
    const addPanel = () => {
      if (document.body) {
        document.body.appendChild(debugPanel);
        addDebugEntry('Debug environment ready', 'log');
      } else {
        setTimeout(addPanel, 50);
      }
    };
    addPanel();
  }
  
  // 다양한 시점에서 초기화 시도
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebugEnv);
  } else {
    initDebugEnv();
  }
  
  // 백업 초기화
  setTimeout(initDebugEnv, 100);
})();
</script>`;
      
      let enhancedCode = code;
      
      // HTML 문서 여부 확인 및 스크립트 주입
      if (code.includes('<html>') || code.includes('<!DOCTYPE')) {
        if (code.includes('</head>')) {
          enhancedCode = code.replace('</head>', debugScript + '</head>');
        } else if (code.includes('<head>')) {
          enhancedCode = code.replace('<head>', '<head>' + debugScript);
        } else if (code.includes('<body>')) {
          enhancedCode = code.replace('<body>', '<head>' + debugScript + '</head><body>');
        } else {
          enhancedCode = debugScript + code;
        }
      } else {
        // HTML 조각인 경우
        enhancedCode = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HTML Preview</title>
  ${debugScript}
</head>
<body>
${code}
</body>
</html>`;
      }
      
      doc.open();
      doc.write(enhancedCode);
      doc.close();
      setIsReady(true);
      setIsRunning(false);
    }
  };

  const executeJavaScript = () => {
    // React 컴포넌트인지 확인
    if (code.includes('export function') || code.includes('export default') || code.includes('function ') || code.includes('const ')) {
      executeReactComponent();
    } else {
      executeVanillaJS();
    }
  };

  const executeReactComponent = () => {
    // React 컴포넌트를 iframe에서 실행
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>React Component</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      padding: 20px;
      margin: 0;
    }
    .error {
      background: #fee;
      border: 1px solid #fcc;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      color: #c00;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    try {
      ${code}
      
      // 컴포넌트 찾기 및 렌더링
      const componentName = Object.keys(window).find(key => 
        typeof window[key] === 'function' && 
        key[0] === key[0].toUpperCase() &&
        key !== 'React' && key !== 'ReactDOM'
      );
      
      let ComponentToRender;
      if (componentName && window[componentName]) {
        ComponentToRender = window[componentName];
      } else {
        // export된 컴포넌트 찾기
        const codeStr = \`${code}\`;
        const exportMatch = codeStr.match(/export\\s+(function|const|default)\\s+(\\w+)/);
        if (exportMatch) {
          ComponentToRender = eval(exportMatch[2]);
        } else {
          // function 선언 찾기
          const funcMatch = codeStr.match(/function\\s+(\\w+)/);
          if (funcMatch) {
            ComponentToRender = eval(funcMatch[1]);
          }
        }
      }
      
      if (ComponentToRender) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(ComponentToRender));
      } else {
        document.getElementById('root').innerHTML = '<div class="error">실행할 React 컴포넌트를 찾을 수 없습니다.</div>';
      }
    } catch (error) {
      console.error('실행 오류:', error);
      document.getElementById('root').innerHTML = '<div class="error">오류: ' + error.message + '</div>';
    }
  </script>
</body>
</html>`;

    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setIsReady(true);
        setIsRunning(false);
      }
    }
  };

  const executeVanillaJS = () => {
    // 향상된 JavaScript 실행 환경
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JavaScript Output</title>
  <style>
    body { 
      font-family: 'Courier New', monospace;
      padding: 20px;
      margin: 0;
      background: #f8f8f8;
    }
    .output {
      background: white;
      border: 1px solid #ddd;
      padding: 12px;
      margin: 8px 0;
      border-radius: 6px;
      white-space: pre-wrap;
      border-left: 4px solid #4caf50;
    }
    .error {
      background: #ffebee;
      border: 1px solid #ffcdd2;
      border-left: 4px solid #f44336;
      color: #c62828;
    }
    .alert {
      background: #e3f2fd !important;
      border: 1px solid #bbdefb !important;
      border-left: 4px solid #2196f3 !important;
      color: #1565c0 !important;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    (function() {
      const originalLog = console.log;
      const originalError = console.error;
      const originalAlert = window.alert;
      const outputDiv = document.getElementById('output');
      
      function addOutput(content, className = 'output') {
        const div = document.createElement('div');
        div.className = className;
        
        if (typeof content === 'object' && content !== null) {
          try {
            div.textContent = JSON.stringify(content, null, 2);
          } catch (e) {
            div.textContent = String(content);
          }
        } else {
          div.textContent = String(content);
        }
        
        outputDiv.appendChild(div);
        outputDiv.scrollTop = outputDiv.scrollHeight;
      }
      
      // console.log 재정의
      console.log = function(...args) {
        const content = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
        
        addOutput('📝 ' + content);
        
        try {
          originalLog.apply(console, args);
        } catch (e) {}
      };
      
      // console.error 재정의
      console.error = function(...args) {
        const content = args.map(arg => String(arg)).join(' ');
        addOutput('❌ ' + content, 'output error');
        
        try {
          originalError.apply(console, args);
        } catch (e) {}
      };

      // alert 재정의
      window.alert = function(message) {
        const content = '🚨 Alert: ' + String(message);
        addOutput(content, 'output alert');
        
        try {
          originalAlert.call(window, message);
        } catch (e) {
          addOutput('(Native alert blocked in iframe)', 'output');
        }
      };
      
      // 환경 준비 완료 표시
      addOutput('JavaScript execution environment ready');
      
      // 사용자 코드 실행
      try {
        ${code}
        addOutput('Code execution completed');
      } catch (error) {
        console.error('Runtime error: ' + error.message);
        console.error(error.stack);
      }
    })();
  </script>
</body>
</html>`;

    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setIsReady(true);
        setIsRunning(false);
      }
    }
  };

  const executeCSS = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CSS Preview</title>
  <style>
    ${code}
  </style>
</head>
<body>
  <div class="demo-content">
    <h1>CSS 미리보기</h1>
    <p>이 페이지에 CSS가 적용되었습니다.</p>
    <button>버튼 예제</button>
    <div class="box">박스 예제</div>
  </div>
</body>
</html>`;

    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setIsReady(true);
        setIsRunning(false);
      }
    }
  };

  const executePython = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Python Output</title>
  <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
  <style>
    body { 
      font-family: monospace;
      padding: 20px;
      margin: 0;
      background: #f8f8f8;
    }
    .output {
      background: white;
      border: 1px solid #ddd;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      white-space: pre-wrap;
    }
    .error {
      background: #fee;
      border: 1px solid #fcc;
      color: #c00;
    }
    .loading {
      text-align: center;
      padding: 20px;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="loading" class="loading">Python 환경을 로딩 중입니다...</div>
  <div id="output" style="display: none;"></div>
  
  <script>
    async function main() {
      try {
        // Pyodide 로드
        let pyodide = await loadPyodide();
        
        const loadingDiv = document.getElementById('loading');
        const outputDiv = document.getElementById('output');
        
        loadingDiv.style.display = 'none';
        outputDiv.style.display = 'block';
        
        // Python 출력 가로채기
        pyodide.runPython(\`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.output = []
    
    def write(self, text):
        if text.strip():
            self.output.append(text.rstrip())
    
    def get_output(self):
        return '\\n'.join(self.output)
    
    def flush(self):
        pass

# 표준 출력 캡처
output_capture = OutputCapture()
sys.stdout = output_capture
        \`);
        
        try {
          // 사용자 코드 실행
          pyodide.runPython(\`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
          
          // 출력 결과 가져오기
          const output = pyodide.runPython('output_capture.get_output()');
          
          if (output) {
            const div = document.createElement('div');
            div.className = 'output';
            div.textContent = output;
            outputDiv.appendChild(div);
          } else {
            const div = document.createElement('div');
            div.className = 'output';
            div.textContent = '실행 완료 (출력 없음)';
            outputDiv.appendChild(div);
          }
        } catch (error) {
          const div = document.createElement('div');
          div.className = 'output error';
          div.textContent = 'Python 오류: ' + error.message;
          outputDiv.appendChild(div);
        }
      } catch (error) {
        document.getElementById('loading').innerHTML = 
          '<div class="output error">Pyodide 로딩 실패: ' + error.message + '</div>';
      }
    }
    
    main();
  </script>
</body>
</html>`;

    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setIsReady(true);
        setIsRunning(false);
      }
    }
  };

  const clearOutput = () => {
    setOutput('');
    setError('');
    setIsReady(false);
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write('<html><body></body></html>');
        doc.close();
      }
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* 컨트롤 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className="flex items-center space-x-2">
          {isExecutable() && (
            <>
              <button
                onClick={executeCode}
                disabled={isRunning}
                className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded border ${
                  isRunning
                    ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                    : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                }`}
              >
                <PlayIcon className="h-3 w-3 mr-1" />
                {isRunning ? '실행 중...' : '실행'}
              </button>
              <button
                onClick={clearOutput}
                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded border bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                <TrashIcon className="h-3 w-3 mr-1" />
                초기화
              </button>
            </>
          )}
        </div>
      </div>

      {/* 실행 결과 */}
      <div className="h-64 bg-white">
        {!isExecutable() ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <StopIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>이 언어는 브라우저에서 실행할 수 없습니다.</p>
              <p className="text-xs mt-1">지원 언어: JavaScript, TypeScript, HTML, CSS, React, Python</p>
            </div>
          </div>
        ) : !isReady ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <PlayIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>실행 버튼을 클릭하여 코드를 실행하세요.</p>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-modals allow-popups allow-forms"
            title="Code Execution Result"
          />
        )}
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          오류: {error}
        </div>
      )}
    </div>
  );
}