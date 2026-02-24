"use client";

import { useState, useEffect } from 'react';
import { 
  Trophy, Scale, Users, User, Flame, CheckCircle, BrainCircuit, 
  Star, Sparkles, Trash2, AlertTriangle, ShieldCheck, Search, SlidersHorizontal, FileText, ExternalLink, Crown
} from 'lucide-react';

const RankBadge = ({ rank, cpph }) => {
  let colorClass = 'bg-slate-400 text-white';
  if (rank?.startsWith('N')) colorClass = 'bg-red-500 text-white';
  else if (rank?.startsWith('R')) colorClass = 'bg-blue-500 text-white';
  else if (rank?.startsWith('D')) colorClass = 'bg-emerald-500 text-white';
  else if (rank?.startsWith('P')) colorClass = 'bg-yellow-400 text-slate-800';

  return (
    <span 
      className={`inline-block w-8 text-center py-1 rounded text-xs font-bold cursor-help shadow-sm transition hover:scale-110 ${colorClass}`}
      title={`${cpph || 0} CPPH`}
    >
      {rank || 'NC'}
    </span>
  );
};

export default function Home() {
  const [url, setUrl] = useState('');
  const [resultat, setResultat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIA, setShowIA] = useState(false);
  const [showCompoOfficielle, setShowCompoOfficielle] = useState(false);
  const [favoris, setFavoris] = useState([]);
  
  const [hideBrules, setHideBrules] = useState(false);
  const [hideAbsents, setHideAbsents] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  useEffect(() => {
    const savedFavs = localStorage.getItem('icbad_favoris');
    if (savedFavs) {
      try { setFavoris(JSON.parse(savedFavs)); } catch (e) { setFavoris([]); }
    }
  }, []);

  const isFavori = favoris.some(f => f.url === url);

  const analyserEquipe = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResultat(null);
    setShowIA(false);
    setShowCompoOfficielle(false);

    try {
      const response = await fetch(`/api/equipe?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Erreur serveur.");
      setResultat(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavori = () => {
    if (isFavori) {
      const newFavs = favoris.filter(f => f.url !== url);
      setFavoris(newFavs);
      localStorage.setItem('icbad_favoris', JSON.stringify(newFavs));
    } else {
      const nom = resultat?.equipe?.sigle 
        ? `${resultat.equipe.sigle} - Eq ${resultat.equipe.num}` 
        : `Équipe (${url.split('/').pop()})`;
      const newFavs = [...favoris, { url, nom }];
      setFavoris(newFavs);
      localStorage.setItem('icbad_favoris', JSON.stringify(newFavs));
    }
  };

  const supprimerFavori = (urlToRemove) => {
    const newFavs = favoris.filter(f => f.url !== urlToRemove);
    setFavoris(newFavs);
    localStorage.setItem('icbad_favoris', JSON.stringify(newFavs));
  };

  const getCompoIA = () => {
    if (!resultat) return null;
    const dispos = resultat.joueurs.filter(j => !j.isInactif && !j.isBrule);
    const hommes = dispos.filter(j => j.genre === 'H');
    const femmes = dispos.filter(j => j.genre === 'F');

    const sh = [...hommes].sort((a, b) => (b.cpphs?.S || 0) - (a.cpphs?.S || 0)).slice(0, 3);
    const sd = [...femmes].sort((a, b) => (b.cpphs?.S || 0) - (a.cpphs?.S || 0)).slice(0, 1);

    const trouverMeilleurePaire = (groupeA, groupeB, typeStats, typePaire) => {
      let maxMatches = 0;
      let meilleurePaire = null;
      for (let i = 0; i < groupeA.length; i++) {
        let startJ = (groupeA === groupeB) ? i + 1 : 0;
        for (let j = startJ; j < groupeB.length; j++) {
          const p1 = groupeA[i]; const p2 = groupeB[j];
          const m1 = p1.paires?.[typePaire]?.[p2.profilUrl] || 0;
          const m2 = p2.paires?.[typePaire]?.[p1.profilUrl] || 0;
          const totalCommuns = Math.max(m1, m2);
          if (totalCommuns > maxMatches) { maxMatches = totalCommuns; meilleurePaire = [p1, p2]; }
        }
      }
      if (maxMatches > 0 && meilleurePaire) return { joueurs: meilleurePaire, communs: maxMatches };
      if (groupeA === groupeB) {
         const fallback = [...groupeA].sort((a, b) => (b.stats?.[typeStats] || 0) - (a.stats?.[typeStats] || 0)).slice(0, 2);
         return { joueurs: fallback, communs: 0 };
      } else {
         const h = [...groupeA].sort((a, b) => (b.stats?.[typeStats] || 0) - (a.stats?.[typeStats] || 0))[0];
         const f = [...groupeB].sort((a, b) => (b.stats?.[typeStats] || 0) - (a.stats?.[typeStats] || 0))[0];
         return { joueurs: [h, f].filter(Boolean), communs: 0 };
      }
    };

    const dhData = trouverMeilleurePaire(hommes, hommes, 'D', 'doubles');
    const ddData = trouverMeilleurePaire(femmes, femmes, 'D', 'doubles');
    const dxData = trouverMeilleurePaire(hommes, femmes, 'M', 'mixtes');

    return { 
      sh, sd, 
      dh: dhData.joueurs, dhCommuns: dhData.communs,
      dd: ddData.joueurs, ddCommuns: ddData.communs,
      dx: { h: dxData.joueurs[0], f: dxData.joueurs[1] }, dxCommuns: dxData.communs
    };
  };

  const compo = getCompoIA();
  const nbDispos = resultat ? resultat.joueurs.filter(j => !j.isBrule && !j.isInactif).length : 0;

  let displayedPlayers = resultat?.joueurs || [];
  if (hideBrules) displayedPlayers = displayedPlayers.filter(j => !j.isBrule);
  if (hideAbsents) displayedPlayers = displayedPlayers.filter(j => !j.isInactif);
  if (sortBy !== 'default') {
    displayedPlayers = [...displayedPlayers].sort((a, b) => {
      return (b.cpphs?.[sortBy] || 0) - (a.cpphs?.[sortBy] || 0);
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto">
        
        <header className="mb-8 text-center relative">
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-2 flex items-center justify-center gap-3">
            <Trophy size={36} className="text-indigo-600" /> My Captain
          </h1>
          <p className="text-slate-500 mb-4">L'assistant ultime pour les capitaines ICBAD</p>
          
          {/* BOUTON VERS LE SITE ICBAD */}
          <a 
            href="https://icbad.ffbad.org" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-xs font-bold transition shadow-sm"
          >
            Accéder au site ICBAD <ExternalLink size={14} />
          </a>
        </header>

        {/* BLOC RECHERCHE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={analyserEquipe}>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-slate-700">Lien de la rencontre ICBAD :</label>
              {url.includes('icbad.ffbad.org') && (
                <button type="button" onClick={toggleFavori} className={`text-sm font-bold px-3 py-1 rounded-full transition flex items-center gap-1 ${isFavori ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <Star size={14} className={isFavori ? "fill-yellow-500" : ""} />
                  {isFavori ? 'Retirer des favoris' : 'Sauvegarder l\'équipe'}
                </button>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3">
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Ex: https://icbad.ffbad.org/equipe/..." className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" required />
              <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 min-w-[150px]">
                <Search size={18} /> {loading ? 'Analyse...' : 'Scanner'}
              </button>
            </div>
            {error && <p className="text-red-500 mt-3 text-sm font-medium text-right flex items-center justify-end gap-1"><AlertTriangle size={14}/> {error}</p>}
          </form>

          {favoris.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase flex items-center gap-1"><Star size={14} /> Mes équipes favorites</p>
              <div className="flex flex-wrap gap-2">
                {favoris.map((fav, index) => (
                  <div key={index} className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden group hover:border-indigo-300 transition">
                    <button type="button" onClick={() => setUrl(fav.url)} className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">{fav.nom}</button>
                    <button type="button" onClick={() => supprimerFavori(fav.url)} className="px-2 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition border-l border-slate-200"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {resultat && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
                <p className="text-slate-500 text-sm font-bold uppercase flex items-center gap-1 mb-1"><ShieldCheck size={16} /> Équipe</p>
                <p className="text-2xl font-black text-indigo-900">{resultat.equipe.sigle ? `${resultat.equipe.sigle} - Eq ${resultat.equipe.num}` : 'Inconnue'}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-center border-b-4 border-b-blue-500 flex flex-col items-center justify-center">
                <p className="text-slate-500 text-sm font-bold uppercase flex justify-center items-center gap-1 mb-1"><Scale size={16} /> Poids Règlementaire</p>
                <p className="text-3xl font-black text-blue-600">{resultat.poidsEquipe} <span className="text-lg">pts</span></p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
                <p className="text-slate-500 text-sm font-bold uppercase flex items-center gap-1 mb-1"><Users size={16} /> Joueurs Dispos</p>
                <p className="text-2xl font-black text-slate-800">{nbDispos} / {resultat.joueurs.length}</p>
              </div>
            </div>

            <div className="flex gap-4 mb-4 flex-col sm:flex-row">
              <button onClick={() => setShowCompoOfficielle(!showCompoOfficielle)} className="flex-1 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2">
                <FileText size={18} /> {showCompoOfficielle ? 'Masquer' : 'Voir'} Compo Type ICBAD
              </button>
              <button onClick={() => setShowIA(!showIA)} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2">
                <Sparkles size={18} /> {showIA ? 'Masquer' : 'Générer'} Compo IA
              </button>
            </div>

            {showCompoOfficielle && resultat.compoTypeOfficielle && (
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm animate-fade-in">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <FileText size={24} className="text-blue-600"/> Compo Type Officielle (ICBAD)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {resultat.compoTypeOfficielle.map((c, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
                      <span className="font-bold text-blue-700 block mb-2 border-b border-blue-50 pb-1">{c.match}</span>
                      {c.joueurs.map((joueurText, k) => (
                        <div key={k} className="text-xs font-semibold text-slate-700 flex justify-center items-center gap-1">
                           {joueurText}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showIA && compo && (
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm animate-fade-in">
                <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                  <BrainCircuit size={24} className="text-purple-600"/> Compo IA Stratégique
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-3 flex items-center gap-2"><User size={16}/> Simples</h4>
                    <ul className="space-y-2 text-sm">
                      {compo.sh[0] ? <li><span className="font-bold text-indigo-600 w-10 inline-block">SH1:</span> {compo.sh[0].nom}</li> : <li className="text-red-500">Manque H</li>}
                      {compo.sh[1] ? <li><span className="font-bold text-indigo-600 w-10 inline-block">SH2:</span> {compo.sh[1].nom}</li> : <li className="text-red-500">Manque H</li>}
                      {compo.sh[2] ? <li><span className="font-bold text-indigo-600 w-10 inline-block">SH3:</span> {compo.sh[2].nom}</li> : null}
                      <div className="h-2"></div>
                      {compo.sd[0] ? <li><span className="font-bold text-pink-600 w-10 inline-block">SD1:</span> {compo.sd[0].nom}</li> : <li className="text-red-500">Manque F</li>}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-3 flex items-center gap-2"><Users size={16}/> Doubles</h4>
                    <ul className="space-y-2 text-sm">
                      <li><span className="font-bold text-indigo-600 w-10 inline-block">DH :</span></li>
                      {compo.dh[0] ? <li className="ml-10 text-slate-700">- {compo.dh[0].nom}</li> : null}
                      {compo.dh[1] ? <li className="ml-10 text-slate-700">- {compo.dh[1].nom}</li> : null}
                      {compo.dhCommuns > 0 && <li className="ml-10 text-xs text-indigo-500 italic mt-1 font-semibold">✨ Paire ({compo.dhCommuns}m)</li>}
                      <div className="h-4"></div>
                      <li><span className="font-bold text-pink-600 w-10 inline-block">DD :</span></li>
                      {compo.dd[0] ? <li className="ml-10 text-slate-700">- {compo.dd[0].nom}</li> : null}
                      {compo.dd[1] ? <li className="ml-10 text-slate-700">- {compo.dd[1].nom}</li> : null}
                      {compo.ddCommuns > 0 && <li className="ml-10 text-xs text-pink-500 italic mt-1 font-semibold">✨ Paire ({compo.ddCommuns}m)</li>}
                    </ul>
                  </div>

                  <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
                    <h4 className="font-bold text-slate-700 border-b pb-2 mb-3 flex items-center gap-2"><Users size={16}/> Mixte</h4>
                    <ul className="space-y-2 text-sm">
                      <li><span className="font-bold text-amber-600 w-10 inline-block">DX1 :</span></li>
                      {compo.dx.h ? <li className="ml-10 text-slate-700 flex items-center gap-1"><User size={14} className="text-indigo-400"/> {compo.dx.h.nom}</li> : <li className="text-red-500 ml-10">Manque H</li>}
                      {compo.dx.f ? <li className="ml-10 text-slate-700 flex items-center gap-1"><User size={14} className="text-pink-400"/> {compo.dx.f.nom}</li> : <li className="text-red-500 ml-10">Manque F</li>}
                      {compo.dxCommuns > 0 && <li className="ml-10 text-xs text-amber-500 italic mt-1 font-semibold">✨ Paire ({compo.dxCommuns}m)</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 border-b border-slate-200 gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={hideBrules} onChange={e => setHideBrules(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition">Masquer les brûlés</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={hideAbsents} onChange={e => setHideAbsents(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition">Masquer les absents</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-600 flex items-center gap-1"><SlidersHorizontal size={14}/> Trier par :</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border border-slate-300 rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-700 shadow-sm">
                    <option value="default">Défaut (Poids)</option>
                    <option value="S">Simple (CPPH max)</option>
                    <option value="D">Double (CPPH max)</option>
                    <option value="M">Mixte (CPPH max)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-slate-500 uppercase font-bold text-xs border-b border-slate-100">
                    <tr>
                      <th className="p-4">Joueur</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 text-center">Classements (S/D/M)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayedPlayers.length > 0 ? (
                      displayedPlayers.map((joueur, i) => (
                        <tr key={i} className={`hover:bg-slate-50 transition ${joueur.isBrule ? 'bg-red-50/20' : ''}`}>
                          <td className="p-4 font-semibold text-slate-800 flex items-center flex-wrap gap-2">
                            <User size={16} className={joueur.genre === 'H' ? 'text-indigo-500' : 'text-pink-500'} />
                            {joueur.nom}
                            
                            {/* BADGE CAPITAINE VIOLET (Basé sur le sigle C sur ICBAD) */}
                            {joueur.nom.toLowerCase().includes('capitaine') || (resultat.joueurs[i]?.nom === resultat.joueurs.find(x => x.isEquipeType)?.nom && i === 0) ? (
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-indigo-200">
                                <Crown size={10} className="fill-indigo-500 text-indigo-500"/> Capitaine
                              </span>
                            ) : null}

                            {joueur.isMute && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Muté</span>}
                            {joueur.isEquipeType && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-yellow-200" title="Équipe type">
                                <Star size={10} className="fill-yellow-500 text-yellow-500"/> Type
                              </span>
                            )}
                            {joueur.isInactif && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">Absent</span>
                            )}
                          </td>
                          <td className="p-4">
                            {joueur.isBrule 
                              ? <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full"><Flame size={12}/> BRÛLÉ</span>
                              : <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1 rounded-full"><CheckCircle size={12}/> OK</span>
                            }
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <RankBadge rank={joueur.clst?.S} cpph={joueur.cpphs?.S} />
                              <RankBadge rank={joueur.clst?.D} cpph={joueur.cpphs?.D} />
                              <RankBadge rank={joueur.clst?.M} cpph={joueur.cpphs?.M} />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="3" className="p-6 text-center text-slate-400 font-medium">Aucun joueur à afficher.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}