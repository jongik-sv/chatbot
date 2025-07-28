/**
 * 인증 미들웨어 - JWT 토큰 검증 및 사용자 인증
 */

const AuthService = require('../auth/AuthService');

/**
 * JWT 토큰을 검증하는 미들웨어
 */
async function authenticateToken(req) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      throw new Error('인증 토큰이 제공되지 않았습니다.');
    }

    // 토큰 검증 및 사용자 정보 추출
    const authService = new AuthService();
    const user = await authService.validateSession(token);

    return user;
  } catch (error) {
    throw new Error(`인증 실패: ${error.message}`);
  }
}

/**
 * API Route에서 사용할 인증 헬퍼
 */
async function requireAuth(req) {
  const user = await authenticateToken(req);
  if (!user) {
    throw new Error('인증이 필요합니다.');
  }
  return user;
}

/**
 * 선택적 인증 - 토큰이 있으면 검증하고, 없으면 null 반환
 */
async function optionalAuth(req) {
  try {
    return await authenticateToken(req);
  } catch (error) {
    return null;
  }
}

/**
 * 관리자 권한 확인 (추후 구현)
 */
async function requireAdmin(req) {
  const user = await requireAuth(req);
  
  // 추후 users 테이블에 role 필드 추가 후 구현
  // if (user.role !== 'admin') {
  //   throw new Error('관리자 권한이 필요합니다.');
  // }
  
  return user;
}

/**
 * 클라이언트 IP 주소 추출
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] 
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || req.socket?.remoteAddress
    || req.ip
    || 'unknown';
}

/**
 * 디바이스 정보 추출
 */
function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  
  return {
    userAgent,
    ipAddress: getClientIP(req),
    timestamp: new Date().toISOString()
  };
}

/**
 * 요청 제한 (Rate Limiting) - 간단한 구현
 */
const requestCounts = new Map();

function rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) { // 15분에 100회
  return (req) => {
    const ip = getClientIP(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // IP별 요청 기록 가져오기
    let requests = requestCounts.get(ip) || [];
    
    // 시간 윈도우 밖의 요청들 제거
    requests = requests.filter(time => time > windowStart);
    
    // 현재 요청 추가
    requests.push(now);
    requestCounts.set(ip, requests);

    // 제한 확인
    if (requests.length > maxRequests) {
      throw new Error('요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }

    return true;
  };
}

/**
 * Next.js API Route용 인증 래퍼
 */
function withAuth(handler, options = {}) {
  return async (req, res) => {
    try {
      // Rate Limiting 적용
      if (options.rateLimit !== false) {
        const limiter = rateLimit(options.maxRequests, options.windowMs);
        limiter(req);
      }

      // 인증 확인
      let user = null;
      if (options.required !== false) {
        user = await requireAuth(req);
      } else {
        user = await optionalAuth(req);
      }

      // 요청 객체에 사용자 정보 추가
      req.user = user;
      req.deviceInfo = getDeviceInfo(req);

      // 실제 핸들러 호출
      return await handler(req, res);
    } catch (error) {
      console.error('인증 미들웨어 오류:', error);
      
      // 인증 오류 응답
      const statusCode = error.message.includes('인증') ? 401 : 
                        error.message.includes('권한') ? 403 : 
                        error.message.includes('요청 횟수') ? 429 : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  };
}

/**
 * 관리자 전용 API Route 래퍼
 */
function withAdminAuth(handler, options = {}) {
  return withAuth(async (req, res) => {
    try {
      // 관리자 권한 확인
      req.user = await requireAdmin(req);
      return await handler(req, res);
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }
  }, { ...options, required: true });
}

module.exports = {
  authenticateToken,
  requireAuth,
  optionalAuth,
  requireAdmin,
  getClientIP,
  getDeviceInfo,
  rateLimit,
  withAuth,
  withAdminAuth
};