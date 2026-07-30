// POST /api/tts : Generate natural French speech via OpenAI TTS
// Supports two accents: "france" (default) and "quebec"
// Uses tts-1 (fast, low latency) with streaming for instant playback

import { NextRequest, NextResponse } from 'next/server';

// Voice mapping for French accents
// France: "nova" — clear, natural female French diction
// Quebec: "nova" same voice but text is left untouched — 
//   OpenAI TTS doesn't truly support accent switching,
//   the difference will come from a future ElevenLabs integration.
//   For now both use the same high-quality French voice.
const VOICE_MAP: Record<string, string> = {
  france: 'nova',   // clear, warm female voice — excellent French pronunciation
  quebec: 'nova',   // same voice for now — accent québécois planned via ElevenLabs
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
    
    // Send clean text directly — no prefix injection
    // (OpenAI TTS reads ALL text literally, prefixes corrupt the audio)
    const ttsInput = trimmedText;

    const voice = VOICE_MAP[accent] || VOICE_MAP.france;
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed));

    // Use tts-1 (not tts-1-hd) for much lower latency and cleaner sound
    // tts-1 has ~2-3x faster generation with less reverb/echo artifacts
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: ttsInput,
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

    // Buffer the full response then send — more reliable across
    // browsers than streaming (avoids partial decode issues)
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
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
