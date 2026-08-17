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

  const categories = ['intro', 'empathy', 'service', 'dating'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];

  const categoryLabels = {
    intro: '👋 자기소개',
    empathy: '🫂 커플 공감',
    service: '✨ 서비스 홍보',
    dating: '👫 데이트 꿀팁',
  };

  let topicInstruction = '';
  if (randomCategory === 'intro') {
    topicInstruction = '주제: 메이커 본인 소개. "안녕 나는 20대고 1년 차 연애 중인 J형 계획형 커플이야. 매번 나만 데이트 코스 짜느라 고민이 많았어" 같은 성향과 고민을 솔직하게 나누며 친근하게 다가가는 자기소개 내용';
  } else if (randomCategory === 'empathy') {
    topicInstruction = '주제: 매번 한 명(주로 J)만 데이트 코스를 짜서 지치는 상황이나, 인스타 릴스에 핫플 저장만 해두고 막상 데이트 땐 기억 못하는 커플들의 뼈를 때리거나 찐공감을 유도하는 내용';
  } else if (randomCategory === 'service') {
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

  try {
    // 1. Generate draft with Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) throw new Error(geminiData.error?.message || 'Gemini API error');

    const draftText = geminiData.candidates[0].content.parts[0].text.trim();

    // 2. Build admin deep-link with draft pre-filled in URL
    const encodedDraft = encodeURIComponent(draftText);
    const adminLink = `${appUrl}/admin?draft=${encodedDraft}`;

    // 3. Send to Discord
    const now = new Date();
    const koreaTime = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);

    const discordPayload = {
      content: `📢 **오늘의 스레드 초안이 도착했어요!** (${koreaTime})\n카테고리: **${categoryLabels[randomCategory]}**\n\n✏️ 수정하고 발행하러 가기 → ${adminLink}`,
      embeds: [
        {
          color: 0x130537,
          title: '오늘의 초안 미리보기',
          description: draftText,
          footer: { text: '위 링크를 클릭하면 어드민 페이지에서 바로 이 초안으로 수정 & 발행할 수 있어요!' },
        },
      ],
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

    return res.status(200).json({ success: true, category: randomCategory, draft: draftText });
  } catch (err) {
    console.error('[daily_draft] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
