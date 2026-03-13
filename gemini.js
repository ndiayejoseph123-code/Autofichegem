exports.handler = async (event) => {
  // Autoriser uniquement les requêtes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  // Clé API lue depuis les variables d'environnement Netlify (jamais exposée au client)
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

  if (!lesson) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Le titre de la leçon est requis' }) };
  }

  const prompt = `en respectant cette balise,
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
#ETAPE1_TITRE: <Titre 1>
#ETAPE1_MAITRE: <Maître 1>
#ETAPE1_ELEVES: <Élèves 1>
#ETAPE2_TITRE: <Titre 2>
#ETAPE2_MAITRE: <Maître 2>
#ETAPE2_ELEVES: <Élèves 2>
#ETAPE3_TITRE: <Titre 3>
#ETAPE3_MAITRE: <Maître 3>
#ETAPE3_ELEVES: <Élèves 3>
#ETAPE4_TITRE: <Titre 4>
#ETAPE4_MAITRE: <Maître 4>
#ETAPE4_ELEVES: <Élèves 4>
#ETAPE5_TITRE: <Titre 5>
#ETAPE5_MAITRE: <Maître 5>
#ETAPE5_ELEVES: <Élèves 5>
fait moi une fiche pedagogique sur: ${lesson}`;

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
