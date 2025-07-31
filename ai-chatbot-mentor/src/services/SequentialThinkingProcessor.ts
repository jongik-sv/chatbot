// Sequential Thinking Processor - MCP 도구와 연동하여 단계별 사고 과정 처리
import { mcpService } from './MCPService';
import { LLMService } from './LLMService';

interface ThinkingStep {
  stepNumber: number;
  thought: string;
  reasoning: string;
  nextStepNeeded: boolean;
  mcpResult?: any;
}

interface ProcessedThinkingResult {
  steps: ThinkingStep[];
  finalAnswer: string;
  totalSteps: number;
  processingTime: number;
  thinkingProcess: string; // 사고 과정을 마크다운으로 포맷팅
}

export class SequentialThinkingProcessor {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * Sequential Thinking MCP 도구를 사용하여 단계별 사고 과정을 처리합니다
   */
  async processSequentialThinking(
    userMessage: string,
    model: string = 'gemini-2.0-flash-exp',
    maxSteps: number = 5,
    sessionId?: number,
    userId?: string
  ): Promise<ProcessedThinkingResult> {
    const startTime = Date.now();
    const steps: ThinkingStep[] = [];
    let currentStep = 1;
    let nextThoughtNeeded = true;

    console.log('🤔 Sequential Thinking 처리 시작:', userMessage.substring(0, 100));

    // 초기 사고 시작
    let currentThought = `사용자 요청 분석: ${userMessage}

이 요청을 단계별로 체계적으로 분석해보겠습니다.`;

    while (nextThoughtNeeded && currentStep <= maxSteps) {
      try {
        console.log(`🔄 단계 ${currentStep} 처리 중...`);

        // MCP Sequential Thinking 도구 호출
        const mcpResult = await mcpService.executeTool(
          'sequential-thinking',
          'sequentialthinking',
          {
            thought: currentThought,
            nextThoughtNeeded: true,
            thoughtNumber: currentStep,
            totalThoughts: maxSteps
          },
          {
            sessionId: sessionId?.toString(),
            userId: userId
          }
        );

        if (!mcpResult.success) {
          throw new Error(mcpResult.error || 'MCP 도구 실행 실패');
        }

        // MCP 결과 파싱
        const mcpContent = mcpResult.content?.[0]?.text || '{}';
        let parsedResult;
        
        try {
          parsedResult = JSON.parse(mcpContent);
        } catch (parseError) {
          console.warn('MCP 결과 파싱 실패, 텍스트로 처리:', mcpContent);
          parsedResult = { 
            thoughtNumber: currentStep,
            nextThoughtNeeded: currentStep < maxSteps,
            content: mcpContent 
          };
        }

        // 현재 단계의 실제 사고 내용 생성
        const stepThought = await this.generateStepThought(
          userMessage,
          currentStep,
          maxSteps,
          steps,
          model
        );

        steps.push({
          stepNumber: currentStep,
          thought: stepThought.thought,
          reasoning: stepThought.reasoning,
          nextStepNeeded: stepThought.nextStepNeeded,
          mcpResult: parsedResult
        });

        // 다음 단계 준비
        nextThoughtNeeded = stepThought.nextStepNeeded && currentStep < maxSteps;
        currentThought = `이전 단계들의 분석을 바탕으로 계속 진행합니다.

단계 ${currentStep} 결과: ${stepThought.thought}

다음 단계에서는 더 구체적인 분석을 진행하겠습니다.`;

        currentStep++;

        console.log(`✅ 단계 ${currentStep - 1} 완료`);

      } catch (error) {
        console.error(`❌ 단계 ${currentStep} 처리 오류:`, error);
        
        // 오류 시에도 기본 사고 과정 제공
        const fallbackThought = await this.generateFallbackThought(
          userMessage,
          currentStep,
          maxSteps,
          steps,
          model
        );

        steps.push({
          stepNumber: currentStep,
          thought: fallbackThought.thought,
          reasoning: fallbackThought.reasoning,
          nextStepNeeded: false,
          mcpResult: { error: error instanceof Error ? error.message : 'Unknown error' }
        });

        break;
      }
    }

    // 최종 답변 생성
    const finalAnswer = await this.generateFinalAnswer(userMessage, steps, model);
    
    // 사고 과정 포맷팅
    const thinkingProcess = this.formatThinkingProcess(steps);

    const processingTime = Date.now() - startTime;

    console.log(`🎯 Sequential Thinking 완료: ${steps.length}단계, ${processingTime}ms`);

    return {
      steps,
      finalAnswer,
      totalSteps: steps.length,
      processingTime,
      thinkingProcess
    };
  }

  /**
   * 개별 단계의 사고 내용을 생성합니다
   */
  private async generateStepThought(
    userMessage: string,
    stepNumber: number,
    maxSteps: number,
    previousSteps: ThinkingStep[],
    model: string
  ): Promise<{ thought: string; reasoning: string; nextStepNeeded: boolean }> {
    const previousThoughts = previousSteps.map(step => 
      `**단계 ${step.stepNumber}**: ${step.thought}`
    ).join('\n\n');

    const systemPrompt = `당신은 단계별 사고 과정을 수행하는 AI입니다.

현재 단계(${stepNumber}/${maxSteps})에서 사용자 요청에 대한 구체적인 분석을 수행하세요.

## 이전 사고 과정:
${previousThoughts || '(첫 번째 단계입니다)'}

## 지침:
1. 현재 단계에서만 집중하여 구체적으로 분석하세요
2. 실용적이고 도움이 되는 내용을 제공하세요
3. 다음 단계가 필요한지 판단하세요
4. 각 단계는 이전 단계를 발전시키는 내용이어야 합니다

## 응답 형식:
**현재 단계 분석**: [이 단계에서의 구체적인 분석이나 계획]
**추론 과정**: [왜 이렇게 분석했는지에 대한 설명]
**다음 단계 필요**: [true/false - 더 분석이 필요한지]`;

    const conversation = [
      {
        role: 'user',
        content: `다음 요청에 대해 단계 ${stepNumber}에서 수행할 분석을 제시해주세요:

"${userMessage}"`
      }
    ];

    try {
      const response = await this.llmService.chat(conversation, {
        model,
        temperature: 0.3,
        maxTokens: 1000,
        systemInstruction: systemPrompt
      });

      if (!response.success) {
        throw new Error(response.error || 'LLM 응답 실패');
      }

      // 응답 파싱
      const content = response.content;
      const thoughtMatch = content.match(/\*\*현재 단계 분석\*\*:\s*(.+?)(?=\*\*추론 과정\*\*|$)/s);
      const reasoningMatch = content.match(/\*\*추론 과정\*\*:\s*(.+?)(?=\*\*다음 단계 필요\*\*|$)/s);
      const nextStepMatch = content.match(/\*\*다음 단계 필요\*\*:\s*(true|false)/i);

      const thought = thoughtMatch ? thoughtMatch[1].trim() : content;
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '추론 과정이 명시되지 않음';
      const nextStepNeeded = nextStepMatch ? nextStepMatch[1].toLowerCase() === 'true' : stepNumber < maxSteps;

      return {
        thought,
        reasoning,
        nextStepNeeded: nextStepNeeded && stepNumber < maxSteps
      };

    } catch (error) {
      console.error(`단계 ${stepNumber} 사고 생성 오류:`, error);
      
      return {
        thought: `단계 ${stepNumber}: 이 단계에서는 "${userMessage}"에 대한 분석을 수행합니다.`,
        reasoning: '시스템 오류로 인해 기본 분석을 제공합니다.',
        nextStepNeeded: stepNumber < maxSteps
      };
    }
  }

  /**
   * 오류 시 대체 사고 과정을 생성합니다
   */
  private async generateFallbackThought(
    userMessage: string,
    stepNumber: number,
    maxSteps: number,
    previousSteps: ThinkingStep[],
    model: string
  ): Promise<{ thought: string; reasoning: string; nextStepNeeded: boolean }> {
    return {
      thought: `단계 ${stepNumber}: MCP 도구 연결 오류로 인해 기본 분석을 수행합니다. "${userMessage}"에 대한 체계적인 접근이 필요합니다.`,
      reasoning: 'MCP Sequential Thinking 서버 연결 문제로 인해 대체 분석을 제공합니다.',
      nextStepNeeded: false
    };
  }

  /**
   * 모든 사고 단계를 바탕으로 최종 답변을 생성합니다
   */
  private async generateFinalAnswer(
    userMessage: string,
    steps: ThinkingStep[],
    model: string
  ): Promise<string> {
    const thinkingProcess = steps.map(step => 
      `**단계 ${step.stepNumber}**: ${step.thought}\n*추론*: ${step.reasoning}`
    ).join('\n\n');

    const systemPrompt = `당신은 단계별 사고 과정을 완료한 후 최종 답변을 제공하는 AI입니다.

아래의 사고 과정을 바탕으로 사용자의 요청에 대한 완성되고 체계적인 답변을 제공하세요.

## 사고 과정:
${thinkingProcess}

## 지침:
1. 위의 사고 과정을 종합하여 완성된 답변을 제공하세요
2. 구체적이고 실용적인 정보를 포함하세요
3. 단계별로 도출된 결론들을 통합하세요
4. 사용자가 바로 활용할 수 있는 형태로 정리하세요
5. 한국어로 응답하세요`;

    const conversation = [
      {
        role: 'user',
        content: `다음 요청에 대한 최종 답변을 제공해주세요:

"${userMessage}"`
      }
    ];

    try {
      const response = await this.llmService.chat(conversation, {
        model,
        temperature: 0.5,
        maxTokens: 2000,
        systemInstruction: systemPrompt
      });

      if (!response.success) {
        throw new Error(response.error || 'LLM 응답 실패');
      }

      return response.content;

    } catch (error) {
      console.error('최종 답변 생성 오류:', error);
      
      // 오류 시 사고 과정 요약 제공
      return `단계별 사고 과정을 완료했지만 최종 답변 생성 중 오류가 발생했습니다.

## 사고 과정 요약:
${thinkingProcess}

위의 분석을 참고하여 문제를 해결해보세요.`;
    }
  }

  /**
   * 사고 과정을 마크다운 형태로 포맷팅합니다
   */
  private formatThinkingProcess(steps: ThinkingStep[]): string {
    const thinkingSteps = steps.map(step => 
      `### 🤔 단계 ${step.stepNumber}: 사고 과정

${step.thought}

**추론**: ${step.reasoning}

---`
    ).join('\n\n');

    return `# ✨ 단계별 사고 과정

${thinkingSteps}`;
  }

  /**
   * 완전한 결과를 마크다운으로 포맷팅합니다
   */
  formatCompleteResult(result: ProcessedThinkingResult): string {
    return `# ✨ 단계별 사고 과정

${result.thinkingProcess}

## 🎯 최종 답변

${result.finalAnswer}

---
*총 ${result.totalSteps}단계, ${Math.round(result.processingTime / 1000)}초 소요*`;
  }
}