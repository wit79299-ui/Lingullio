// POST /api/evaluate/eo-dialogue : Interactive EO dialogue with AI examiner
// The AI plays the TEF examiner role, responding to the candidate in real-time

import { NextRequest, NextResponse } from 'next/server';

interface DialogueTurn {
  role: 'candidate' | 'examiner';
  text: string;
}

interface DialogueRequest {
  scenario: string;       // scenario title/description
  section: 'A' | 'B';    // Section A (information) or Section B (argumentation)
  history: DialogueTurn[];// conversation so far
  candidateText: string;  // latest candidate utterance
  turnNumber: number;     // which turn we're on (1-based)
}

interface DialogueResponse {
  examinerReply: string;         // what the examiner says next
  feedbackHint?: string;         // brief coaching tip shown after
  shouldEnd: boolean;            // true if conversation should wrap up
  interimScore?: {               // partial scoring after a few turns
    fluency: number;             // 1-5
    vocabulary: number;          // 1-5
    interaction: number;         // 1-5
    connectors: number;          // 1-5
    register: number;            // 1-5
    comment: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json({ error: 'Clé API OpenAI non configurée' }, { status: 500 });
    }

    const body: DialogueRequest = await req.json();
    const { scenario, section, history, candidateText, turnNumber } = body;

    if (!candidateText?.trim()) {
      return NextResponse.json({ error: 'Texte du candidat requis' }, { status: 400 });
    }

    const maxTurns = section === 'A' ? 5 : 8;
    const shouldEnd = turnNumber >= maxTurns;
    const shouldScore = turnNumber >= 3 && turnNumber % 2 === 0; // score every 2 turns from turn 3

    const systemPrompt = `Tu es un examinateur officiel du TEF Canada pour l'épreuve d'Expression orale, Section ${section}.
${section === 'A' ? 
  "Section A : Le candidat doit obtenir des renseignements dans une situation quotidienne. Tu joues l'interlocuteur (employé, agent, etc.). Tu dois :\n- Répondre de manière réaliste mais poser des questions retour\n- Parfois faire des objections polies (délai, indisponibilité, conditions)\n- Tester si le candidat sait reformuler et relancer" :
  "Section B : Le candidat doit te convaincre à partir d'un document. Tu joues un interlocuteur sceptique mais ouvert. Tu dois :\n- Poser des objections (prix, utilité, praticité, expérience passée)\n- Parfois demander des précisions ou des exemples\n- Ne pas céder trop vite mais accepter si l'argument est solide"}

Scénario : "${scenario}"

Règles :
- Réponds en français, registre courant à soutenu (comme un vrai examinateur TEF)
- Tes répliques font 1-3 phrases maximum
- Varie tes types de relances (objection, question, précision, accord partiel)
- ${shouldEnd ? "C'est le dernier tour. Conclus poliment la conversation." : `Tour ${turnNumber}/${maxTurns}.`}
${shouldScore ? "Après ta réplique, fournis aussi une évaluation intermédiaire du candidat." : ""}

Historique de la conversation :
${history.map(h => `${h.role === 'candidate' ? 'Candidat' : 'Examinateur'} : ${h.text}`).join('\n')}

Le candidat vient de dire : "${candidateText}"

Réponds en JSON :
{
  "examinerReply": "ta réplique d'examinateur",
  "feedbackHint": "un conseil bref et encourageant pour le candidat (1 phrase)"${shouldScore ? `,
  "interimScore": {
    "fluency": <1-5>,
    "vocabulary": <1-5>,
    "interaction": <1-5>,
    "connectors": <1-5>,
    "register": <1-5>,
    "comment": "commentaire bref"
  }` : ''}
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: candidateText },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', errText);
      return NextResponse.json({ error: 'Erreur API OpenAI' }, { status: 502 });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    const result: DialogueResponse = {
      examinerReply: parsed.examinerReply || "Intéressant. Pouvez-vous m'en dire plus ?",
      feedbackHint: parsed.feedbackHint,
      shouldEnd,
      interimScore: parsed.interimScore,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('EO dialogue error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
