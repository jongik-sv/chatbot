import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import { artifactFileManager } from './ArtifactFileManager';

export interface PythonExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface PythonExecutionOptions {
  timeout?: number; // 밀리초, 기본값: 30초
  workingDirectory?: string;
  environment?: Record<string, string>;
  allowNetworkAccess?: boolean;
}

export class PythonExecutor {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30초
  private static readonly PYTHON_COMMANDS = ['python3', 'python', 'py'];
  
  /**
   * Python 스크립트를 안전한 환경에서 실행
   */
  static async execute(
    code: string,
    options: PythonExecutionOptions = {}
  ): Promise<PythonExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Python 실행 파일 찾기
      const pythonCommand = await this.findPythonCommand();
      if (!pythonCommand) {
        return {
          success: false,
          output: '',
          error: 'Python 인터프리터를 찾을 수 없습니다. Python이 설치되어 있는지 확인해주세요.',
          executionTime: Date.now() - startTime
        };
      }

      // 임시 파일 생성
      const tempDir = path.join(process.cwd(), 'temp', 'python_execution');
      await fs.mkdir(tempDir, { recursive: true });
      
      const scriptFile = path.join(tempDir, `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.py`);
      
      // 보안 강화된 Python 코드 작성
      const secureCode = this.wrapCodeWithSecurity(code, options);
      await fs.writeFile(scriptFile, secureCode, 'utf8');

      try {
        // Python 스크립트 실행
        const result = await this.runPythonScript(
          pythonCommand,
          scriptFile,
          options
        );

        // 임시 파일 정리
        await fs.unlink(scriptFile).catch(() => {});

        return {
          ...result,
          executionTime: Date.now() - startTime
        };

      } catch (error) {
        // 임시 파일 정리
        await fs.unlink(scriptFile).catch(() => {});
        throw error;
      }

    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 아티팩트로 저장된 Python 파일 실행
   */
  static async executeArtifact(
    sessionId: string,
    artifactId: string,
    options: PythonExecutionOptions = {}
  ): Promise<PythonExecutionResult> {
    try {
      // 아티팩트 파일 읽기
      const code = await artifactFileManager.readArtifact(sessionId, artifactId, 'main.py');
      
      // 아티팩트 디렉토리를 작업 디렉토리로 설정
      const artifactPath = path.join(process.cwd(), 'data', 'artifacts', `session_${sessionId}`, `artifact_${artifactId}`);
      
      return await this.execute(code, {
        ...options,
        workingDirectory: artifactPath
      });

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `아티팩트 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        executionTime: 0
      };
    }
  }

  /**
   * Python 명령어 찾기
   */
  private static async findPythonCommand(): Promise<string | null> {
    for (const command of this.PYTHON_COMMANDS) {
      try {
        await this.runCommand(command, ['--version'], { timeout: 5000 });
        return command;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * 보안 강화된 Python 코드 래핑
   */
  private static wrapCodeWithSecurity(
    code: string,
    options: PythonExecutionOptions
  ): string {
    const restrictions = [];

    // 네트워크 액세스 제한
    if (!options.allowNetworkAccess) {
      restrictions.push(`
# 네트워크 액세스 제한
import socket
original_socket = socket.socket
def restricted_socket(*args, **kwargs):
    raise PermissionError("네트워크 액세스가 제한되었습니다.")
socket.socket = restricted_socket

import urllib.request
original_urlopen = urllib.request.urlopen
def restricted_urlopen(*args, **kwargs):
    raise PermissionError("네트워크 액세스가 제한되었습니다.")
urllib.request.urlopen = restricted_urlopen
`);
    }

    // 파일 시스템 액세스 제한
    restrictions.push(`
# 위험한 파일 시스템 작업 제한
import os
original_system = os.system
def restricted_system(command):
    raise PermissionError("시스템 명령 실행이 제한되었습니다.")
os.system = restricted_system

import subprocess
original_run = subprocess.run
def restricted_run(*args, **kwargs):
    raise PermissionError("서브프로세스 실행이 제한되었습니다.")
subprocess.run = restricted_run
subprocess.call = restricted_run
subprocess.Popen = lambda *args, **kwargs: (_ for _ in ()).throw(PermissionError("서브프로세스 실행이 제한되었습니다."))
`);

    // 무한 루프 방지를 위한 실행 시간 제한
    const timeoutSeconds = Math.floor((options.timeout || this.DEFAULT_TIMEOUT) / 1000);
    restrictions.push(`
# 실행 시간 제한
import signal
import sys

def timeout_handler(signum, frame):
    raise TimeoutError(f"스크립트 실행 시간이 {timeoutSeconds}초를 초과했습니다.")

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(${timeoutSeconds})

try:
`);

    return `
${restrictions.join('\n')}

# 사용자 코드 시작
${code}

# 사용자 코드 끝
except Exception as e:
    print(f"오류: {str(e)}", file=sys.stderr)
    sys.exit(1)
finally:
    signal.alarm(0)  # 타이머 해제
`;
  }

  /**
   * Python 스크립트 실행
   */
  private static runPythonScript(
    pythonCommand: string,
    scriptFile: string,
    options: PythonExecutionOptions
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const timeout = options.timeout || this.DEFAULT_TIMEOUT;
      let stdout = '';
      let stderr = '';
      let isResolved = false;

      const env = {
        ...process.env,
        ...options.environment,
        // Python 환경 변수 설정
        PYTHONPATH: options.workingDirectory || process.cwd(),
        PYTHONUNBUFFERED: '1', // 실시간 출력
        PYTHONDONTWRITEBYTECODE: '1' // .pyc 파일 생성 방지
      };

      const childProcess = spawn(pythonCommand, [scriptFile], {
        cwd: options.workingDirectory || process.cwd(),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      // 타임아웃 설정
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          childProcess.kill('SIGKILL');
          isResolved = true;
          resolve({
            success: false,
            output: stdout,
            error: `실행 시간 초과 (${timeout}ms)`
          });
        }
      }, timeout);

      // 표준 출력 수집
      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // 표준 에러 수집
      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // 프로세스 종료 처리
      childProcess.on('close', (code) => {
        if (!isResolved) {
          clearTimeout(timeoutId);
          isResolved = true;

          const success = code === 0;
          resolve({
            success,
            output: stdout || (success ? '실행 완료 (출력 없음)' : ''),
            error: stderr || (!success ? `프로세스가 코드 ${code}로 종료되었습니다.` : undefined)
          });
        }
      });

      // 프로세스 에러 처리
      childProcess.on('error', (error) => {
        if (!isResolved) {
          clearTimeout(timeoutId);
          isResolved = true;
          resolve({
            success: false,
            output: stdout,
            error: `프로세스 실행 오류: ${error.message}`
          });
        }
      });
    });
  }

  /**
   * 시스템 명령어 실행 (내부 사용)
   */
  private static runCommand(
    command: string,
    args: string[],
    options: { timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 5000;
      let stdout = '';
      let stderr = '';

      const childProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const timeoutId = setTimeout(() => {
        childProcess.kill('SIGKILL');
        reject(new Error(`명령어 실행 시간 초과: ${command}`));
      }, timeout);

      childProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`명령어 실행 실패 (코드 ${code}): ${command}`));
        }
      });

      childProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }
}

// 기본 내보내기
export const pythonExecutor = new PythonExecutor();