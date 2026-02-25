import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';

const BAREME_POINTS = {
    'N1': 93, 'N2': 48, 'N3': 39, 'R4': 30, 'R5': 24, 'R6': 18,
    'D7': 12, 'D8': 9, 'D9': 6, 'P10': 3, 'P11': 2, 'P12': 1, 'NC': 0
};

function getSaisonActuelle() {
    const today = new Date();
    const month = today.getMonth(); 
    const year = today.getFullYear();
    let startYear = (month >= 8) ? year : year - 1;
    return `Saison ${startYear}-${startYear + 1}`;
}

function extraireInfosEquipe(texte) {
    if (!texte) return null;
    const match = texte.match(/\(([\w\d-]+)\)/);
    if (!match) return null;
    const contenu = match[1]; 
    const parties = contenu.split('-'); 
    if (parties.length < 2) return null; 
    const numero = parseInt(parties[parties.length - 1], 10);
    const sigle = parties[parties.length - 2];
    if (isNaN(numero)) return null;
    return { sigle, num: numero };
}

function extractRencontreId(href) {
    if (!href) return null;
    const match = href.match(/\/rencontre\/(\d+)/);
    return match ? match[1] : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) return NextResponse.json({ error: "URL manquante" }, { status: 400 });

  try {
    const response = await fetch(targetUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    let configEquipe = { sigle: null, num: null };
    $('h1, h2, .uk-card-title, .uk-text-lead').each((_, el) => {
        const infos = extraireInfosEquipe($(el).text());
        if (infos) configEquipe = infos;
    });

    // --- RECHERCHE DES 3 DERNIERES RENCONTRES ---
    const rencontresEquipeIds = [];
    $('a[href*="/rencontre/"]').each((_, el) => {
        const parentTr = $(el).closest('tr');
        if (/\d+\s*-\s*\d+/.test(parentTr.text())) {
            const matchId = extractRencontreId($(el).attr('href'));
            if (matchId && !rencontresEquipeIds.includes(matchId)) {
                rencontresEquipeIds.push(matchId);
            }
        }
    });
    const last3Ids = rencontresEquipeIds.slice(-3);
    const canCheckInactivity = last3Ids.length >= 3;

    // --- RECHERCHE COMPO TYPE OFFICIELLE ---
    const compoTypeOfficielle = [];
    $('td').filter(function() {
        const txt = $(this).text().trim();
        return ['SH1', 'SH2', 'SH3', 'SD1', 'SD2', 'DH1', 'DH2', 'DD1', 'DX1', 'DX2'].includes(txt);
    }).each(function() {
        const match = $(this).text().trim();
        const noms = [];
        $(this).next('td').find('a[href*="/joueur/"]').each((_, a) => noms.push($(a).text().trim()));
        compoTypeOfficielle.push({ match, joueurs: noms });
    });

    const joueursBase = [];

    $('a[href*="/joueur/"]').each((_, el) => {
      const nom = $(el).text().trim();
      if (!nom) return;
      const row = $(el).closest('tr');
      let genre = 'H';
      if (row.find('.fa-female').length > 0 || row.text().includes('SD') || row.text().includes('DD')) genre = 'F';
      const parentTexte = $(el).parent().text();
      const isMute = parentTexte.includes('Muté') || row.find('.orange').length > 0;
      let linkHref = $(el).attr('href');
      const profilUrl = linkHref.startsWith('http') ? linkHref : `https://icbad.ffbad.org${linkHref}`;
      if (!joueursBase.find(j => j.nom === nom)) {
        joueursBase.push({ nom, genre, isMute, profilUrl });
      }
    });

    const joueursComplets = await Promise.all(joueursBase.map(async (joueur) => {
        try {
            const res = await fetch(joueur.profilUrl);
            const profilHtml = await res.text();
            const $p = cheerio.load(profilHtml);
            
            let clsmts = [];
            let cotes = [];
            $p('.ic-match-clsmt').each((index, badge) => {
                if(index < 3) {
                    clsmts.push($p(badge).text().trim().toUpperCase());
                    cotes.push(parseFloat($p(badge).attr('data-cote')) || 0);
                }
            });
            
            const clst = { S: clsmts[0] || 'NC', D: clsmts[1] || 'NC', M: clsmts[2] || 'NC' };
            const cpphs = { S: cotes[0] || 0, D: cotes[1] || 0, M: cotes[2] || 0 };

            let maxPoints = 0;
            clsmts.forEach(c => {
                const pts = BAREME_POINTS[c] || 0;
                if (pts > maxPoints) maxPoints = pts;
            });

            let currentSeasonText = null;
            let stats = { S: 0, D: 0, M: 0 };
            let paires = { doubles: {}, mixtes: {} };
            
            let matchsJoueurIds = [];
            let rencontresUniquesIds = new Set();
            let rencontresSupUniques = new Set(); // Pour le calcul des brûlés

            $p('table.matchs-joueur tr').each((_, row) => {
                const $row = $p(row);
                const rowText = $row.text().trim().toUpperCase();
                
                if (rowText.includes("SAISON 20")) {
                    if (currentSeasonText === null) currentSeasonText = rowText;
                    else if (rowText !== currentSeasonText) return false;
                }
                
                if (currentSeasonText !== null) {
                    const lienMatch = $row.find('a[href*="/rencontre/"]');
                    if (lienMatch.length > 0) {
                        const idMatch = extractRencontreId(lienMatch.attr('href'));
                        if (idMatch) {
                            matchsJoueurIds.push(idMatch);
                            
                            // CALCUL BARRAGES : Seulement pour l'équipe actuelle
                            if (configEquipe.sigle && rowText.includes(configEquipe.sigle.toUpperCase())) {
                                rencontresUniquesIds.add(idMatch);
                            }

                            // CALCUL BRÛLÉS : Vérifier s'il a joué dans une équipe supérieure
                            const rawTeams = rowText.match(/\([\w\d-]+\)/g);
                            if (rawTeams && configEquipe.sigle) {
                                rawTeams.forEach(teamStr => {
                                    const infoTeam = extraireInfosEquipe(teamStr);
                                    if (infoTeam && infoTeam.sigle === configEquipe.sigle) {
                                        if (infoTeam.num < configEquipe.num) {
                                            rencontresSupUniques.add(idMatch);
                                        }
                                    }
                                });
                            }
                        }
                    }
                    
                    const tdPartenaire = $row.find('td').eq(3);
                    const lienPartenaire = tdPartenaire.find('a[href*="/joueur/"]');
                    let partenaireUrl = null;
                    if (lienPartenaire.length > 0) {
                        let href = lienPartenaire.attr('href');
                        partenaireUrl = href.startsWith('http') ? href : `https://icbad.ffbad.org${href}`;
                    }
                    
                    if (/\b(SH|SD)\b/.test(rowText)) stats.S++;
                    if (/\b(DH|DD)\b/.test(rowText)) {
                        stats.D++;
                        if (partenaireUrl) paires.doubles[partenaireUrl] = (paires.doubles[partenaireUrl] || 0) + 1;
                    }
                    if (/\b(DX|MX)\b/.test(rowText)) {
                        stats.M++;
                        if (partenaireUrl) paires.mixtes[partenaireUrl] = (paires.mixtes[partenaireUrl] || 0) + 1;
                    }
                }
            });

            const profilPrive = clsmts.length === 0;
            
            // INACTIF (Absent)
            let isInactif = false;
            if (canCheckInactivity && !profilPrive) {
                const aJoueRecemment = last3Ids.some(id => matchsJoueurIds.includes(id));
                if (!aJoueRecemment) isInactif = true;
            }

            // BARRAGES
            const nbRencontresJouees = rencontresUniquesIds.size;
            const isQualifieBarrage = nbRencontresJouees >= 3 || profilPrive;

            // BRÛLÉ
            const isBrule = rencontresSupUniques.size >= 3;

            return { ...joueur, pointsPoids: maxPoints, clst, cpphs, isInactif, stats, paires, nbRencontresJouees, isQualifieBarrage, isBrule, isEquipeType: false };
        } catch (e) {
            return { ...joueur, pointsPoids: 0, clst: {S:'NC',D:'NC',M:'NC'}, cpphs: {S:0,D:0,M:0}, isInactif: false, stats: { S: 0, D: 0, M: 0 }, paires: {doubles:{}, mixtes:{}}, nbRencontresJouees:0, isQualifieBarrage:true, isBrule: false, isEquipeType: false };
        }
    }));

    let hommes = joueursComplets.filter(j => j.genre === 'H').sort((a,b) => b.pointsPoids - a.pointsPoids);
    let femmes = joueursComplets.filter(j => j.genre === 'F').sort((a,b) => b.pointsPoids - a.pointsPoids);
    let poidsEquipe = 0;
    
    for(let i=0; i<3; i++) { if(hommes[i]) { poidsEquipe += hommes[i].pointsPoids; hommes[i].isEquipeType = true; } }
    for(let i=0; i<2; i++) { if(femmes[i]) { poidsEquipe += femmes[i].pointsPoids; femmes[i].isEquipeType = true; } }

    return NextResponse.json({ success: true, equipe: configEquipe, poidsEquipe, compoTypeOfficielle, joueurs: joueursComplets });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur d'analyse." }, { status: 500 });
  }
}