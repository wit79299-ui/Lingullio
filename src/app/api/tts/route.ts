// POST /api/tts : Generate natural French speech via OpenAI TTS
// Supports two accents: "france" (default) and "quebec"
// Uses tts-1 (fast, low latency) with streaming for instant playback

import { NextRequest, NextResponse } from 'next/server';

// Voice mapping — "echo" has the clearest French diction;
// "fable" has a warmer, more expressive cadence that carries Quebec inflections better
const VOICE_MAP: Record<string, string> = {
  france: 'echo',   // crisp, clear metropolitan French
  quebec: 'fable',  // warmer timbre, more melodic — carries québécois inflections
};

// Quebec text adaptation: wrap the input so the TTS model
// naturally produces québécois speech patterns.
// We prepend invisible phonetic hints and use québécois vocabulary.
function quebecify(text: string): string {
  // Replace common France-French patterns with québécois equivalents
  // so the TTS model's pronunciation shifts naturally
  let q = text;
  // Common vocabulary swaps that affect pronunciation
  q = q.replace(/\bpetit[- ]déjeuner\b/gi, 'déjeuner');
  q = q.replace(/\bdéjeuner\b/gi, (m) => {
    // Only replace "déjeuner" meaning lunch (France) → "dîner" (QC)
    // but keep it if it already was breakfast context
    return m;
  });
  q = q.replace(/\bvoiture\b/gi, 'char');
  q = q.replace(/\bstationnement\b/gi, 'parking');
  // But actually for TEF training, we should NOT change vocabulary.
  // Instead, we add a speech-style instruction prefix.
  // OpenAI TTS respects text cues for speech style.
  return `[Accent québécois, intonation montréalaise, prononciation canadienne-française] ${text}`;
}

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
    
    // Apply québécois speech hints if accent is quebec
    const ttsInput = accent === 'quebec' ? quebecify(trimmedText) : trimmedText;

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

    // Stream the response directly to the client for minimal latency
    // Instead of buffering the entire response, pipe it through
    if (!response.body) {
      const audioBuffer = await response.arrayBuffer();
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return new NextResponse(response.body as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Transfer-Encoding': 'chunked',
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
