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

    // 1. Fetch user's recent threads
    const threadsRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads?fields=id,text,timestamp&access_token=${accessToken}`);
    const threadsData = await threadsRes.json();

    if (!threadsRes.ok) {
      return res.status(threadsRes.status).json({ error: threadsData.error || "Failed to fetch threads" });
    }

    if (!threadsData.data || threadsData.data.length === 0) {
      return res.status(200).json({ success: true, thread: null, replies: [] });
    }

    const latestThread = threadsData.data[0];

    // 2. Fetch replies for the latest thread
    const repliesRes = await fetch(`https://graph.threads.net/v1.0/${latestThread.id}/replies?fields=id,text,username,timestamp&access_token=${accessToken}`);
    const repliesData = await repliesRes.json();

    if (!repliesRes.ok) {
      return res.status(repliesRes.status).json({ error: repliesData.error || "Failed to fetch replies" });
    }

    return res.status(200).json({
      success: true,
      thread: latestThread,
      replies: repliesData.data || []
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
