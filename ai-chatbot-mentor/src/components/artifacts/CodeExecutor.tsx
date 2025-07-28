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
    return ['javascript', 'typescript', 'jsx', 'tsx', 'html', 'css'].includes(language.toLowerCase());
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
      doc.open();
      doc.write(code);
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
    // 일반 JavaScript 실행
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JavaScript Output</title>
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
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    // console.log 가로채기
    const originalLog = console.log;
    const originalError = console.error;
    const outputDiv = document.getElementById('output');
    
    console.log = function(...args) {
      const div = document.createElement('div');
      div.className = 'output';
      div.textContent = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ');
      outputDiv.appendChild(div);
      originalLog.apply(console, args);
    };
    
    console.error = function(...args) {
      const div = document.createElement('div');
      div.className = 'output error';
      div.textContent = 'Error: ' + args.join(' ');
      outputDiv.appendChild(div);
      originalError.apply(console, args);
    };
    
    try {
      ${code}
    } catch (error) {
      console.error(error.message);
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
              <p className="text-xs mt-1">지원 언어: JavaScript, TypeScript, HTML, CSS, React</p>
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
            sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
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