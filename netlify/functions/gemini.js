exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé API non configurée' }) };
  }

  let lesson;
  try {
    ({ lesson } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  // Charger les JSON du programme
  let contexte = '';
  const urls = [
    'https://raw.githubusercontent.com/ndiayejoseph123-code/Mirass/main/CEB_etape3_langue.json',
    'https://raw.githubusercontent.com/ndiayejoseph123-code/Mirass/main/miroir_assane_ndiaye.json'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        contexte += JSON.stringify(data) + '\n';
      }
    } catch (e) {
      console.warn('Impossible de charger:', url);
    }
  }

  const prompt = `Tu es un assistant pédagogique spécialisé dans l'éducation primaire sénégalaise.
Voici le contenu complet du programme officiel CEB du Sénégal :

${contexte}

En te basant UNIQUEMENT sur ce programme, génère une fiche pédagogique complète en respectant exactement ces balises :

#CLASSE: <Classe>
#DUREE: <Durée>
#DISCIPLINE: <Discipline>
#CB: <Compétence de base>
#PALIER: <Palier>
#SOUS_DOMAINE: <Sous-domaine>
#OA: <OA>
#OS: <OS>
#CONTENUS: <Contenus>
#MOYENS_MATERIELS: <Moyens matériels>
#MOYENS_PEDAGOGIQUES: <Moyens pédagogiques>
#DOCUMENTATION: <Documentation>
#ETAPE1_TITRE: <Titre étape 1>
#ETAPE1_MAITRE: <Ce que fait le maître>
#ETAPE1_ELEVES: <Ce que font les élèves>
#ETAPE2_TITRE: <Titre étape 2>
#ETAPE2_MAITRE: <Ce que fait le maître>
#ETAPE2_ELEVES: <Ce que font les élèves>
#ETAPE3_TITRE: <Titre étape 3>
#ETAPE3_MAITRE: <Ce que fait le maître>
#ETAPE3_ELEVES: <Ce que font les élèves>
#ETAPE4_TITRE: <Titre étape 4>
#ETAPE4_MAITRE: <Ce que fait le maître>
#ETAPE4_ELEVES: <Ce que font les élèves>
#ETAPE5_TITRE: <Titre étape 5>
#ETAPE5_MAITRE: <Ce que fait le maître>
#ETAPE5_ELEVES: <Ce que font les élèves>

Fiche pédagogique sur : ${lesson}`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    if (!geminiRes.ok) {
      const errData = await geminiRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Erreur Gemini ' + geminiRes.status);
    }

    const geminiData = await geminiRes.json();
    const result = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!result) throw new Error('Réponse vide de Gemini');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    };

  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: err.message })
    };
  }
};
