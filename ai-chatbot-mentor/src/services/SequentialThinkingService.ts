// Sequential Thinking Service - 단계별 사고 과정 구현
import { LLMService } from './LLMService';

interface ThinkingStep {
  stepNumber: number;
  thought: string;
  reasoning: string;
  nextStepNeeded: boolean;
}

interface ThinkingResult {
  steps: ThinkingStep[];
  finalAnswer: string;
  totalSteps: number;
  processingTime: number;
}

export class SequentialThinkingService {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  /**
   * 단계별 사고 과정을 실행합니다
   */
  async executeThinking(
    userMessage: string,
    maxSteps: number = 5,
    model: string = 'gemini-2.0-flash-exp'
  ): Promise<ThinkingResult> {
    const startTime = Date.now();
    const steps: ThinkingStep[] = [];
    let currentStep = 1;
    let previousThoughts = '';

    // 초기 분석 단계
    while (currentStep <= maxSteps) {
      const stepResult = await this.executeThinkingStep(
        userMessage,
        currentStep,
        maxSteps,
        previousThoughts,
        model
      );

      steps.push(stepResult);
      previousThoughts += `\n\n**단계 ${currentStep}**: ${stepResult.thought}`;

      if (!stepResult.nextStepNeeded) {
        break;
      }

      currentStep++;
    }

    // 최종 답변 생성
    const finalAnswer = await this.generateFinalAnswer(
      userMessage,
      steps,
      model
    );

    const processingTime = Date.now() - startTime;

    return {
      steps,
      finalAnswer,
      totalSteps: steps.length,
      processingTime
    };
  }

  /**
   * 개별 사고 단계를 실행합니다
   */
  private async executeThinkingStep(
    userMessage: string,
    stepNumber: number,
    maxSteps: number,
    previousThoughts: string,
    model: string
  ): Promise<ThinkingStep> {
    const systemPrompt = `당신은 단계별 사고 과정을 수행하는 AI입니다.

사용자의 요청을 분석하고, 현재 단계(${stepNumber}/${maxSteps})에서 수행해야 할 구체적인 사고를 제시하세요.

## 지침:
1. 현재 단계에서만 집중하여 생각하세요
2. 구체적이고 실용적인 분석을 제공하세요
3. 다음 단계가 필요한지 판단하세요
4. 각 단계는 이전 단계를 바탕으로 발전시키세요

## 이전 사고 과정:
${previousThoughts || '(첫 번째 단계입니다)'}

## 응답 형식:
**현재 단계 사고**: [이 단계에서의 구체적인 분석이나 계획]
**추론 과정**: [왜 이렇게 생각했는지에 대한 설명]
**다음 단계 필요**: [true/false - 더 분석이 필요한지]`;

    const conversation = [
      {
        role: 'user',
        content: `다음 요청에 대해 단계 ${stepNumber}에서 수행할 사고를 제시해주세요:

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
      const thoughtMatch = content.match(/\*\*현재 단계 사고\*\*:\s*(.+?)(?=\*\*추론 과정\*\*|$)/s);
      const reasoningMatch = content.match(/\*\*추론 과정\*\*:\s*(.+?)(?=\*\*다음 단계 필요\*\*|$)/s);
      const nextStepMatch = content.match(/\*\*다음 단계 필요\*\*:\s*(true|false)/i);

      const thought = thoughtMatch ? thoughtMatch[1].trim() : content;
      const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '추론 과정이 명시되지 않음';
      const nextStepNeeded = nextStepMatch ? nextStepMatch[1].toLowerCase() === 'true' : stepNumber < maxSteps;

      return {
        stepNumber,
        thought,
        reasoning,
        nextStepNeeded: nextStepNeeded && stepNumber < maxSteps
      };

    } catch (error) {
      console.error(`사고 단계 ${stepNumber} 실행 오류:`, error);
      
      // 오류 시 기본 응답
      return {
        stepNumber,
        thought: `단계 ${stepNumber}: 사고 과정 실행 중 오류가 발생했습니다.`,
        reasoning: '시스템 오류로 인해 이 단계를 건너뜁니다.',
        nextStepNeeded: stepNumber < maxSteps
      };
    }
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

아래의 사고 과정을 바탕으로 사용자의 요청에 대한 완성된 답변을 제공하세요.

## 사고 과정:
${thinkingProcess}

## 지침:
1. 위의 사고 과정을 종합하여 완성된 답변을 제공하세요
2. 구체적이고 실용적인 정보를 포함하세요
3. 단계별로 도출된 결론들을 통합하세요
4. 사용자가 바로 활용할 수 있는 형태로 정리하세요`;

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
  formatThinkingProcess(result: ThinkingResult): string {
    const thinkingSteps = result.steps.map(step => 
      `### 🤔 단계 ${step.stepNumber}: 사고 과정

${step.thought}

**추론**: ${step.reasoning}

---`
    ).join('\n\n');

    return `# ✨ 단계별 사고 과정

${thinkingSteps}

## 🎯 최종 답변

${result.finalAnswer}

---
*총 ${result.totalSteps}단계, ${Math.round(result.processingTime / 1000)}초 소요*`;
  }
}