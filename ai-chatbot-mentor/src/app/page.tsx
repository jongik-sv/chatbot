export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          AI 챗봇 멘토
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8">
          멀티모달 AI 기술을 활용한 개인화된 멘토링 서비스
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3">🤖 다양한 AI 모델</h3>
            <p className="text-gray-600">Ollama와 Google Gemini를 활용한 최적의 AI 경험</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3">📚 문서 기반 학습</h3>
            <p className="text-gray-600">개인 문서를 업로드하여 맞춤형 지식 기반 대화</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3">🎯 개인화된 멘토</h3>
            <p className="text-gray-600">MBTI 기반 성격별 맞춤 멘토링 서비스</p>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-gray-500">
            프로젝트 초기 설정이 완료되었습니다.
          </p>
          <p className="text-sm text-gray-400">
            다음 단계: 데이터베이스 스키마 및 연결 설정
          </p>
        </div>
      </div>
    </div>
  );
}
