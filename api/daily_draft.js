// api/daily_draft.js
// Vercel Serverless Function - triggered daily at 8PM KST (11:00 UTC) by cron

export default async function handler(req, res) {
  // Allow manual trigger via GET as well (for testing from browser)
  // Cron jobs are triggered as GET requests by Vercel

  const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
  const discordWebhookUrl = process.env.DISCORD_DRAFT_WEBHOOK_URL;
  const appUrl = process.env.VITE_APP_URL || 'https://dulpick.vercel.app';

  if (!geminiApiKey || !discordWebhookUrl) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  const categories = ['H1', 'H2', 'H3', 'H4', 'H5'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];

  const categoryLabels = {
    H1: '⚖️ H1. 데이트 준비 불균형',
    H2: '📥 H2. 인스타 저장 후 방치',
    H3: '🤷 H3. 결정 장애',
    H4: '🔍 H4. 상대 취향 파악',
    H5: '🚀 H5. 메이커 스토리 / 서비스 연결'
  };

  let hypothesisDetail = '';
  if (randomCategory === 'H1') {
    hypothesisDetail = `[가설 H1: 데이트 준비 불균형]
- 핵심 내용: 사용자는 데이트 장소를 한 사람만 계속 찾고 제안해야 하는 상황에 부담이나 서운함을 느낀다.
- 핵심 상황 예시:
  * 나만 맛집/카페를 찾는 것 같음
  * 상대는 항상 "난 다 좋아"라고 함
  * 한쪽만 데이트를 준비하는 느낌
  * 함께 준비하고 싶음
- 제약사항: 둘픽 서비스명이나 기능을 노출하지 마세요.`;
  } else if (randomCategory === 'H2') {
    hypothesisDetail = `[가설 H2: 인스타 저장 후 방치]
- 핵심 내용: 사용자는 인스타 릴스에서 데이트 장소를 많이 저장하지만 너무 쌓여 다시 확인하거나 실제 데이트에 활용하지 못한다.
- 핵심 상황 예시:
  * 맛집·카페를 계속 저장함
  * 저장함이 너무 많아 다시 안 봄
  * 어디에 저장했는지 기억이 안 남
  * 결국 데이트 날 다시 검색함
- 제약사항: 둘픽 서비스명이나 기능을 노출하지 마세요.`;
  } else if (randomCategory === 'H3') {
    hypothesisDetail = `[가설 H3: 결정 장애]
- 핵심 내용: 사용자는 가고 싶은 장소 후보는 많지만 그중 실제로 어디를 갈지 결정하는 것을 어려워한다.
- 핵심 상황 예시:
  * 후보는 많은데 하나를 못 고름
  * 둘 다 "아무 데나"라고 함
  * 결정하는 데 시간이 오래 걸림
  * 결국 늘 가던 곳을 가거나 즉흥적으로 정함
- 제약사항: 둘픽 서비스명이나 기능을 노출하지 마세요.`;
  } else if (randomCategory === 'H4') {
    hypothesisDetail = `[가설 H4: 상대 취향 파악]
- 핵심 내용: 사용자는 상대가 어떤 데이트 장소와 경험을 좋아하는지 충분히 알기 어려워 장소를 제안하는 데 고민한다.
- 핵심 상황 예시:
  * 연애 초 상대 취향을 잘 모름
  * 서로 저장하는 장소 스타일이 다름
  * 무엇을 제안해야 좋아할지 고민됨
  * 상대가 평소 저장하는 장소를 보면 취향을 알 수 있을 것 같음
- 제약사항: 둘픽 서비스명이나 기능을 노출하지 마세요.`;
  } else if (randomCategory === 'H5') {
    hypothesisDetail = `[가설 H5: 둘픽 메이커 스토리 / 자연스러운 서비스 연결]
- 핵심 내용: 사용자가 공감할 만한 실제 데이트 문제에서 시작해 "우리도 이 문제를 겪어서 직접 해결해보려고 만들었다"는 흐름으로 둘픽을 자연스럽게 소개한다.
- 핵심 흐름: 공감되는 실제 상황 -> 우리 커플도 같은 문제를 겪음 -> 불편해서 방법을 고민함 -> 직접 둘픽을 만들게 됨 -> 둘픽에서 어떻게 해결했는지 아주 짧게 소개
- 예시 소재 (※ 실제 사실로 제공된 이 세 가지 중 하나만 사용하며, 새로운 경험을 지어내지 마세요):
  1. 나는 계속 맛집을 찾고 남자친구는 "난 다 좋아"라고 해서 결국 같이 저장하는 앱을 만들게 된 이야기
  2. 서로 인스타 릴스를 계속 보내는데 나중에는 찾지 못해서 직접 모아보려고 만든 이야기
  3. 개발자인 남자친구와 데이트 장소 때문에 이야기하다가 "그냥 우리가 만들어볼까?" 하고 시작한 이야기
- 규칙:
  * 첫 문장부터 서비스명이나 기능을 홍보하지 마세요.
  * 먼저 사용자가 공감할 상황이나 개인적인 에피소드로 시작하고, 글 중후반에 둘픽을 자연스럽게 등장시키세요.
  * "지금 다운로드하세요", "혁신적인 앱", "많은 이용 부탁드립니다" 같은 광고 문구는 절대 사용하지 마세요.
  * CTA는 판매형보다 자연스럽게 아래 예시처럼 작성하세요:
    - 이런 거 있으면 쓸 것 같아?
    - 우리 같은 커플 또 있음?
    - 너네는 이런 장소 어떻게 관리해?
    - 이런 방식이면 좀 편할 것 같아?`;
  }

  const prompt = `
당신은 20~30대 커플입니다. Threads에서 활발히 소통하는 유저의 톤앤매너로, 선택된 메시지 가설에만 집중해서 Threads 게시물 초안 3개를 작성해주세요.

선택된 메시지 가설 정보:
${hypothesisDetail}

[기본 규칙]
- 선택된 메시지 가설 하나에만 집중해서 서로 다른 상황이나 표현을 사용하는 초안 3개를 생성하세요. 다른 가설의 문제를 한 게시물에 과도하게 섞지 마세요.
- 말투는 20~30대가 Threads에서 실제로 이야기하는 것처럼 가볍고 자연스럽게 작성하세요:
  * 짧은 문장
  * 적절한 줄바꿈 (모바일에서 읽기 편하게)
  * 일상적인 표현 사용
  * 약간의 유머나 공감 유도
  * 지나치게 작위적인 밈 사용 금지
  * 과도한 이모지 사용 금지 (한 게시물당 1~2개 이내)
  * 브랜드 공식 계정 같은 광고 문체 절대 금지
  * 사용자를 가르치거나 문제를 단정하는 표현 금지
- 가능하면 마지막 문장에는 사용자가 자신의 경험을 댓글로 이야기할 수 있는 자연스러운 질문을 하나 넣으세요.
- 가설 H1~H4에서는 둘픽 서비스명을 원칙적으로 노출하지 마세요.
- 가설 H5에서만 서비스와 제작 이야기를 자연스럽게 연결하되 첫 문장부터 홍보하지 마세요.

[출력 JSON 형식]
다음 JSON 구조로만 정확하게 응답해야 합니다:
{
  "drafts": [
    {
      "hypothesis": "${randomCategory}",
      "contentType": "공감형 / 경험형 / 질문형 / 유머형 / 메이커 스토리형 중 어울리는 유형 하나",
      "validation": "사용자가 어떤 부분에 공감하거나 자신의 경험을 이야기하는지 검증하려는 반응 (한 문장)",
      "text": "Threads에 작성할 초안 본문 (줄바꿈 포함)"
    },
    ... (총 3개 작성)
  ]
}
`;

  try {
    // 1. Generate draft with Gemini (using JSON Mode)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                drafts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      hypothesis: { type: 'string' },
                      contentType: { type: 'string' },
                      validation: { type: 'string' },
                      text: { type: 'string' }
                    },
                    required: ['hypothesis', 'contentType', 'validation', 'text']
                  }
                }
              },
              required: ['drafts']
            }
          }
        }),
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(geminiData.error?.message || 'Gemini API error');

    const draftJsonString = geminiData.candidates[0].content.parts[0].text.trim();
    const parsedData = JSON.parse(draftJsonString);
    const drafts = parsedData.drafts || [];

    // 2. Build admin deep-link with drafts pre-filled in URL
    const encodedDrafts = encodeURIComponent(JSON.stringify(drafts));
    const adminLink = `${appUrl}/admin?draft=${encodedDrafts}`;

    // 3. Send to Discord
    const now = new Date();
    const koreaTime = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);

    const discordPayload = {
      content: `📢 **오늘의 스레드 초안이 도착했어요!** (${koreaTime})\n검증 가설: **${categoryLabels[randomCategory]}**\n\n✏️ 수정하고 발행하러 가기 → ${adminLink}`,
      embeds: drafts.map((d, index) => ({
        color: 0x130537,
        title: `초안 ${index + 1} (${d.contentType})`,
        description: `**검증하려는 반응:** ${d.validation}\n\n${d.text}`,
      })),
    };

    const discordRes = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      throw new Error(`Discord webhook failed: ${errText}`);
    }

    return res.status(200).json({ success: true, category: randomCategory, drafts });
  } catch (err) {
    console.error('[daily_draft] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
