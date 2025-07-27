/**
 * 데이터베이스 설정 파일
 * 환경별 데이터베이스 구성 관리
 */

const path = require('path');

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'chatbot.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  },

  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  },

  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'chatbot.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  }
};

module.exports = config;

// 현재 환경에 맞는 설정 반환
module.exports.current = config[process.env.NODE_ENV || 'development'];