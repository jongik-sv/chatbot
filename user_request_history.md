# 사용자 요청 기록

------


------

markdown component가 교체가 안된것 같아. 다른 컴포넌트로 바꿔줘.

지식 베이스 추가 실패: TypeError: this.embeddingService.storeEmbedding is not a function
    at ExternalContentService.addToKnowledgeBase (src\services\ExternalContentService.ts:258:38)
    at async ExternalContentService.processWebsiteContent (src\services\ExternalContentService.ts:222:8)
    at async ExternalContentService.processExternalContent (src\services\ExternalContentService.ts:333:15)
    at async POST (src\app\api\external-content\route.ts:68:19)
  256 |           const embedding = await this.embeddingService.generateEmbedding(chunk);
  257 |
> 258 |           await this.embeddingService.storeEmbedding({
      |                                      ^
  259 |             documentId,
  260 |             chunkIndex: i,
  261 |             chunkText: chunk,
 POST /api/external-content 200 in 1212ms

------

markdown component가 교체가 안된것 같아. 다른 컴포넌트로 바꿔줘.

지식 베이스 추가 실패: TypeError: this.embeddingService.storeEmbedding is not a function
    at ExternalContentService.addToKnowledgeBase (src\services\ExternalContentService.ts:258:38)
    at async ExternalContentService.processWebsiteContent (src\services\ExternalContentService.ts:222:8)
    at async ExternalContentService.processExternalContent (src\services\ExternalContentService.ts:333:15)
    at async POST (src\app\api\external-content\route.ts:68:19)
  256 |           const embedding = await this.embeddingService.generateEmbedding(chunk);
  257 |
> 258 |           await this.embeddingService.storeEmbedding({
      |                                      ^
  259 |             documentId,
  260 |             chunkIndex: i,
  261 |             chunkText: chunk,
 POST /api/external-content 200 in 1212ms

------

외부 콘텐츠 관리에서 콘텐츠 추가를 해서 웹사이트나 유튜브 주소를 넣으면 저장을 안하는 것 같아.

------

저장은 하는데 리스트가 안보이나봐

------

외부 콘텐츠 처리 실패: TypeError: getInstance is not a function
    at getJavaScriptExternalContentService (src\app\api\external-content\route.ts:7:9)
    at POST (src\app\api\external-content\route.ts:34:22)
   5 | function getJavaScriptExternalContentService() {
   6 |   const { getInstance } = require('../../../services/ExternalContentService');
>  7 |   return getInstance();
     |         ^
   8 | }
   9 |
  10 | export async function POST(request: NextRequest) {
오류 스택: TypeError: getInstance is not a function
    at getJavaScriptExternalContentService (C:\project\chatbot\ai-chatbot-mentor\.next\server\chunks\[root-of-the-server]__74b0da67._.js:2038:12)
    at POST (C:\project\chatbot\ai-chatbot-mentor\.next\server\chunks\[root-of-the-server]__74b0da67._.js:2063:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async AppRouteRouteModule.do (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:38782)
    at async AppRouteRouteModule.handle (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:5:45984)
    at async responseGenerator (C:\project\chatbot\ai-chatbot-mentor\.next\server\chunks\node_modules_next_6cef41d5._.js:12864:38)
    at async AppRouteRouteModule.handleResponse (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\compiled\next-server\app-route-turbo.runtime.dev.js:1:183725)
    at async handleResponse (C:\project\chatbot\ai-chatbot-mentor\.next\server\chunks\node_modules_next_6cef41d5._.js:12926:32)
    at async handler (C:\project\chatbot\ai-chatbot-mentor\.next\server\chunks\node_modules_next_6cef41d5._.js:12978:13)
    at async doRender (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\base-server.js:1586:34)
    at async DevServer.renderToResponseWithComponentsImpl (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\base-server.js:1928:13)
    at async DevServer.renderPageComponent (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\base-server.js:2394:24)
    at async DevServer.renderToResponseImpl (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\base-server.js:2434:32)
    at async DevServer.pipeImpl (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\base-server.js:1034:25)
    at async NextNodeServer.handleCatchallRenderRequest (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\next-server.js:393:17)
    at async DevServer.handleRequestImpl (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\base-server.js:925:17)
    at async C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\dev\next-dev-server.js:398:20
    at async Span.traceAsyncFn (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\trace\trace.js:157:20)
    at async DevServer.handleRequest (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\dev\next-dev-server.js:394:24)
    at async invokeRender (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\lib\router-server.js:239:21)
    at async handleRequest (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\lib\router-server.js:436:24)
    at async requestHandlerImpl (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\lib\router-server.js:464:13)
    at async Server.requestListener (C:\project\chatbot\ai-chatbot-mentor\node_modules\next\dist\server\lib\start-server.js:218:13)
 POST /api/external-content 500 in 126ms

------

청크가 너무 크게 나누어 지는것 같아. 1000 정도로 나누자.

------