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
  const rawDraft = urlParams.get('draft') || '';
  let initialDraft = rawDraft;
  try {
    const parsed = JSON.parse(rawDraft);
    if (Array.isArray(parsed) && parsed.length > 0) {
      initialDraft = parsed[0]?.text || rawDraft;
    }
  } catch {
    // plain text
  }

  const [draft, setDraft] = useState(initialDraft);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('empathy');

  const [images, setImages] = useState<{ id: string; file: File; preview: string }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => {
          if (prev.length >= 10) {
            alert('스레드 캐러셀은 이미지를 최대 10장까지 첨부할 수 있습니다.');
            return prev;
          }
          return [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              file,
              preview: reader.result as string
            }
          ];
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
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

      let prompt = '';

      const isFromComment = Boolean(
        fromComment &&
        typeof fromComment === 'object' &&
        'text' in fromComment &&
        typeof fromComment.text === 'string' &&
        fromComment.text.trim().length > 0
      );

      if (isFromComment && fromComment) {
        prompt = `
당신은 20대 커플입니다. 이전 스레드 포스팅의 대박 댓글을 바탕으로 폭발적인 참견을 유도하는 2차 연계 스레드(Threads) 글 초안을 작성해주세요.
- 내 원글: "${fromComment.threadText || ''}"
- 유저가 남긴 댓글: "${fromComment.text}"

[필수 규칙]
1. 이 댓글에서 파생된 연애/데이트 고민이나 MBTI 차이, 서운한 썰을 주제로 삼아 다른 유저들이 댓글로 참견하고 토론할 수 있게 작성하세요.
2. 100% 일상 구어체 반말(~어, ~야, ~지?, ~했거든)을 사용하세요.
3. 2~3줄 단위로 적절한 줄바꿈을 넣으세요.
4. 마지막은 댓글 참여를 유도하는 질문으로 마무리하세요.
5. 해시태그는 절대 넣지 마세요.
`;
      } else if (category === 'intro') {
        prompt = `
당신은 20대 1년 차 커플이자, 데이트에 진심인 스레드 유저입니다.
스레드(Threads)에 처음 올릴 매력적이고 친근한 '자기소개' 포스팅 초안을 작성해주세요.

[내용 및 방향성]
- 우리는 20대 1년 차 계획형(J)과 즉흥형(P) 커플이라는 정체성 소개
- 매주 주말마다 "이번 주엔 어디 가지?" 머리 싸매고 고민하다가, 우리가 직접 데이트 코스 짜고 겪은 찐후기와 알짜배기 데이트 팁을 공유하려고 스레드를 시작했다는 계기 설명
- 앞으로 사진빨 핫플 거르는 법, 실패 없는 데이트 코스, 커플 현실 썰들을 솔직하게 풀겠다는 예고

[필수 작성 규칙]
1. 오직 '우리 소개 + 스레드 시작 계기 + 소통 유도'에 집중하세요.
2. 친근하고 발랄한 100% 일상 구어체 반말(~어, ~야, ~지?, ~할게!)로 작성하세요.
3. 모바일에서 읽기 편하게 2~3줄 단위로 줄바꿈을 넣으세요.
4. 마지막 문장은 "다들 몇 년 차 커플이야? 우리랑 맞팔하고 주말 데이트 팁 공유하면서 친하게 지내자!" 처럼 유저들과의 맞팔/소통을 유도하는 질문으로 마무리하세요.
5. 둘픽 서비스명이나 앱 홍보는 절대 넣지 마세요.
6. 해시태그는 넣지 마세요.
`;
      } else if (category === 'empathy') {
        prompt = `
당신은 20대 커플입니다. 스레드(Threads)에서 수많은 커플 유저들의 격한 공감과 폭풍 댓글을 이끌어낼 '커플 공감' 포스팅 초안을 작성해주세요.

[소재 후보 (아래 중 하나를 선택해 생생하고 디테일하게 묘사)]
1. 인스타 릴스 맛집/카페 저장만 500개 해놓고 막상 주말에 만나면 둘 다 카페 앉아서 1시간 동안 폰만 뒤지며 어디 갈지 멘붕 온 웃픈 현실
2. 상대방이 "난 다 좋아~ 너 가고 싶은 데 가!" 해놓고 막상 데려가면 "여기 웨이팅 너무 긴데..?", "여기 주차 안 되네?" 투덜거릴 때의 깊은 빡침
3. 매번 나만 맛집 찾고, 동선 짜고, 예약하느라 데이트 시작 전부터 혼자 지쳐서 서운했던 경험
4. 분 단위로 엑셀 동선 짠 파워 J와 "가서 삘 꽂히는 데 가자"는 파워 P의 극과 극 데이트 갈등

[필수 작성 규칙]
1. 실제 겪은 일처럼 생생한 대화나 감정("진짜 속 터져 죽는 줄 알았잖아", "이거 나만 그래?")을 담으세요.
2. 둘픽 서비스명이나 앱 홍보는 절대 일절 넣지 마세요. 순수 100% 공감 썰이어야 합니다.
3. 친구에게 하소연하듯 100% 자연스러운 일상 구어체 반말(~어, ~거든, ~잖아, ~있음?)을 사용하세요.
4. 모바일에서 호흡이 끊기지 않게 2~3줄 단위로 적절히 줄바꿈을 넣으세요.
5. 마지막 문장은 "너네도 데이트할 때 이래? ㅋㅋㅋ", "너네는 데이트 장소 주로 누가 찾아? 다들 어때?" 처럼 댓글을 달 수밖에 없는 질문으로 끝내세요.
6. 해시태그는 넣지 마세요.
`;
      } else if (category === 'service') {
        prompt = `
당신은 데이트 장소 정하기가 너무 답답해서 직접 커플 앱을 만든 20대 메이커 커플입니다.
스레드(Threads)에 올릴 자연스럽고 솔직한 '둘픽(Dulpick) 앱 소개' 글 초안을 작성해주세요.

[내용 및 방향성]
- 데이트할 때 인스타 릴스 저장만 수백 개 해두고 막상 어디 갈지 못 찾거나, 매번 한 사람만 코스 찾느라 지쳤던 실제 우리 커플의 고민으로 시작
- "그래서 우리가 직접 인스타 릴스 링크만 공유하면 지도에 장소가 자동 저장되고, 둘이 장바구니처럼 같이 장소 담아서 코스 짤 수 있는 '둘픽'이라는 앱을 만들었거든!" 하고 자연스럽게 연결
- "이러이러한 기능이 있는 둘픽 앱을 직접 만들었는데 혹시 관심 있는 사람 있을까?" 하는 겸손하고 솔직한 메이커의 톤

[필수 작성 규칙]
1. 반드시 서비스명 '둘픽(Dulpick)'과 핵심 기능(인스타 릴스 링크 공유 시 지도 자동 저장, 커플이 함께 장소 담아 코스 짜기)을 자연스럽게 언급하세요.
2. 절대 딱딱한 기업 홍보나 마케팅 문체 금지 ("혁신적인 앱", "지금 다운로드", "많은 이용 부탁드립니다" 등 절대 금지).
3. 친구에게 "우리 이거 답답해서 직접 만들어봤는데 어때?" 하고 털어놓듯 100% 일상 구어체 반말(~어, ~거든, ~있을까?)을 사용하세요.
4. 모바일 화면에서 한눈에 읽히도록 2~3줄 단위로 적절한 줄바꿈을 넣으세요.
5. 마지막 문장은 "혹시 우리처럼 이런 거 필요했던 커플이나 관심 있는 사람 있어? 댓글 남겨주면 링크 먼저 보내줄게!", "이런 거 있으면 데이트할 때 써볼 사람 있어?" 처럼 관심과 댓글을 묻는 질문으로 마무리하세요.
6. 해시태그는 넣지 마세요.
`;
      } else {
        prompt = `
당신은 데이트 코스에 진심인 20대 커플입니다.
스레드(Threads) 유저들이 무조건 저장(Save)하고 스크랩할 만한 알짜배기 '데이트 꿀팁' 포스팅 초안을 작성해주세요.

[소재 후보 (아래 중 하나를 선택해 구체적인 노하우 제공)]
1. 주말 핫플에서 웨이팅 2시간씩 피하는 3동선 법칙 (식당-카페 도보 5분 이내 붙이기, 테이블링/캐치테이블 원격 줄서기 걸고 소품샵 돌기 등)
2. 인스타 릴스 핫플 사진빨에 낚이지 않고 찐맛집 걸러내는 감별법 (네이버 영수증 리뷰/카카오맵 평점 3.8 이상 교차 검증 노하우)
3. "오늘 뭐 먹을래?"로 절대 안 싸우는 커플 룰 (각자 가고 싶은 곳 2개씩 골라와서 상대방이 최종 픽하기 등)
4. 비 오거나 너무 더운/추운 날 실패 없는 실내 데이트 코스 조합 공식

[필수 작성 규칙]
1. 막연한 이야기가 아니라, 이번 주말 데이트에 바로 써먹을 수 있는 아주 구체적이고 실용적인 꿀팁이어야 합니다.
2. 둘픽 서비스명이나 앱 홍보는 넣지 마세요. 오직 유익한 정보 제공에 집중하세요.
3. 아는 언니/오빠가 알려주듯 친절하고 똑부러지는 100% 일상 구어체 반말(~어, ~해봐, ~거든, ~더라)을 사용하세요.
4. 팁이 한눈에 쏙쏙 들어오도록 2~3줄 단위로 줄바꿈을 넣으세요.
5. 마지막 문장은 "이번 주 데이트할 때 꼭 저장해두고 써먹어봐!", "너네 커플만의 꿀팁도 있으면 댓글로 알려줘!" 로 마무리하세요.
6. 해시태그는 넣지 마세요.
`;
      }

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

      let creationId = '';

      if (images.length === 0) {
        // Text-only post
        setMessage('스레드에 발행 중입니다...');
        const createParams = new URLSearchParams({
          media_type: 'TEXT',
          text: draft,
          access_token: accessToken
        });
        const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${createParams.toString()}`, {
          method: 'POST',
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(JSON.stringify(createData.error) || "Failed to create container");
        creationId = createData.id;

      } else if (images.length === 1) {
        // Single Image post
        setMessage('이미지를 업로드 중입니다... (1/1)');
        const imageUrl = await uploadImageToImgbb(images[0].file);
        
        setMessage('스레드 컨테이너 생성 중...');
        const createParams = new URLSearchParams({
          media_type: 'IMAGE',
          image_url: imageUrl,
          text: draft,
          access_token: accessToken
        });
        const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${createParams.toString()}`, {
          method: 'POST',
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(JSON.stringify(createData.error) || "Failed to create container");
        creationId = createData.id;

      } else {
        // Multiple Images: Carousel post (2~10 images)
        const imageUrls: string[] = [];
        for (let i = 0; i < images.length; i++) {
          setMessage(`이미지 업로드 중... (${i + 1}/${images.length})`);
          const url = await uploadImageToImgbb(images[i].file);
          imageUrls.push(url);
        }

        // Step 1: Create individual child item containers
        const childContainerIds: string[] = [];
        for (let i = 0; i < imageUrls.length; i++) {
          setMessage(`캐러셀 항목 등록 중... (${i + 1}/${imageUrls.length})`);
          const childParams = new URLSearchParams({
            media_type: 'IMAGE',
            image_url: imageUrls[i],
            is_carousel_item: 'true',
            access_token: accessToken
          });
          const childRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${childParams.toString()}`, {
            method: 'POST',
          });
          const childData = await childRes.json();
          if (!childRes.ok) throw new Error(JSON.stringify(childData.error) || `캐러셀 ${i + 1}번째 항목 생성 실패`);
          childContainerIds.push(childData.id);
        }

        // Step 2: Create parent carousel container
        setMessage('스레드 캐러셀(슬라이드) 생성 중...');
        const carouselParams = new URLSearchParams({
          media_type: 'CAROUSEL',
          children: childContainerIds.join(','),
          text: draft,
          access_token: accessToken
        });
        const carouselRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?${carouselParams.toString()}`, {
          method: 'POST',
        });
        const carouselData = await carouselRes.json();
        if (!carouselRes.ok) throw new Error(JSON.stringify(carouselData.error) || "캐러셀 컨테이너 생성 실패");
        creationId = carouselData.id;
      }

      // Wait a moment for Meta to process the container
      setMessage('스레드 서버 처리 대기 중... (약 3초)');
      await new Promise(res => setTimeout(res, 3500));

      // Step: Publish container
      setMessage('스레드에 최종 발행 중...');
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
      setImages([]); // Clear images after successful publish
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
            onClick={() => generateDraft()} 
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

          {/* Image Upload UI (Multi-image support up to 10 images) */}
          <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                📷 이미지 첨부 ({images.length}/10개)
                {images.length > 1 && <span style={{ marginLeft: 6, color: '#4F46E5', fontSize: 12, fontWeight: 500 }}>• 스레드 캐러셀(슬라이드)로 자동 발행</span>}
              </p>
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => setImages([])}
                  style={{
                    background: 'none', border: 'none', color: '#EF4444', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', padding: 0
                  }}
                >
                  전체 삭제
                </button>
              )}
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={images.length >= 10}
              style={{ width: '100%', fontSize: 14 }}
            />
            {images.length >= 10 && (
              <p style={{ color: '#EF4444', fontSize: 12, marginTop: 6, marginBottom: 0 }}>
                최대 첨부 가능한 개수(10장)에 도달했습니다.
              </p>
            )}

            {images.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 10,
                marginTop: 12
              }}>
                {images.map((img, index) => (
                  <div 
                    key={img.id}
                    style={{
                      position: 'relative',
                      borderRadius: 8,
                      overflow: 'hidden',
                      aspectRatio: '1 / 1',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#F3F4F6'
                    }}
                  >
                    <img 
                      src={img.preview} 
                      alt={`upload-${index + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{
                      position: 'absolute', top: 4, left: 4,
                      backgroundColor: 'rgba(19, 5, 55, 0.75)', color: '#FFF',
                      fontSize: 11, fontWeight: 700, borderRadius: 4,
                      padding: '1px 5px', lineHeight: '14px'
                    }}>
                      {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        background: 'rgba(0, 0, 0, 0.6)', color: '#FFF',
                        border: 'none', borderRadius: '50%', width: 20, height: 20,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 11
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
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
