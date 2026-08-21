export default async function handler(req, res) {
  // Enable CORS headers for internal API calls
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const userId = process.env.VITE_THREADS_USER_ID || req.query.userId;
    const accessToken = process.env.VITE_THREADS_ACCESS_TOKEN || req.query.accessToken;

    if (!userId || !accessToken) {
      return res.status(400).json({ error: "Threads credentials missing" });
    }

    // 1. Fetch top 10 recent threads (fast & lightweight)
    const threadsRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?fields=id,text,timestamp,permalink&limit=10&access_token=${accessToken}`);
    const threadsData = await threadsRes.json();

    if (!threadsRes.ok) {
      return res.status(threadsRes.status).json({ error: threadsData.error?.message || "Failed to fetch threads" });
    }

    if (!threadsData.data || threadsData.data.length === 0) {
      return res.status(200).json({ success: true, threadsCount: 0, replies: [] });
    }

    const threads = threadsData.data;
    const replyMap = new Map();

    // 2. Concurrently fetch replies for each thread (limit 50 per thread, single fast request)
    await Promise.all(
      threads.map(async (thread) => {
        try {
          const repliesRes = await fetch(`https://graph.threads.net/v1.0/${thread.id}/replies?fields=id,text,username,timestamp&limit=50&access_token=${accessToken}`);
          const repliesData = await repliesRes.json();
          if (repliesRes.ok && repliesData.data) {
            repliesData.data.forEach(reply => {
              if (!replyMap.has(reply.id)) {
                replyMap.set(reply.id, {
                  ...reply,
                  threadId: thread.id,
                  threadText: thread.text,
                  threadPermalink: thread.permalink
                });
              }
            });
          }
        } catch (e) {
          // ignore single thread fetch error
        }
      })
    );

    const allReplies = Array.from(replyMap.values());

    // 3. Sort all replies by timestamp (newest first)
    allReplies.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      threadsCount: threads.length,
      replies: allReplies
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
