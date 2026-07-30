// POST /api/evaluate/writing : AI evaluation of TEF Expression écrite
// Uses GPT-4o-mini to score writing on the 5 official TEF criteria

import { NextRequest, NextResponse } from 'next/server';

interface WritingEvaluation {
  scores: {
    respectTache: { score: number; max: number; feedback: string };
    organisation: { score: number; max: number; feedback: string };
    richesseLexicale: { score: number; max: number; feedback: string };
    grammaire: { score: number; max: number; feedback: string };
    cinquiemeCritere: { score: number; max: number; feedback: string };
  };
  totalScore: number;
  maxScore: number;
  estimatedNCLC: number;
  globalFeedback: string;
  strengths: string[];
  improvements: string[];
  correctedExcerpts: { original: string; corrected: string; explanation: string }[];
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
    const { text, sujet, section, minWords, maxWords } = body as {
      text: string;
      sujet: string;
      section: 'A' | 'B';
      minWords: number;
      maxWords: number;
    };

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        { error: 'Texte trop court pour être évalué' },
        { status: 400 }
      );
    }

    const systemPrompt = `Tu es un examinateur certifié du TEF Canada (Test d'Évaluation de Français).
Tu évalues l'Expression écrite selon les 5 critères officiels de la grille TEF, chacun noté sur 20 points.

GRILLE DE CORRECTION :
1. Respect de la tâche (0-20) :
   - NCLC 5-6 : Structure basique respectée
   - NCLC 7 : Ton adapté au contexte
   - NCLC 8-9 : Nuances de registre maîtrisées

2. Organisation (0-20) :
   - NCLC 5-6 : Connecteurs simples (et, mais, donc)
   - NCLC 7 : Connecteurs intermédiaires (cependant, par ailleurs)
   - NCLC 8-9 : Connecteurs avancés (néanmoins, il n'en demeure pas moins que)

3. Richesse lexicale (0-20) :
   - NCLC 5-6 : Répétitions tolérées
   - NCLC 7 : Synonymes basiques utilisés
   - NCLC 8-9 : Vocabulaire précis, sans répétition

4. Grammaire (0-20) :
   - NCLC 5-6 : Erreurs fréquentes mais compréhensible
   - NCLC 7 : Erreurs occasionnelles
   - NCLC 8-9 : Quasi sans erreur

5. 5e critère : ${section === 'A' ? 'Qualité narrative (cohérence du récit, tension, progression)' : 'Qualité argumentative (thèse, arguments, contre-arguments, conclusion)'} (0-20) :
   - NCLC 5-6 : Simple
   - NCLC 7 : Structuré
   - NCLC 8-9 : Nuancé, contre-argument anticipé

CONSIGNES :
- Section ${section === 'A' ? 'A (fait divers, ' + minWords + '-' + maxWords + ' mots)' : 'B (argumentation, ' + minWords + '-' + maxWords + ' mots)'}
- Sois exigeant mais bienveillant : c'est un outil d'apprentissage
- Donne des exemples concrets de corrections
- Indique les forces ET les points d'amélioration
- Estime un niveau NCLC entre 4 et 12

IMPORTANT : Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

    const userPrompt = `SUJET : ${sujet}

TEXTE DU CANDIDAT :
"""
${text}
"""

Évalue ce texte et retourne un JSON avec cette structure exacte :
{
  "scores": {
    "respectTache": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "organisation": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "richesseLexicale": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "grammaire": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" },
    "cinquiemeCritere": { "score": <0-20>, "max": 20, "feedback": "<commentaire>" }
  },
  "totalScore": <somme>,
  "maxScore": 100,
  "estimatedNCLC": <4-12>,
  "globalFeedback": "<appréciation globale, 2-3 phrases>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "improvements": ["<amélioration 1>", "<amélioration 2>", "<amélioration 3>"],
  "correctedExcerpts": [
    { "original": "<extrait fautif>", "corrected": "<version corrigée>", "explanation": "<explication>" }
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
      console.error('[EvalWriting] OpenAI error:', response.status, err);
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

    const evaluation: WritingEvaluation = JSON.parse(content);

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('[EvalWriting] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur d\'évaluation' },
      { status: 500 }
    );
  }
}
