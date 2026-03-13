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

  // Charger les deux JSON du programme depuis GitHub
  let contexte = '';
  const urls = [
    'https://raw.githubusercontent.com/ndiayejoseph123-code/Mirass/main/miroir_assane_ndiaye.json',
    'https://raw.githubusercontent.com/ndiayejoseph123-code/Mirass/main/CEB_etape3_langue.json'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        contexte += JSON.stringify(data).slice(0, 6000) + '\n';
      }
    } catch (e) {
      console.warn('Impossible de charger:', url, e);
    }
  }

  const prompt = `Tu es un assistant pédagogique spécialisé dans l'éducation primaire sénégalaise.
Voici le contenu officiel du programme CEB (Curriculum de l'Education de Base) du Sénégal à utiliser comme référence :

${contexte}

En te basant UNIQUEMENT sur ce programme officiel, génère une fiche pédagogique complète et détaillée en respectant exactement ces balises :

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
