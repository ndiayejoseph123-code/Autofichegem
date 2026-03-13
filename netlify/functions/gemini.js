exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé API non configurée' }) };
  }

  let lesson;
  try {
    ({ lesson } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  const lessonLower = lesson.toLowerCase();

  // Détecter la classe
  const isCM2 = lessonLower.includes('cm2');
  const isCM1 = lessonLower.includes('cm1');
  const isCE2 = lessonLower.includes('ce2');
  const isCE1 = lessonLower.includes('ce1');

  // Détecter la matière
  const isEDD = lessonLower.includes('edd') || lessonLower.includes('développement durable') || lessonLower.includes('environnement') || lessonLower.includes('santé');
  const isDecouverte = lessonLower.includes('histoire') || lessonLower.includes('géographie') || lessonLower.includes('découverte') || lessonLower.includes('ist');
  const isLangue = lessonLower.includes('français') || lessonLower.includes('lecture') || lessonLower.includes('grammaire') || lessonLower.includes('conjugaison') || lessonLower.includes('orthographe') || lessonLower.includes('vocabulaire') || lessonLower.includes('expression');

  const BASE = 'https://raw.githubusercontent.com/ndiayejoseph123-code/Mirass/main/';

  // Choisir les bons fichiers selon classe + matière
  let urls = [];

  if (isEDD && isCM2) urls.push(BASE + 'EDD_cm2.json');
  else if (isEDD && isCE2) urls.push(BASE + 'EDD_ce2.json');
  else if (isEDD) urls.push(BASE + 'EDD_cm2.json', BASE + 'EDD_ce2.json');
  else if (isDecouverte && isCM2) urls.push(BASE + 'decouverte_monde_cm2.json');
  else if (isDecouverte && isCM1) urls.push(BASE + 'decouverte_monde_cm2.json');
  else if (isLangue || isCM1 || isCM2) urls.push(BASE + 'CEB_etape3_langue.json', BASE + 'miroir_assane_ndiaye.json');
  else urls.push(BASE + 'CEB_etape3_langue.json', BASE + 'miroir_assane_ndiaye.json');

  // Charger les JSON sélectionnés
  let contexte = '';
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        contexte += JSON.stringify(data).slice(0, 5000) + '\n';
      }
    } catch (e) {
      console.warn('Impossible de charger:', url);
    }
  }

  const prompt = `Tu es un assistant pédagogique spécialisé dans l'éducation primaire sénégalaise.
Voici les extraits du programme officiel CEB du Sénégal correspondant à cette leçon :

${contexte}

En te basant UNIQUEMENT sur ce programme, génère une fiche pédagogique complète et détaillée en respectant exactement ces balises :

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
    const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    if (!mistralRes.ok) {
      const errData = await mistralRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Erreur Mistral ' + mistralRes.status);
    }

    const mistralData = await mistralRes.json();
    const result = mistralData?.choices?.[0]?.message?.content;
    if (!result) throw new Error('Réponse vide de Mistral');

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
