// POST /api/evaluate/speaking : AI evaluation of TEF Expression orale
// Uses GPT-4o-mini to score speech transcripts on official TEF EO criteria

import { NextRequest, NextResponse } from 'next/server';

interface SpeakingEvaluation {
  scores: {
    fluidite: { score: number; max: number; feedback: string };
    richesseLexicale: { score: number; max: number; feedback: string };
    interaction: { score: number; max: number; feedback: string };
    connecteurs: { score: number; max: number; feedback: string };
    registre: { score: number; max: number; feedback: string };
  };
  totalScore: number;
  maxScore: number;
  estimatedNCLC: number;
  globalFeedback: string;
  strengths: string[];
  improvements: string[];
  suggestedRephrasing: { original: string; improved: string; why: string }[];
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
    const { transcript, scenario, durationSeconds, variant } = body as {
      transcript: string;
      scenario: string;
      durationSeconds: number;
      variant?: { type: string; examinerLine: string; expectedSkill: string };
    };

    if (!transcript || transcript.trim().length < 5) {
      return NextResponse.json(
        { error: 'Transcription trop courte pour être évaluée' },
        { status: 400 }
      );
    }

    const systemPrompt = `Tu es un examinateur certifié du TEF Canada (Test d'Évaluation de Français).
Tu évalues l'Expression orale d'un candidat à partir de la transcription de sa réponse.

CRITÈRES D'ÉVALUATION (chacun sur 20 points) :

1. Fluidité et aisance (0-20) :
   - NCLC 5-6 : Pauses fréquentes, phrases courtes mais compréhensibles
   - NCLC 7 : Discours assez fluide, hésitations occasionnelles
   - NCLC 8-9 : Fluidité naturelle, rythme soutenu

2. Richesse du vocabulaire (0-20) :
   - NCLC 5-6 : Vocabulaire basique, répétitions
   - NCLC 7 : Vocabulaire varié, quelques synonymes
   - NCLC 8-9 : Vocabulaire précis et nuancé, registre adapté

3. Capacité d'interaction (0-20) : LE CRITÈRE LE PLUS DÉTERMINANT
   - NCLC 5-6 : Répond aux questions directement
   - NCLC 7 : Reformule, relance, pose des questions
   - NCLC 8-9 : Négocie, argumente, rebondit naturellement

4. Utilisation de connecteurs (0-20) :
   - NCLC 5-6 : et, mais, donc, parce que
   - NCLC 7 : cependant, par ailleurs, en revanche, effectivement
   - NCLC 8-9 : néanmoins, en l'occurrence, force est de constater

5. Registre de langue (0-20) :
   - NCLC 5-6 : Registre courant, quelques familiarités
   - NCLC 7 : Registre adapté à la situation
   - NCLC 8-9 : Maîtrise du registre formel et informel

CONTEXTE IMPORTANT :
- La transcription vient de la reconnaissance vocale (Web Speech API), donc peut contenir des erreurs de transcription
- Ne pénalise PAS les erreurs qui semblent être des erreurs de reconnaissance vocale plutôt que du candidat
- Le candidat parle en français (France ou Québec)
- Évalue ce qui a été DIT, pas la qualité de la transcription

IMPORTANT : Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

    const variantContext = variant
      ? `\nVARIANTE DE L'EXAMINATEUR : ${variant.type}\nRéplique de l'examinateur : ${variant.examinerLine}\nCompétence attendue : ${variant.expectedSkill}`
      : '';

    const userPrompt = `SCÉNARIO : ${scenario}${variantContext}

DURÉE DE LA RÉPONSE : ${durationSeconds} secondes

TRANSCRIPTION DU CANDIDAT :
"""
${transcript}
"""

Évalue cette production orale et retourne un JSON avec cette structure exacte :
{
  "scores": {
    "fluidite": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "richesseLexicale": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "interaction": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "connecteurs": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "registre": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" }
  },
  "totalScore": <somme>,
  "maxScore": 100,
  "estimatedNCLC": <4-12>,
  "globalFeedback": "<appréciation globale, 2-3 phrases>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "improvements": ["<amélioration 1>", "<amélioration 2>"],
  "suggestedRephrasing": [
    { "original": "<ce que le candidat a dit>", "improved": "<version améliorée>", "why": "<explication>" }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[EvalSpeaking] OpenAI error:', response.status, err);
      return NextResponse.json(
        { error: 'Erreur OpenAI', details: err },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'Réponse vide de l\'API' },
        { status: 500 }
      );
    }

    const evaluation: SpeakingEvaluation = JSON.parse(content);

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('[EvalSpeaking] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur d\'évaluation' },
      { status: 500 }
    );
  }
}
