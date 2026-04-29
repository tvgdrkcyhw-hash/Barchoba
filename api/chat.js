export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure the API key has no accidental spaces or invisible newlines
  const apiKey = (process.env.VITE_GEMINI_API_KEY || '').trim();

  // Check if Vercel has the API key
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing in Vercel Environment Variables' });
  }

  // Using the exact, stable endpoint for Gemini 1.5 Flash
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    console.log(`[Backend API] Forwarding request to: ${model}`); // Debugging log to prove new code is running

    // Forward the exact request from our game to Google
    const googleRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await googleRes.json();

    // If Google rejects the request (e.g. invalid API key), pass the actual error status!
    if (!googleRes.ok) {
      console.error("[Backend API] Google API Error:", JSON.stringify(data, null, 2));
      return res.status(googleRes.status).json(data);
    }
    
    // Otherwise, send Google's successful response back to our game
    res.status(200).json(data);
    
  } catch (error) {
    console.error("[Backend API] Internal Error:", error);
    res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}