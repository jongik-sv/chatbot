import { artifactFileManager } from './ArtifactFileManager';
import { getDatabase } from '@/lib/database';
import path from 'path';
import { promises as fs } from 'fs';

export interface CleanupOptions {
  daysOld?: number; // 며칠 이상 된 파일 삭제 (기본: 7일)
  maxSizeGB?: number; // 최대 저장 용량 (기본: 5GB)
  dryRun?: boolean; // 실제 삭제 없이 테스트만
}

export interface CleanupResult {
  deletedArtifacts: number;
  deletedSessions: number;
  freedSpaceBytes: number;
  errors: string[];
}

export class ArtifactCleanupService {
  private static readonly DEFAULT_MAX_AGE_DAYS = 7;
  private static readonly DEFAULT_MAX_SIZE_GB = 5;
  private static readonly BYTES_PER_GB = 1024 * 1024 * 1024;

  /**
   * 오래된 아티팩트 자동 정리
   */
  static async cleanupOldArtifacts(options: CleanupOptions = {}): Promise<CleanupResult> {
    const {
      daysOld = this.DEFAULT_MAX_AGE_DAYS,
      maxSizeGB = this.DEFAULT_MAX_SIZE_GB,
      dryRun = false
    } = options;

    const result: CleanupResult = {
      deletedArtifacts: 0,
      deletedSessions: 0,
      freedSpaceBytes: 0,
      errors: []
    };

    try {
      const db = await getDatabase();
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

      // 오래된 아티팩트 찾기 (데이터베이스 기준)
      const oldArtifacts = await db.all(`
        SELECT id, session_id, file_path, created_at
        FROM artifacts 
        WHERE datetime(created_at) < datetime(?, 'unixepoch')
        ORDER BY created_at ASC
      `, [cutoffTime / 1000]);

      console.log(`🗑️ ${oldArtifacts.length}개의 오래된 아티팩트를 찾았습니다 (${daysOld}일 이상)`);

      for (const artifact of oldArtifacts) {
        try {
          if (!dryRun) {
            // 파일 시스템에서 삭제
            await artifactFileManager.deleteArtifact(
              artifact.session_id.toString(),
              artifact.id.toString()
            );

            // 데이터베이스에서 삭제
            await db.run('DELETE FROM artifacts WHERE id = ?', [artifact.id]);
          }

          result.deletedArtifacts++;
          result.freedSpaceBytes += await this.calculateArtifactSize(
            artifact.session_id.toString(),
            artifact.id.toString()
          );

        } catch (error) {
          const errorMsg = `아티팩트 ${artifact.id} 삭제 실패: ${error}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 빈 세션 디렉토리 정리
      const cleanedSessions = await this.cleanupEmptySessions(dryRun);
      result.deletedSessions = cleanedSessions;

      // 용량 제한 확인 및 추가 정리
      const currentSize = await this.getTotalArtifactSize();
      const maxSizeBytes = maxSizeGB * this.BYTES_PER_GB;

      if (currentSize > maxSizeBytes) {
        console.log(`📦 현재 크기 ${this.formatBytes(currentSize)}가 제한 ${this.formatBytes(maxSizeBytes)}를 초과합니다`);
        
        const additionalCleanup = await this.cleanupBySize(
          currentSize - maxSizeBytes,
          dryRun
        );
        
        result.deletedArtifacts += additionalCleanup.deletedArtifacts;
        result.freedSpaceBytes += additionalCleanup.freedSpaceBytes;
        result.errors.push(...additionalCleanup.errors);
      }

      console.log(`✅ 정리 완료: ${result.deletedArtifacts}개 아티팩트, ${result.deletedSessions}개 세션, ${this.formatBytes(result.freedSpaceBytes)} 확보`);

    } catch (error) {
      const errorMsg = `정리 작업 실패: ${error}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);
    }

    return result;
  }

  /**
   * 특정 세션의 모든 아티팩트 삭제
   */
  static async cleanupSession(sessionId: string, dryRun: boolean = false): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedArtifacts: 0,
      deletedSessions: 0,
      freedSpaceBytes: 0,
      errors: []
    };

    try {
      const db = await getDatabase();

      // 세션의 모든 아티팩트 조회
      const artifacts = await db.all(`
        SELECT id, file_path 
        FROM artifacts 
        WHERE session_id = ?
      `, [sessionId]);

      for (const artifact of artifacts) {
        try {
          const artifactSize = await this.calculateArtifactSize(sessionId, artifact.id.toString());

          if (!dryRun) {
            // 파일 시스템에서 삭제
            await artifactFileManager.deleteArtifact(sessionId, artifact.id.toString());

            // 데이터베이스에서 삭제
            await db.run('DELETE FROM artifacts WHERE id = ?', [artifact.id]);
          }

          result.deletedArtifacts++;
          result.freedSpaceBytes += artifactSize;

        } catch (error) {
          const errorMsg = `아티팩트 ${artifact.id} 삭제 실패: ${error}`;
          result.errors.push(errorMsg);
        }
      }

      if (!dryRun && result.deletedArtifacts > 0) {
        // 세션 디렉토리 삭제
        try {
          await artifactFileManager.deleteSessionArtifacts(sessionId);
          result.deletedSessions = 1;
        } catch (error) {
          result.errors.push(`세션 ${sessionId} 디렉토리 삭제 실패: ${error}`);
        }
      }

    } catch (error) {
      result.errors.push(`세션 ${sessionId} 정리 실패: ${error}`);
    }

    return result;
  }

  /**
   * 용량 기준으로 오래된 아티팩트부터 삭제
   */
  private static async cleanupBySize(
    targetBytes: number,
    dryRun: boolean
  ): Promise<Partial<CleanupResult>> {
    const result = {
      deletedArtifacts: 0,
      freedSpaceBytes: 0,
      errors: [] as string[]
    };

    try {
      const db = await getDatabase();

      // 오래된 아티팩트부터 정렬하여 조회
      const artifacts = await db.all(`
        SELECT id, session_id, file_path, created_at
        FROM artifacts 
        ORDER BY created_at ASC
      `);

      let totalFreed = 0;

      for (const artifact of artifacts) {
        if (totalFreed >= targetBytes) break;

        try {
          const artifactSize = await this.calculateArtifactSize(
            artifact.session_id.toString(),
            artifact.id.toString()
          );

          if (!dryRun) {
            await artifactFileManager.deleteArtifact(
              artifact.session_id.toString(),
              artifact.id.toString()
            );

            await db.run('DELETE FROM artifacts WHERE id = ?', [artifact.id]);
          }

          result.deletedArtifacts++;
          result.freedSpaceBytes += artifactSize;
          totalFreed += artifactSize;

        } catch (error) {
          result.errors.push(`아티팩트 ${artifact.id} 크기 기준 삭제 실패: ${error}`);
        }
      }

    } catch (error) {
      result.errors.push(`크기 기준 정리 실패: ${error}`);
    }

    return result;
  }

  /**
   * 빈 세션 디렉토리 정리
   */
  private static async cleanupEmptySessions(dryRun: boolean): Promise<number> {
    let cleanedCount = 0;

    try {
      const artifactsBasePath = path.join(process.cwd(), 'data', 'artifacts');
      const sessions = await fs.readdir(artifactsBasePath);

      for (const session of sessions) {
        if (!session.startsWith('session_')) continue;

        const sessionPath = path.join(artifactsBasePath, session);
        
        try {
          const artifacts = await fs.readdir(sessionPath);
          
          if (artifacts.length === 0) {
            if (!dryRun) {
              await fs.rmdir(sessionPath);
            }
            cleanedCount++;
          }
        } catch (error) {
          console.warn(`세션 디렉토리 ${session} 확인 실패:`, error);
        }
      }

    } catch (error) {
      console.error('빈 세션 디렉토리 정리 실패:', error);
    }

    return cleanedCount;
  }

  /**
   * 아티팩트 크기 계산
   */
  private static async calculateArtifactSize(sessionId: string, artifactId: string): Promise<number> {
    try {
      const artifactPath = path.join(
        process.cwd(), 
        'data', 
        'artifacts', 
        `session_${sessionId}`, 
        `artifact_${artifactId}`
      );

      const files = await fs.readdir(artifactPath);
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(artifactPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return totalSize;

    } catch (error) {
      return 0; // 파일이 없거나 액세스할 수 없는 경우
    }
  }

  /**
   * 전체 아티팩트 저장소 크기 계산
   */
  private static async getTotalArtifactSize(): Promise<number> {
    try {
      const artifactsBasePath = path.join(process.cwd(), 'data', 'artifacts');
      return await this.calculateDirectorySize(artifactsBasePath);
    } catch (error) {
      console.error('전체 아티팩트 크기 계산 실패:', error);
      return 0;
    }
  }

  /**
   * 디렉토리 크기 계산 (재귀)
   */
  private static async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          totalSize += await this.calculateDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // 디렉토리가 없거나 접근 불가능한 경우 무시
    }

    return totalSize;
  }

  /**
   * 바이트를 읽기 쉬운 형식으로 변환
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 정리 작업 상태 조회
   */
  static async getCleanupStatus(): Promise<{
    totalArtifacts: number;
    totalSessions: number;
    totalSizeBytes: number;
    oldestArtifactDate: string | null;
    newestArtifactDate: string | null;
  }> {
    try {
      const db = await getDatabase();

      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_artifacts,
          COUNT(DISTINCT session_id) as total_sessions,
          MIN(created_at) as oldest_date,
          MAX(created_at) as newest_date
        FROM artifacts
      `);

      const totalSize = await this.getTotalArtifactSize();

      return {
        totalArtifacts: stats.total_artifacts || 0,
        totalSessions: stats.total_sessions || 0,
        totalSizeBytes: totalSize,
        oldestArtifactDate: stats.oldest_date,
        newestArtifactDate: stats.newest_date
      };

    } catch (error) {
      console.error('정리 상태 조회 실패:', error);
      return {
        totalArtifacts: 0,
        totalSessions: 0,
        totalSizeBytes: 0,
        oldestArtifactDate: null,
        newestArtifactDate: null
      };
    }
  }
}

// 스케줄러를 위한 자동 정리 함수
export async function scheduleCleanup() {
  console.log('🧹 아티팩트 자동 정리 작업 시작...');
  
  const result = await ArtifactCleanupService.cleanupOldArtifacts({
    daysOld: 7,
    maxSizeGB: 5,
    dryRun: false
  });

  if (result.errors.length > 0) {
    console.error('정리 작업 중 오류 발생:', result.errors);
  }

  return result;
}