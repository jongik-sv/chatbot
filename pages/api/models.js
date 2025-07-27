/**
 * 모델 관리 API 엔드포인트
 * 사용 가능한 LLM 모델 목록 조회 및 관리
 */

const LLMService = require('../../services/LLMService');

const llmService = new LLMService();

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetModels(req, res);
        break;
      case 'POST':
        await handleModelAction(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({
          success: false,
          error: 'Method Not Allowed'
        });
        break;
    }
  } catch (error) {
    console.error('모델 API 오류:', error);
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 사용 가능한 모델 목록 조회
 */
async function handleGetModels(req, res) {
  const { provider, type, capabilities } = req.query;

  try {
    // 모든 모델 조회
    const result = await llmService.getAllAvailableModels();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: '모델 목록 조회 실패',
        details: result.error
      });
    }

    let filteredModels = result.models;

    // 제공자별 필터링
    if (provider) {
      filteredModels = filteredModels.filter(model => 
        model.provider === provider
      );
    }

    // 타입별 필터링 (text, multimodal)
    if (type) {
      if (type === 'multimodal') {
        filteredModels = filteredModels.filter(model => 
          model.capabilities?.multimodal === true
        );
      } else if (type === 'text') {
        filteredModels = filteredModels.filter(model => 
          model.capabilities?.text === true
        );
      }
    }

    // 특정 기능별 필터링
    if (capabilities) {
      const requiredCapabilities = capabilities.split(',');
      filteredModels = filteredModels.filter(model => {
        return requiredCapabilities.every(cap => 
          model.capabilities?.[cap] === true
        );
      });
    }

    // 서비스 상태 확인
    const serviceStatus = await llmService.checkAllServices();

    res.status(200).json({
      success: true,
      models: filteredModels,
      count: filteredModels.length,
      providers: result.providers,
      serviceStatus,
      filters: {
        provider,
        type,
        capabilities
      }
    });

  } catch (error) {
    console.error('모델 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '모델 목록 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}

/**
 * 모델 관련 액션 처리
 */
async function handleModelAction(req, res) {
  const { action, modelId, provider } = req.body;

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'action 파라미터가 필요합니다.'
    });
  }

  try {
    switch (action) {
      case 'check':
        await handleCheckModel(req, res, modelId, provider);
        break;
      case 'test':
        await handleTestModel(req, res, modelId, provider);
        break;
      case 'pull':
        await handlePullModel(req, res, modelId);
        break;
      case 'delete':
        await handleDeleteModel(req, res, modelId);
        break;
      default:
        res.status(400).json({
          success: false,
          error: `지원되지 않는 액션: ${action}`
        });
        break;
    }
  } catch (error) {
    console.error(`모델 액션 (${action}) 오류:`, error);
    res.status(500).json({
      success: false,
      error: `모델 ${action} 중 오류가 발생했습니다.`,
      details: error.message
    });
  }
}

/**
 * 특정 모델 상태 확인
 */
async function handleCheckModel(req, res, modelId, provider) {
  if (!modelId) {
    return res.status(400).json({
      success: false,
      error: 'modelId가 필요합니다.'
    });
  }

  const targetProvider = provider || llmService.getModelProvider(modelId);
  const service = targetProvider === 'gemini' ? llmService.gemini : llmService.ollama;

  // 연결 상태 확인
  const connectionStatus = await service.checkConnection();
  
  // 모델 목록에서 해당 모델 찾기
  const modelsResult = await service.getAvailableModels();
  const modelExists = modelsResult.success && 
    modelsResult.models.some(model => model.id === modelId);

  res.status(200).json({
    success: true,
    modelId,
    provider: targetProvider,
    available: modelExists,
    serviceConnected: connectionStatus.connected,
    details: {
      connectionStatus,
      modelExists
    }
  });
}

/**
 * 모델 테스트
 */
async function handleTestModel(req, res, modelId, provider) {
  if (!modelId) {
    return res.status(400).json({
      success: false,
      error: 'modelId가 필요합니다.'
    });
  }

  const testPrompt = 'Hello! Please respond with a brief greeting.';
  
  try {
    const result = await llmService.generateText(testPrompt, {
      model: modelId,
      provider,
      maxTokens: 100,
      temperature: 0.7,
      fallback: false // 테스트에서는 폴백 사용 안 함
    });

    res.status(200).json({
      success: true,
      modelId,
      provider: result.provider,
      testResult: {
        success: result.success,
        response: result.content,
        error: result.error
      },
      performance: {
        // 실제로는 응답 시간 등 측정
        responseTime: null
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      modelId,
      error: '모델 테스트 실패',
      details: error.message
    });
  }
}

/**
 * Ollama 모델 다운로드
 */
async function handlePullModel(req, res, modelId) {
  if (!modelId) {
    return res.status(400).json({
      success: false,
      error: 'modelId가 필요합니다.'
    });
  }

  // Ollama 모델만 다운로드 가능
  if (llmService.getModelProvider(modelId) !== 'ollama') {
    return res.status(400).json({
      success: false,
      error: 'Ollama 모델만 다운로드할 수 있습니다.'
    });
  }

  try {
    // SSE (Server-Sent Events)로 진행 상황 스트리밍
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const result = await llmService.ollama.pullModel(
      modelId,
      (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    res.write(`data: ${JSON.stringify({
      success: result.success,
      message: result.message || result.error,
      completed: true
    })}\n\n`);
    
    res.end();

  } catch (error) {
    res.write(`data: ${JSON.stringify({
      success: false,
      error: error.message,
      completed: true
    })}\n\n`);
    res.end();
  }
}

/**
 * Ollama 모델 삭제
 */
async function handleDeleteModel(req, res, modelId) {
  if (!modelId) {
    return res.status(400).json({
      success: false,
      error: 'modelId가 필요합니다.'
    });
  }

  // Ollama 모델만 삭제 가능
  if (llmService.getModelProvider(modelId) !== 'ollama') {
    return res.status(400).json({
      success: false,
      error: 'Ollama 모델만 삭제할 수 있습니다.'
    });
  }

  try {
    const result = await llmService.ollama.deleteModel(modelId);

    res.status(200).json({
      success: result.success,
      modelId,
      message: result.message || result.error
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      modelId,
      error: '모델 삭제 실패',
      details: error.message
    });
  }
}