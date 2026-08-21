import React, { useState, useEffect } from 'react';

interface Reply {
  id: string;
  text: string;
  timestamp?: string;
  username?: string;
  threadId?: string;
  threadText?: string;
  threadPermalink?: string;
}

interface Thread {
  id: string;
  text: string;
}

export default function AdminPanel() {
  // Pre-fill draft from URL query param (used when clicking the Discord deep-link)
  const urlParams = new URLSearchParams(window.location.search);
  const draftFromUrl = urlParams.get('draft') || '';

  const [draft, setDraft] = useState(draftFromUrl);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('empathy');

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const uploadImageToImgbb = async (file: File): Promise<string> => {
    const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!imgbbKey) throw new Error("VITE_IMGBB_API_KEY 환경변수가 없습니다.");
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error?.message || "이미지 업로드 실패");
    return data.data.url;
  };

  // Navigation & Pagination states
  const [mainTab, setMainTab] = useState<'write' | 'comments'>('write');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Replies states
  const [recentThread, setRecentThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isFetchingReplies, setIsFetchingReplies] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  const generateDraft = async (fromComment?: { text: string; threadText?: string }) => {
    setIsGenerating(true);
    setMessage('');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing");

      let topicInstruction = '';
      if (fromComment) {
        topicInstruction = `[이전 포스팅의 반응 대박 댓글을 기반으로 한 2차 연계 포스팅 기획]
- 내 원글: "${fromComment.threadText || ''}"
- 유저가 남긴 반응 대박 댓글: "${fromComment.text}"

이 유저 댓글에서 파생된 연애/데이트 고민, MBTI 성향 차이, 서운함 또는 억울한 썰을 주제로 삼아, 다른 스레드 유저들이 또다시 폭발적으로 참견하고 댓글을 달 수밖에 없는 새로운 스레드 포스팅 1개를 작성해주세요!`;
      } else if (category === 'intro') {
        topicInstruction = '주제: 메이커 본인 소개. "안녕 나는 20대고 1년 차 연애 중인 J형 계획형 커플이야. 매번 나만 데이트 코스 짜느라 고민이 많았어" 같은 성향과 고민을 솔직하게 나누며 친근하게 다가가는 자기소개 내용';
      } else if (category === 'empathy') {
        topicInstruction = '주제: 매번 한 명(주로 J)만 데이트 코스를 짜서 지치는 상황이나, 인스타 릴스에 핫플 저장만 해두고 막상 데이트 땐 기억 못하는 커플들의 뼈를 때리거나 찐공감을 유도하는 내용';
      } else if (category === 'service') {
        topicInstruction = '주제: 인스타 릴스를 공유하면 장소가 자동 저장되고, 공용 장바구니처럼 커플이 같이 지도에서 코스를 짤 수 있는 "둘픽(Dulpick)" 앱의 편리함을 자연스럽게 어필하는 내용';
      } else {
        topicInstruction = '주제: 1년차 커플의 데이트 코스 짜기 팁이나, 요즘 2030이 좋아하는 데이트 장소 특징 등 연애/데이트 관련 흥미로운 썰';
      }

      const prompt = `
당신은 1년 차 잇프제(ISFJ) 커플입니다.
스레드(Threads)에 올릴 짧고 매력적인 포스팅 초안을 작성해주세요.
${topicInstruction}

[필수 규칙]
- ISFJ(잇프제) 성향 특유의 세심함, 다정함, 그리고 혼자 동선 챙기다 속으로 끙끙 앓는 솔직함이 묻어나오게 작성하세요.
- 글자 수는 공백 포함 최대 200자를 절대 넘지 않게 짧게 작성하세요.
- 기본 반말 형태(~어, ~야, ~지?, ~해봤어)로 작성하세요.
- 이모티콘을 적절히 섞어주세요.
- 글 마무리는 자연스럽게 질문을 던지며 댓글 참여를 유도하세요.
- 해시태그는 넣지 마세요.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Failed to generate");

      const generatedText = data.candidates[0].content.parts[0].text;
      setDraft(generatedText);
      setMessage(fromComment ? '💡 선택한 댓글을 기반으로 새 포스팅 초안이 작성되었습니다!' : '초안 생성 완료!');
    } catch (err: any) {
      setMessage(`에러: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishToThreads = async () => {
    if (!draft.trim()) {
      setMessage('초안이 비어있습니다.');
      return;
    }

    setIsPublishing(true);
    setMessage('');

    try {
      const userId = import.meta.env.VITE_THREADS_USER_ID;
      const accessToken = import.meta.env.VITE_THREADS_ACCESS_TOKEN;

      if (!userId || !accessToken) {
        throw new Error("Threads API credentials missing in Vercel env");
      }

      let imageUrl = '';
      if (imageFile) {
        setMessage('이미지를 업로드 중입니다... (1/2)');
        imageUrl = await uploadImageToImgbb(imageFile);
        setMessage('스레드에 발행 중입니다... (2/2)');
      }

      // Step 1: Create media container
      const createParams: Record<string, string> = {
        media_type: imageUrl ? 'IMAGE' : 'TEXT',
        text: draft,
        access_token: accessToken
      };
      if (imageUrl) {
        createParams.image_url = imageUrl;
      }
      const createQuery = new URLSearchParams(createParams);

      const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${createQuery.toString()}`, {
        method: 'POST',
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(JSON.stringify(createData.error) || "Failed to create container");

      const creationId = createData.id;

      // Wait a moment for Meta to process the container
      await new Promise(res => setTimeout(res, 3000));

      // Step 2: Publish container
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken
      });
      const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?${publishParams.toString()}`, {
        method: 'POST',
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(JSON.stringify(publishData.error) || "Failed to publish");

      setMessage('🎉 스레드 자동 발행 성공!');
      setDraft(''); // Clear draft after successful publish
    } catch (err: any) {
      setMessage(`에러: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchRecentReplies = async () => {
    setIsFetchingReplies(true);
    setReplyMessage('');
    try {
      const userId = import.meta.env.VITE_THREADS_USER_ID;
      const accessToken = import.meta.env.VITE_THREADS_ACCESS_TOKEN;
      if (!userId || !accessToken) throw new Error("Threads API credentials missing");

      const apiRes = await fetch(`/api/get_replies?userId=${encodeURIComponent(userId)}&accessToken=${encodeURIComponent(accessToken)}`);
      const data = await apiRes.json();

      if (!apiRes.ok || !data.success) {
        const errDetail = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || `HTTP ${apiRes.status}`);
        throw new Error(errDetail);
      }

      setReplies(data.replies || []);
      if (!data.replies || data.replies.length === 0) {
        setReplyMessage('최근 게시글에 작성된 댓글이 없습니다.');
      } else {
        setReplyMessage(`총 ${data.replies.length}개의 댓글을 최신순으로 불러왔습니다 ✨`);
      }
    } catch (err: any) {
      setReplyMessage(`댓글 불러오기 에러: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsFetchingReplies(false);
    }
  };

  const generateReplyDraft = async (replyId: string, replyText: string, threadText?: string) => {
    try {
      setReplyMessage('답글 초안 생성 중...');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing");

      const prompt = `
당신은 스레드(Threads) 계정을 운영하는 1년 차 ISFJ(잇프제) 커플입니다.

내가 올린 원글 내용:
"${threadText || '연애 / 데이트 / MBTI 공감 관련 스레드 포스팅'}"

내 포스팅에 상대방이 남긴 댓글 내용:
"${replyText}"

상대방의 댓글에 대해 티키타카가 잘 되는 자연스러운 답글 1~2문장을 작성해주세요.

[절대 주의 사항 - 🚨 서비스 언급 금지]
- '둘픽', 'Dulpick', '앱', '서비스', '다운로드', '만들었다' 등 서비스/앱 언급 및 홍보는 100% 절대 금지입니다!!
- 뜬금없이 서비스 언급이나 딴소리를 하지 마시고, 오직 상대방 댓글 내용과 원글 맥락에 맞춰 공감하거나 위트 있게 티키타카 반응만 하세요.

[필수 작성 규칙]
1. 분량: 무조건 1~2문장 이내로 아주 짧게! (긴 글 절대 금지)
2. 말투 및 톤앤매너 (⭐️ 100% 반말 필수):
   - **상대방이 존댓말을 썼든 반말을 썼든 예외 없이 무조건 100% 친근하고 다정한 반말(~어!, ~맞아 🥹, ~고마워!, ~그치!, ~했어!)로만 답하세요.**
   - **존댓말(~요, ~습니다, ~해요)은 절대 단 한 단어도 사용하지 마세요!**
3. 성격: 잇프제(ISFJ) 특유의 따뜻함, 공감 능력 만렙, 꼼꼼한 친구 같은 다정함을 유지하세요.
4. 이모티콘(🥹, 😊, 💖, 🤣 등)을 1~2개 섞어주세요.
5. 해시태그나 서비스 언급은 절대 금지합니다.
`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to generate");

      const generatedText = data.candidates[0].content.parts[0].text;
      
      setReplyDrafts(prev => ({ ...prev, [replyId]: generatedText }));
      setReplyMessage('답글 초안 생성 완료!');
    } catch (err: any) {
      setReplyMessage(`AI 초안 생성 에러: ${err.message}`);
    }
  };

  const publishReply = async (replyId: string) => {
    const draftText = replyDrafts[replyId];
    if (!draftText) return;

    try {
      setReplyMessage('답글 발행 중...');
      const userId = import.meta.env.VITE_THREADS_USER_ID;
      const accessToken = import.meta.env.VITE_THREADS_ACCESS_TOKEN;

      // 1. Create media container for reply
      const createParams = new URLSearchParams({
        media_type: 'TEXT',
        text: draftText,
        reply_to_id: replyId,
        access_token: accessToken
      });
      const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${createParams.toString()}`, { method: 'POST' });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(JSON.stringify(createData.error));

      const creationId = createData.id;
      
      // Wait a moment for Meta to process the container
      await new Promise(res => setTimeout(res, 3000));

      // 2. Publish
      const publishParams = new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken
      });
      const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish?${publishParams.toString()}`, { method: 'POST' });
      const publishData = await publishRes.json();
      if (!publishRes.ok) throw new Error(JSON.stringify(publishData.error));

      setReplyMessage('🎉 답글 발행 성공!');
      
      // Clear draft for this reply
      setReplyDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[replyId];
        return newDrafts;
      });
      
      // Re-fetch replies to show updated state (wait a bit for propagation)
      setTimeout(fetchRecentReplies, 2000);
      
    } catch (err: any) {
      setReplyMessage(`답글 발행 에러: ${err.message}`);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: 400, margin: '100px auto', fontFamily: "'Pretendard', sans-serif", textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>🔒 관리자 로그인</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>접근 권한이 필요합니다.</p>
        <input 
          type="password" 
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && passwordInput === 'dulpickmaker!') {
              setIsAuthenticated(true);
            }
          }}
          style={{
            width: '100%', padding: 16, borderRadius: 8, border: '1px solid #CCC',
            fontSize: 16, marginBottom: 16, boxSizing: 'border-box'
          }}
        />
        <button 
          onClick={() => {
            if (passwordInput === 'dulpickmaker!') {
              setIsAuthenticated(true);
            } else {
              alert('비밀번호가 틀렸습니다.');
              setPasswordInput('');
            }
          }}
          style={{
            width: '100%', padding: 16, backgroundColor: '#130537', color: '#FFF',
            borderRadius: 8, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer'
          }}
        >
          입장하기
        </button>
        <div style={{ marginTop: 24 }}>
          <a href="/" style={{ color: '#666', textDecoration: 'underline' }}>← 홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(replies.length / itemsPerPage) || 1;
  const currentReplies = replies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto', fontFamily: "'Pretendard', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🤖 Dulpick Auto Poster</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>AI가 스레드 포스팅 초안을 작성하고, 댓글에 잇프제(ISFJ) 톤으로 답글을 생성합니다.</p>
      
      {/* 📌 상단 메인 탭 메뉴 */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB', marginBottom: 24 }}>
        <button
          onClick={() => setMainTab('write')}
          style={{
            flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700,
            color: mainTab === 'write' ? '#130537' : '#9CA3AF',
            borderBottom: mainTab === 'write' ? '3px solid #130537' : 'none',
            marginBottom: -2
          }}
        >
          📝 스레드 글 작성
        </button>
        <button
          onClick={() => {
            setMainTab('comments');
            if (replies.length === 0 && !isFetchingReplies) {
              fetchRecentReplies();
            }
          }}
          style={{
            flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700,
            color: mainTab === 'comments' ? '#130537' : '#9CA3AF',
            borderBottom: mainTab === 'comments' ? '3px solid #130537' : 'none',
            marginBottom: -2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}
        >
          💬 댓글 관리 {replies.length > 0 && <span style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', fontSize: 12, padding: '2px 8px', borderRadius: 12 }}>{replies.length}</span>}
        </button>
      </div>

      {/* ----------------- 탭 1: 스레드 글 작성 ----------------- */}
      {mainTab === 'write' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>📝 오늘의 포스팅 카테고리 선택</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'intro', label: '👋 자기소개' },
                { id: 'empathy', label: '🫂 커플 공감' },
                { id: 'service', label: '✨ 서비스 홍보' },
                { id: 'dating', label: '👫 데이트 꿀팁' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 600, fontSize: 14,
                    backgroundColor: category === cat.id ? '#130537' : '#F2F3F5',
                    color: category === cat.id ? '#FFF' : '#666',
                    border: 'none', transition: 'all 0.2s'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 🔧 환경변수 로드 확인 패널 */}
          <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, backgroundColor: '#F9FAFB', border: '1px dashed #CCC', fontSize: 13 }}>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>🔧 환경변수 로드 확인</p>
            <p>GEMINI_KEY: {import.meta.env.VITE_GEMINI_API_KEY ? '✅ 있음' : '❌ 없음'}</p>
            <p>THREADS_USER_ID: {import.meta.env.VITE_THREADS_USER_ID ? '✅ 있음' : '❌ 없음'}</p>
            <p>THREADS_ACCESS_TOKEN: {import.meta.env.VITE_THREADS_ACCESS_TOKEN ? '✅ 있음' : '❌ 없음'}</p>
          </div>

          <button 
            onClick={generateDraft} 
            disabled={isGenerating}
            style={{
              width: '100%', padding: 16, backgroundColor: '#000', color: '#FFF',
              borderRadius: 8, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
              marginBottom: 20
            }}
          >
            {isGenerating ? 'AI 초안 작성 중...' : '오늘의 스레드 초안 생성하기 ✨'}
          </button>

          <textarea 
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="생성된 초안이 여기에 나타납니다. 직접 수정할 수 있습니다."
            style={{
              width: '100%', height: 250, padding: 16, borderRadius: 8,
              border: '1px solid #CCC', fontSize: 15, lineHeight: 1.6,
              boxSizing: 'border-box', marginBottom: 20, resize: 'vertical'
            }}
          />

          {/* Image Upload UI */}
          <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>📷 이미지 첨부 (선택)</p>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageChange}
              style={{ width: '100%', fontSize: 14 }}
            />
            {imagePreview && (
              <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="preview" style={{ maxHeight: 200, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  style={{
                    position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#FFF',
                    border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
                  }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={publishToThreads} 
            disabled={isPublishing || !draft}
            style={{
              width: '100%', padding: 16, backgroundColor: '#130537', color: '#FFF',
              borderRadius: 8, fontSize: 16, fontWeight: 600, border: 'none', cursor: 'pointer',
              opacity: (isPublishing || !draft) ? 0.5 : 1
            }}
          >
            {isPublishing ? '발행 중...' : '스레드에 자동 발행하기 🚀'}
          </button>

          {message && (
            <div style={{
              marginTop: 20, padding: 16, borderRadius: 8,
              backgroundColor: message.includes('에러') ? '#FEE2E2' : '#DCFCE7',
              color: message.includes('에러') ? '#991B1B' : '#166534',
              fontWeight: 600, textAlign: 'center'
            }}>
              {message}
            </div>
          )}
        </>
      )}

      {/* ----------------- 탭 2: 스레드 댓글 관리 ----------------- */}
      {mainTab === 'comments' && (
        <>
          <button 
            onClick={fetchRecentReplies} 
            disabled={isFetchingReplies}
            style={{
              width: '100%', padding: 14, backgroundColor: '#F3F4F6', color: '#374151',
              borderRadius: 8, fontSize: 15, fontWeight: 600, border: '1px solid #D1D5DB', cursor: 'pointer',
              marginBottom: 16
            }}
          >
            {isFetchingReplies ? '댓글 불러오는 중...' : '🔄 전체 댓글 새로고침'}
          </button>

          {replyMessage && (
            <div style={{
              marginBottom: 16, padding: 12, borderRadius: 8,
              backgroundColor: replyMessage.includes('에러') ? '#FEE2E2' : '#EFF6FF',
              color: replyMessage.includes('에러') ? '#991B1B' : '#1E40AF',
              fontSize: 14, fontWeight: 600, textAlign: 'center'
            }}>
              {replyMessage}
            </div>
          )}

          {currentReplies.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {currentReplies.map(reply => (
                  <div key={reply.id} style={{ padding: 16, border: '1px solid #E5E7EB', borderRadius: 8, backgroundColor: '#FFF' }}>
                    {reply.threadText && (
                      <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 8, padding: '6px 10px', backgroundColor: '#F3F4F6', borderRadius: 6 }}>
                        📌 <strong>원글:</strong> "{reply.threadText.substring(0, 45)}{reply.threadText.length > 45 ? '...' : ''}"
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                        👤 {reply.username ? `@${reply.username}` : '스레드 유저'}
                        {reply.timestamp && (
                          <span style={{ fontWeight: 400, fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>
                            {new Date(reply.timestamp).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </span>
                      <a
                        href={reply.threadPermalink || "https://www.threads.net"}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}
                      >
                        ❤️ 스레드 앱에서 보기 (하트) 🔗
                      </a>
                    </div>
                    <p style={{ marginBottom: 12, fontSize: 15, color: '#374151', lineHeight: 1.5, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 6 }}>
                      "{reply.text}"
                    </p>
                    
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => generateReplyDraft(reply.id, reply.text, reply.threadText)}
                        style={{
                          padding: '8px 14px', backgroundColor: '#E0E7FF', color: '#4338CA',
                          border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        ✨ AI 답글 초안 생성
                      </button>
                      <button
                        onClick={() => {
                          setMainTab('write');
                          generateDraft({ text: reply.text, threadText: reply.threadText });
                        }}
                        style={{
                          padding: '8px 14px', backgroundColor: '#FEF3C7', color: '#92400E',
                          border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        💡 이 댓글 주제로 새 글 작성
                      </button>
                    </div>

                    {replyDrafts[reply.id] !== undefined && (
                      <>
                        <textarea
                          value={replyDrafts[reply.id]}
                          onChange={(e) => setReplyDrafts(prev => ({ ...prev, [reply.id]: e.target.value }))}
                          placeholder="생성된 답글이 여기에 나타납니다. 수정 가능합니다."
                          style={{
                            width: '100%', height: 90, padding: 12, borderRadius: 6,
                            border: '1px solid #D1D5DB', fontSize: 14, lineHeight: 1.5,
                            boxSizing: 'border-box', marginBottom: 12, resize: 'vertical'
                          }}
                        />
                        <button
                          onClick={() => publishReply(reply.id)}
                          style={{
                            width: '100%', padding: 12, backgroundColor: '#130537', color: '#FFF',
                            border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          🚀 이 답글 스레드에 발행하기
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* 📄 페이지네이션 컨트롤 */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB',
                      backgroundColor: currentPage === 1 ? '#F3F4F6' : '#FFF',
                      color: currentPage === 1 ? '#9CA3AF' : '#374151',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14
                    }}
                  >
                    ◀ 이전
                  </button>
                  
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    {currentPage} / {totalPages} 페이지 (총 {replies.length}개)
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 16px', borderRadius: 6, border: '1px solid #D1D5DB',
                      backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#FFF',
                      color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14
                    }}
                  >
                    다음 ▶
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <a href="/" style={{ color: '#666', textDecoration: 'underline' }}>← 홈으로 돌아가기</a>
      </div>
    </div>
  );
}
