export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Securely load the API key from Vercel's hidden environment variables
  // (This process runs on Vercel's secure servers, NOT in the user's browser)
  const apiKey = process.env.VITE_GEMINI_API_KEY; 

  // Google's public, lightning-fast Gemini 1.5 Flash model
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    // Forward the exact request from our game to Google
    const googleRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    // Send Google's response back to our game
    const data = await googleRes.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Failed to communicate with Gemini API' });
  }
}