// Cat Translator — Backend Server
// Holds your Gemini API key securely. Users never see it.
//
// SETUP:
//   1. npm install
//   2. Create a .env file with: GEMINI_API_KEY=your_key_here
//   3. node server.js
//
// DEPLOY FREE on Railway / Render / Vercel — just add GEMINI_API_KEY as an env variable.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error('❌  GEMINI_API_KEY is missing! Add it to your .env file.');
  process.exit(1);
}

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve the frontend (index.html) from the same folder
app.use(express.static(path.join(__dirname)));

// ─── Translate endpoint ───────────────────────────────────────────────────────
app.post('/api/translate', async (req, res) => {
  const { audioBase64, mimeType } = req.body;

  if (!audioBase64 || !mimeType) {
    return res.status(400).json({ error: 'audioBase64 and mimeType are required.' });
  }

  const supportedMime =
    mimeType.includes('webm') ? 'audio/webm' :
    mimeType.includes('mp4') || mimeType.includes('m4a') ? 'audio/mp4' :
    mimeType.includes('wav') ? 'audio/wav' :
    mimeType.includes('ogg') ? 'audio/ogg' : 'audio/mpeg';

  const prompt = `You are an expert in cat behaviour and animal communication. I am sharing an audio recording with you. Please listen to it carefully.

If the audio contains a cat sound (meow, purr, hiss, chirp, trill, yowl, etc.), analyse it and respond ONLY in this exact JSON format:
{
  "emoji": "(one relevant emoji)",
  "title": "(short phrase max 6 words — what the cat is saying)",
  "description": "(2-3 friendly sentences explaining what the cat likely means, for a cat owner)",
  "tip": "(one practical tip for the owner on how to respond)"
}

If the audio does NOT contain a cat sound (silence, human voice, background noise, music, etc.), respond ONLY with:
{
  "emoji": "🤔",
  "title": "No cat sound detected",
  "description": "I could not hear a clear cat sound in this recording. It may be silence, background noise, or a human voice.",
  "tip": "Try recording again when your cat is actively meowing or purring. Hold the mic closer to your cat!"
}

Respond ONLY with the JSON object. No extra text, no markdown, no explanation.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: supportedMime, data: audioBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return res.status(geminiRes.status).json({ error: err.error?.message || 'Gemini API error' });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.json(result);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🐱 Cat Translator running at http://localhost:${PORT}`);
});
