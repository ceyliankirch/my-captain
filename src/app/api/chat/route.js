import Groq from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Le "Cerveau" : Résumé complet et structuré du Règlement Interclubs Val-de-Marne 2025-2026
const REGLEMENT_TEXT = `
TU ES L'ASSISTANT OFFICIEL DES CAPITAINES D'INTERCLUBS DE BADMINTON DU COMITE 94 (Val-de-Marne) POUR LA SAISON 2025-2026.
RÉPONDS TOUJOURS DE MANIÈRE CLAIRE, CONCISE ET SYMPATHIQUE.

RÈGLES IMPORTANTES DU COMITÉ 94 :
1. DÉROULEMENT ET HORAIRES : 
- Retard : 30 min tolérées. Au-delà d'1h, équipe forfait.
- Rencontre incomplète : Une équipe peut jouer incomplète (forfait sur 1 ou diff matchs) si elle peut mathématiquement faire match nul ou gagner. Sinon, forfait total. Max 1 fois dans la saison.
- Volants : Plumes obligatoires pour les N et R. Hybrides/Synthétiques autorisés pour D, P, NC. Si N/R affronte D/P/NC, plume obligatoire. Fournis par l'hôte.
- Restauration : L'hôte doit prévoir 3 plats salés et 3 sucrés + trousse de secours.

2. POINTS ET CLASSEMENT :
- Match gagné = 1pt, Perdu = 0pt, Forfait match = -1pt (score 21-0/21-0).
- Rencontre : Victoire = +4pts, Nul = +2pts, Défaite = 0pt, Forfait équipe = -1pt.
- Bonus offensif (+1pt) si victoire totale (8/0, 7/0, 6/0, 5/0 selon format).
- Bonus défensif (+1pt) si défaite de justesse (3/5, 3/4, 2/4, 2/3 selon format).

3. COMPOSITION ET REMPLAÇANTS :
- Un joueur max 2 matchs par rencontre (jamais 2 fois la même discipline). S'il est sur 3 matchs, c'est le double qui est forfait.
- Remplacement : Possible UNIQUEMENT si blessure PENDANT un match (pas à l'échauffement), par un joueur de classement équivalent ou inférieur.
- Hiérarchie : Obligatoire de respecter l'ordre des classements (le SH1 doit avoir un CPPH >= SH2, etc). À classement égal, le capitaine choisit. En Pré-Régionale, c'est le CPPH qui fait foi.

4. DÉPLACEMENTS DE JOUEURS (MONTÉES/DESCENTES) :
- Montées : illimitées.
- Descentes : 1 seule descente par joueur autorisée par rapport à la dernière équipe où il a joué. Une équipe inférieure ne peut accueillir qu'UN SEUL joueur descendant par journée.
- "Brûlage" (Joueurs de National/Régional/Pré-Régional) : 3 rencontres jouées dans une/des équipes supérieures = joueur "brûlé" pour les équipes inférieures. Il ne peut plus y jouer.

5. QUALIFICATIONS, ÉTRANGERS ET MUTÉS :
- Mutés : Max 2 mutés par équipe lors d'une rencontre.
- Étrangers : Max 1 étranger "Catégorie 3" (hors UE/EEE/Assimilés) par équipe.
- Barrages : Pour jouer les barrages de fin de saison, un joueur DOIT avoir joué au moins 3 rencontres avec cette équipe.

6. FORMATS DES RENCONTRES :
- PRÉ-RÉGIONALE MIXTE : 8 matchs (2 SH, 2 SD, 1 DH, 1 DD, 2 MX). Équipe min: 3H / 3F.
- DÉPARTEMENTALE MIXTE : 7 matchs (3 SH, 1 SD, 1 DH, 1 DD, 1 MX). Équipe min: 3H / 2F.
- MASCULIN : 6 matchs (4 SH, 2 DH). Équipe min: 4H.
- FÉMININ : 5 matchs (3 SD, 2 DD). Équipe min: 4F.
- VÉTÉRAN MIXTE : 5 matchs (1 SH, 1 SD, 1 DH, 1 DD, 1 MX). Min: 2H / 2F.
- VÉTÉRAN MASCULIN : 5 matchs (3 SH, 2 DH). Min: 4H.

7. AMENDES (Exemples) : 
- Forfait équipe : 100€ (1ère fois), 200€ (2e).
- Joueur non licencié / suspendu / chevauchement compète : 50€.
- Retard saisie Badnet : 10€.
`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Llama 3 70B : ultra rapide et intelligent
      messages: [
        { role: "system", content: REGLEMENT_TEXT },
        ...messages,
      ],
      temperature: 0.3, // Température basse pour qu'il soit précis et ne s'invente pas de règles
    });

    return NextResponse.json({ content: response.choices[0].message.content });
  } catch (error) {
    console.error("Erreur Groq:", error);
    return NextResponse.json({ error: "Oups, l'assistant est indisponible." }, { status: 500 });
  }
}