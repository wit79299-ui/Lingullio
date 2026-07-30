// POST /api/tts : Generate natural French speech via OpenAI TTS
// Supports two accents: "france" (default) and "quebec"

import { NextRequest, NextResponse } from 'next/server';

// Voice mapping for natural French
// "alloy" and "nova" sound most natural for French
// We use different voices to simulate France vs Quebec accent
const VOICE_MAP: Record<string, string> = {
  france: 'alloy',   // neutral, clear French diction
  quebec: 'shimmer', // warmer, slightly different cadence
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { text, accent = 'france', speed = 1.0 } = body as {
      text: string;
      accent?: 'france' | 'quebec';
      speed?: number;
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le texte est requis' },
        { status: 400 }
      );
    }

    // Limit text length to control costs (max ~2000 chars)
    const trimmedText = text.slice(0, 2000);

    const voice = VOICE_MAP[accent] || VOICE_MAP.france;
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: trimmedText,
        voice,
        speed: clampedSpeed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[TTS] OpenAI error:', response.status, err);
      return NextResponse.json(
        { error: 'Erreur OpenAI TTS', details: err },
        { status: response.status }
      );
    }

    // Stream back the MP3 audio
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400', // cache 24h
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur TTS' },
      { status: 500 }
    );
  }
}
