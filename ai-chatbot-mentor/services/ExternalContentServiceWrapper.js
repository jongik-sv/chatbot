// ExternalContentService JavaScript wrapper
const path = require('path');

// 프로젝트 루트의 services 디렉토리에서 ExternalContentService 로드
const servicePath = path.resolve(__dirname, '..', '..', 'services', 'ExternalContentService.js');
console.log('래퍼에서 로드하는 서비스 경로:', servicePath);

const { getInstance } = require(servicePath);

module.exports = {
  getInstance
};