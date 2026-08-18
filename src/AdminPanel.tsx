import React, { useState, useEffect } from 'react';

interface Reply {
  id: string;
  text: string;
  timestamp: string;
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

  // Replies states
  const [recentThread, setRecentThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isFetchingReplies, setIsFetchingReplies] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  const generateDraft = async () => {
    setIsGenerating(true);
    setMessage('');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing");

      let topicInstruction = '';
      if (category === 'intro') {
        topicInstruction = '주제: 메이커 본인 소개. "안녕 나는 20대고 1년 차 연애 중인 J형 계획형 커플이야. 매번 나만 데이트 코스 짜느라 고민이 많았어" 같은 성향과 고민을 솔직하게 나누며 친근하게 다가가는 자기소개 내용';
      } else if (category === 'empathy') {
        topicInstruction = '주제: 매번 한 명(주로 J)만 데이트 코스를 짜서 지치는 상황이나, 인스타 릴스에 핫플 저장만 해두고 막상 데이트 땐 기억 못하는 커플들의 뼈를 때리거나 찐공감을 유도하는 내용';
      } else if (category === 'service') {
        topicInstruction = '주제: 인스타 릴스를 공유하면 장소가 자동 저장되고, 공용 장바구니처럼 커플이 같이 지도에서 코스를 짤 수 있는 "둘픽(Dulpick)" 앱의 편리함을 자연스럽게 어필하는 내용';
      } else {
        topicInstruction = '주제: 1년차 커플의 데이트 코스 짜기 팁이나, 요즘 2030이 좋아하는 데이트 장소 특징 등 연애/데이트 관련 흥미로운 썰';
      }

      const prompt = `
당신은 '둘픽(Dulpick)' 이라는 커플 데이트 코스 앱 서비스를 직접 만든 1년 차 계획형(J) 커플 1인 메이커입니다.
둘픽은 "인스타에서 본 장소들을 공유만 하면 커플 공용 지도에 자동 저장되고, 트리플(Triple) 앱처럼 함께 데이트 코스를 짤 수 있는" 서비스입니다.

매일 스레드(Threads)에 올릴 짧고 매력적인 포스팅 초안을 작성해주세요.
${topicInstruction}

[필수 규칙 - 메이커의 말투를 완벽하게 따라할 것]
- 글자 수는 공백 포함 최대 200자를 절대 넘지 않게 아주 짧게 작성하세요!!
- 반드시 100% 반말로 작성하세요. (예: ~어, ~야, ~지?, ~사람!!, ~해봤어) 존댓말은 절대 금지입니다.
- 너무 딱딱한 광고나 설명충 느낌을 빼고, 실제 커플이 겪는 찐고민을 털어놓으며 공감대를 형성하는 말투를 쓰세요. ("이거 우리 커플만 그래?")
- 사람 냄새나는 이모티콘이나 특수문자를 적절히 섞어주세요.
- 글의 마지막에는 자연스럽게 질문을 던지거나 앱 사용을 유도하세요. ("이런 앱 써볼 커플 있어?", "다들 데이트 코스 누가 짜?")
- 해시태그는 넣지 마세요. 스레드 감성에 맞게 깔끔하게 끝내세요.

[메이커의 실제 작성 예시 참고]
- "인스타 릴스에 맛집 맨날 저장만 해두고 막상 데이트할 땐 어디 갈지 기억 안 나는 커플 있어? 🙋‍♀️ 공유만 하면 지도에 자동 저장되는 앱 만들었는데 써볼 사람!"
- "우리 커플은 1년째 나만 파워 J라서 데이트 코스 다 짜느라 가끔 섭섭할 때가 있거든.. 이거 나만 그런 거 아니지? 🥲 그래서 둘이 같이 장바구니처럼 장소 담고 코스 짜는 앱을 만들어봤어!"
- "데이트 코스 짤 때 매번 카톡으로 링크 보내기 귀찮지 않아? 릴스 공유하면 바로 커플 지도에 꽂히고 같이 동선 볼 수 있는 서비스 만들고 있는데 피드백 줄 커플 있을까 🥺"
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
      setMessage('초안 생성 완료!');
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

      // 1. Fetch user's recent threads
      const threadsRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?access_token=${accessToken}`);
      const threadsData = await threadsRes.json();
      if (!threadsRes.ok) throw new Error(JSON.stringify(threadsData.error));

      if (!threadsData.data || threadsData.data.length === 0) {
        setReplyMessage('작성된 스레드 포스팅이 없습니다.');
        return;
      }
      
      const latestThread = threadsData.data[0];
      setRecentThread(latestThread);

      // 2. Fetch replies for the latest thread
      const repliesRes = await fetch(`https://graph.threads.net/v1.0/${latestThread.id}/replies?access_token=${accessToken}`);
      const repliesData = await repliesRes.json();
      if (!repliesRes.ok) throw new Error(JSON.stringify(repliesData.error));

      setReplies(repliesData.data || []);
      if (!repliesData.data || repliesData.data.length === 0) {
        setReplyMessage('최근 포스팅에 아직 댓글이 없습니다.');
      } else {
        setReplyMessage('댓글을 성공적으로 불러왔습니다.');
      }
    } catch (err: any) {
      setReplyMessage(`댓글 불러오기 에러: ${err.message}`);
    } finally {
      setIsFetchingReplies(false);
    }
  };

  const generateReplyDraft = async (replyId: string, replyText: string) => {
    try {
      setReplyMessage('답글 초안 생성 중...');
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing");

      const prompt = `
당신은 '두잇(DO IT)' 이라는 생산성/할 일 관리 서비스를 만든 1인 메이커입니다.
당신이 스레드에 올린 포스팅에 누군가 다음과 같은 댓글을 달았습니다:
"${replyText}"

이 댓글에 대한 친절하고 센스 있는 반말 답글을 150자 이내로 작성해주세요.
- 필수 규칙: 100% 반말, 가르치려 들지 않는 친구 같은 공감형 말투, 귀여운 이모티콘 사용 (예: ꒰ • ̫ - ꒱⊹˚. 등)
- 절대 존댓말 쓰지 마세요.
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

  return (
    <div style={{ padding: '40px 20px', maxWidth: 600, margin: '0 auto', fontFamily: "'Pretendard', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🤖 Dulpick Auto Poster</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>AI가 스레드 포스팅 초안을 작성하고, 검수 후 원클릭으로 발행합니다.</p>
      
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

      {/* 🔧 임시 디버그 패널 - 확인 후 삭제 */}
      <div style={{ marginBottom: 20, padding: 12, borderRadius: 8, backgroundColor: '#F9FAFB', border: '1px dashed #CCC', fontSize: 13 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>🔧 환경변수 로드 확인 (임시)</p>
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

      {/* --- Replies Section --- */}
      <hr style={{ margin: '40px 0', border: 'none', borderTop: '1px solid #E5E7EB' }} />
      
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>💬 스레드 댓글(답글) 관리</h2>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>최근 작성한 스레드에 달린 댓글을 불러오고 AI 답글을 달 수 있습니다.</p>
      
      <button 
        onClick={fetchRecentReplies} 
        disabled={isFetchingReplies}
        style={{
          width: '100%', padding: 14, backgroundColor: '#F3F4F6', color: '#374151',
          borderRadius: 8, fontSize: 15, fontWeight: 600, border: '1px solid #D1D5DB', cursor: 'pointer',
          marginBottom: 20
        }}
      >
        {isFetchingReplies ? '불러오는 중...' : '🔄 최근 포스팅 댓글 불러오기'}
      </button>

      {recentThread && (
        <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, fontSize: 13, color: '#4B5563' }}>
          <strong>최근 포스팅:</strong> {recentThread.text.substring(0, 50)}...
        </div>
      )}

      {replies.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {replies.map(reply => (
            <div key={reply.id} style={{ padding: 16, border: '1px solid #E5E7EB', borderRadius: 8 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>👤 댓글: "{reply.text}"</p>
              
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => generateReplyDraft(reply.id, reply.text)}
                  style={{
                    padding: '8px 12px', backgroundColor: '#E0E7FF', color: '#4338CA',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ✨ AI 답글 초안 생성
                </button>
              </div>

              {replyDrafts[reply.id] !== undefined && (
                <>
                  <textarea
                    value={replyDrafts[reply.id]}
                    onChange={(e) => setReplyDrafts(prev => ({ ...prev, [reply.id]: e.target.value }))}
                    style={{
                      width: '100%', height: 100, padding: 12, borderRadius: 6,
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
                    🚀 이 답글 발행하기
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {replyMessage && (
        <div style={{
          marginTop: 16, padding: 12, borderRadius: 8,
          backgroundColor: replyMessage.includes('에러') ? '#FEE2E2' : '#EFF6FF',
          color: replyMessage.includes('에러') ? '#991B1B' : '#1E40AF',
          fontSize: 14, fontWeight: 600, textAlign: 'center'
        }}>
          {replyMessage}
        </div>
      )}
      
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <a href="/" style={{ color: '#666', textDecoration: 'underline' }}>← 홈으로 돌아가기</a>
      </div>
    </div>
  );
}
