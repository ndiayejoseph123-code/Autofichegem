exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé API non configurée' }) };
  }

  let lesson;
  try {
    ({ lesson } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
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
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Erreur Groq ' + groqRes.status);
    }

    const groqData = await groqRes.json();
    const result = groqData?.choices?.[0]?.message?.content;

    if (!result) throw new Error('Réponse vide de Groq');

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
