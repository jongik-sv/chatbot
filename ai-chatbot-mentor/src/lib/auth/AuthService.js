/**
 * 인증 서비스 - JWT 토큰 기반 인증 시스템
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDatabase } = require('../database/db');

class AuthService {
  constructor() {
    this.db = getDatabase();
    this.jwtSecret = process.env.JWT_SECRET || this.generateDefaultSecret();
    this.tokenExpiry = process.env.JWT_EXPIRY || '7d';
    this.maxFailedAttempts = parseInt(process.env.MAX_FAILED_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
  }

  /**
   * 기본 JWT 비밀키 생성 (환경변수가 없을 때)
   */
  generateDefaultSecret() {
    console.warn('JWT_SECRET 환경변수가 설정되지 않았습니다. 기본 비밀키를 생성합니다.');
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * 비밀번호 해시 생성
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * 비밀번호 검증
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * JWT 토큰 생성
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      issuer: 'ai-chatbot-mentor'
    });
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('토큰이 만료되었습니다.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('유효하지 않은 토큰입니다.');
      }
      throw error;
    }
  }

  /**
   * 사용자 등록
   */
  async register(userData) {
    const { username, email, password, mbtiType } = userData;

    // 입력 유효성 검사
    if (!username || username.length < 3) {
      throw new Error('사용자명은 3글자 이상이어야 합니다.');
    }

    if (!email || !this.isValidEmail(email)) {
      throw new Error('유효한 이메일 주소를 입력해주세요.');
    }

    if (!password || password.length < 8) {
      throw new Error('비밀번호는 8글자 이상이어야 합니다.');
    }

    // 중복 검사
    const existingUser = this.db.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).get(username, email);

    if (existingUser) {
      throw new Error('이미 존재하는 사용자명 또는 이메일입니다.');
    }

    // 비밀번호 해시
    const passwordHash = await this.hashPassword(password);

    // 사용자 생성
    const result = this.db.prepare(`
      INSERT INTO users (username, email, password_hash, mbti_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(username, email, passwordHash, mbtiType || null);

    // 생성된 사용자 정보 반환 (비밀번호 제외)
    const newUser = this.db.prepare(`
      SELECT id, username, email, mbti_type, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    return newUser;
  }

  /**
   * 사용자 로그인
   */
  async login(credentials, deviceInfo = {}) {
    const { username, password } = credentials;

    if (!username || !password) {
      throw new Error('사용자명과 비밀번호를 입력해주세요.');
    }

    // 사용자 조회 (이메일 또는 사용자명으로 로그인 가능)
    const user = this.db.prepare(`
      SELECT id, username, email, password_hash, failed_login_attempts, locked_until
      FROM users 
      WHERE username = ? OR email = ?
    `).get(username, username);

    if (!user) {
      throw new Error('존재하지 않는 사용자입니다.');
    }

    // 계정 잠금 확인
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const lockEndTime = new Date(user.locked_until).toLocaleString('ko-KR');
      throw new Error(`계정이 잠겼습니다. ${lockEndTime}까지 로그인할 수 없습니다.`);
    }

    // 비밀번호 검증
    const isPasswordValid = await this.verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id);
      throw new Error('잘못된 비밀번호입니다.');
    }

    // 로그인 성공 처리
    await this.handleSuccessfulLogin(user.id);

    // 세션 생성
    const token = this.generateToken(user);
    await this.createSession(user.id, token, deviceInfo);

    // 사용자 정보 반환 (비밀번호 제외)
    const { password_hash, failed_login_attempts, locked_until, ...userInfo } = user;
    
    return {
      user: userInfo,
      token
    };
  }

  /**
   * 로그인 실패 처리
   */
  async handleFailedLogin(userId) {
    const user = this.db.prepare(`
      SELECT failed_login_attempts FROM users WHERE id = ?
    `).get(userId);

    const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
    let lockUntil = null;

    // 최대 시도 횟수 초과 시 계정 잠금
    if (newFailedAttempts >= this.maxFailedAttempts) {
      lockUntil = new Date(Date.now() + this.lockoutDuration * 60 * 1000).toISOString();
    }

    this.db.prepare(`
      UPDATE users 
      SET failed_login_attempts = ?, locked_until = ?
      WHERE id = ?
    `).run(newFailedAttempts, lockUntil, userId);
  }

  /**
   * 로그인 성공 처리
   */
  async handleSuccessfulLogin(userId) {
    this.db.prepare(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(userId);
  }

  /**
   * 세션 생성
   */
  async createSession(userId, token, deviceInfo = {}) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일

    this.db.prepare(`
      INSERT INTO user_sessions 
      (user_id, token_hash, expires_at, device_info, ip_address, created_at, last_used)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      userId,
      tokenHash,
      expiresAt.toISOString(),
      JSON.stringify(deviceInfo),
      deviceInfo.ipAddress || null
    );
  }

  /**
   * 세션 검증 및 갱신
   */
  async validateSession(token) {
    try {
      // JWT 토큰 검증
      const decoded = this.verifyToken(token);
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // 데이터베이스에서 세션 확인
      const session = this.db.prepare(`
        SELECT s.*, u.id, u.username, u.email
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ? AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP
      `).get(tokenHash);

      if (!session) {
        throw new Error('유효하지 않은 세션입니다.');
      }

      // 마지막 사용 시간 업데이트
      this.db.prepare(`
        UPDATE user_sessions SET last_used = CURRENT_TIMESTAMP WHERE id = ?
      `).run(session.id);

      return {
        userId: session.user_id,
        username: session.username,
        email: session.email
      };
    } catch (error) {
      throw new Error(`세션 검증 실패: ${error.message}`);
    }
  }

  /**
   * 로그아웃 (세션 무효화)
   */
  async logout(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    this.db.prepare(`
      UPDATE user_sessions SET is_active = FALSE WHERE token_hash = ?
    `).run(tokenHash);
  }

  /**
   * 모든 세션 로그아웃
   */
  async logoutAllSessions(userId) {
    this.db.prepare(`
      UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?
    `).run(userId);
  }

  /**
   * 만료된 세션 정리
   */
  async cleanupExpiredSessions() {
    const result = this.db.prepare(`
      DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP
    `).run();

    console.log(`만료된 세션 ${result.changes}개를 정리했습니다.`);
    return result.changes;
  }

  /**
   * 사용자 세션 목록 조회
   */
  async getUserSessions(userId) {
    return this.db.prepare(`
      SELECT id, device_info, ip_address, created_at, last_used, is_active
      FROM user_sessions 
      WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_used DESC
    `).all(userId);
  }

  /**
   * 이메일 유효성 검사
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 비밀번호 강도 검사
   */
  validatePasswordStrength(password) {
    const rules = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(rules).filter(Boolean).length;
    
    return {
      isValid: score >= 3, // 최소 3개 조건 만족
      score,
      rules,
      message: this.getPasswordStrengthMessage(score)
    };
  }

  /**
   * 비밀번호 강도 메시지
   */
  getPasswordStrengthMessage(score) {
    const messages = {
      0: '매우 약함',
      1: '약함',
      2: '보통',
      3: '강함',
      4: '매우 강함',
      5: '최강'
    };
    return messages[score] || '알 수 없음';
  }
}

module.exports = AuthService;