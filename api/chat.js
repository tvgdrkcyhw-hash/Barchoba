export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.VITE_GEMINI_API_KEY; 

  // Check if Vercel has the API key
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing in Vercel Environment Variables' });
  }

  // Google's public, lightning-fast Gemini 1.5 Flash model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    // Forward the exact request from our game to Google
    const googleRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await googleRes.json();

    // If Google rejects the request (e.g. invalid API key), pass the actual error status!
    if (!googleRes.ok) {
      console.error("Google API Error:", data);
      return res.status(googleRes.status).json(data);
    }
    
    // Otherwise, send Google's successful response back to our game
    res.status(200).json(data);
    
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}