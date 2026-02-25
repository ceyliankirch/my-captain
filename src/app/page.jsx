"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Scale, Users, User, Flame, CheckCircle, BrainCircuit, 
  Star, Trash2, AlertTriangle, ShieldCheck, Search, SlidersHorizontal, FileText, ExternalLink, Crown, ShieldAlert, MessageCircleQuestion, Send, X
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
  const [showCompoOfficielle, setShowCompoOfficielle] = useState(false);
  const [favoris, setFavoris] = useState([]);
  
  const [hideBrules, setHideBrules] = useState(false);
  const [hideAbsents, setHideAbsents] = useState(false);
  const [hideNonQualifies, setHideNonQualifies] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  // --- STATES POUR LE CHATBOT ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedFavs = localStorage.getItem('icbad_favoris');
    if (savedFavs) { try { setFavoris(JSON.parse(savedFavs)); } catch (e) { setFavoris([]); } }
  }, []);

  // Auto-scroll pour le chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const isFavori = favoris.some(f => f.url === url);

  const analyserEquipe = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResultat(null); setShowCompoOfficielle(false);
    try {
      const response = await fetch(`/api/equipe?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "Erreur serveur.");
      setResultat(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const toggleFavori = () => {
    if (isFavori) {
      const newFavs = favoris.filter(f => f.url !== url);
      setFavoris(newFavs);
      localStorage.setItem('icbad_favoris', JSON.stringify(newFavs));
    } else {
      const nom = resultat?.equipe?.sigle ? `${resultat.equipe.sigle} - Eq ${resultat.equipe.num}` : `Équipe (${url.split('/').pop()})`;
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

  // --- FONCTION D'ENVOI DU CHATBOT ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { role: "user", content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatMessages, userMsg] }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.content }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Désolé, problème de connexion au règlement..." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const nbDispos = resultat ? resultat.joueurs.filter(j => !j.isBrule && !j.isInactif).length : 0;

  let displayedPlayers = resultat?.joueurs || [];
  if (hideBrules) displayedPlayers = displayedPlayers.filter(j => !j.isBrule);
  if (hideAbsents) displayedPlayers = displayedPlayers.filter(j => !j.isInactif);
  if (hideNonQualifies) displayedPlayers = displayedPlayers.filter(j => j.isQualifieBarrage);
  if (sortBy !== 'default') {
    displayedPlayers = [...displayedPlayers].sort((a, b) => (b.cpphs?.[sortBy] || 0) - (a.cpphs?.[sortBy] || 0));
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-24">
      <div className="max-w-4xl mx-auto">
        
        {/* En-tête */}
        <header className="mb-8 text-center relative">
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-2 flex items-center justify-center gap-3">
            <Trophy size={36} className="text-indigo-600" /> My Captain
          </h1>
          <p className="text-slate-500 mb-4">L'assistant ultime pour les capitaines ICBaD</p>
          <a href="https://icbad.ffbad.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-xs font-bold transition shadow-sm">
            Accéder au site ICBaD <ExternalLink size={14} />
          </a>
        </header>

        {/* Bloc Recherche */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={analyserEquipe}>
            <div className="flex justify-between items-end mb-2">
              <label className="block text-sm font-bold text-slate-700">Lien de la rencontre ICBaD :</label>
              {url.includes('icbad.ffbad.org') && (
                <button type="button" onClick={toggleFavori} className={`text-sm font-bold px-3 py-1 rounded-full transition flex items-center gap-1 ${isFavori ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <Star size={14} className={isFavori ? "fill-yellow-500" : ""} /> {isFavori ? 'Retirer' : 'Sauvegarder'}
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
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase flex items-center gap-1"><Star size={14} /> Favorites</p>
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

        {/* Résultats */}
        {resultat && (
          <div className="space-y-6 animate-fade-in">
            {/* Statistiques rapides */}
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

            <div className="flex gap-4 mb-4">
              <button onClick={() => setShowCompoOfficielle(!showCompoOfficielle)} className="w-full bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2"><FileText size={18} /> {showCompoOfficielle ? 'Masquer' : 'Voir'} la compo Type </button>
            </div>

            {/* Panneau Compo Officielle */}
            {showCompoOfficielle && resultat.compoTypeOfficielle && (
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm animate-fade-in">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><FileText size={24} className="text-blue-600"/> Compo Type Officielle</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {resultat.compoTypeOfficielle.map((c, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm text-center">
                      <span className="font-bold text-blue-700 block mb-2 border-b border-blue-50 pb-1">{c.match}</span>
                      {c.joueurs.map((joueurText, k) => ( <div key={k} className="text-xs font-semibold text-slate-700 mt-1">{joueurText}</div> ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tableau principal */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 border-b border-slate-200 gap-4">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer group"><input type="checkbox" checked={hideBrules} onChange={e => setHideBrules(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300" /><span className="text-[11px] font-bold text-slate-600">CACHER BRÛLÉS</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer group"><input type="checkbox" checked={hideAbsents} onChange={e => setHideAbsents(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300" /><span className="text-[11px] font-bold text-slate-600">CACHER ABSENTS</span></label>
                  <label className="flex items-center gap-1.5 cursor-pointer group"><input type="checkbox" checked={hideNonQualifies} onChange={e => setHideNonQualifies(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-slate-300" /><span className="text-[11px] font-bold text-slate-600">CACHER NQ BARRAGES</span></label>
                </div>
                <div className="flex items-center gap-2"><SlidersHorizontal size={14} className="text-slate-400"/>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border border-slate-300 rounded-lg py-1 px-2 text-[11px] font-bold bg-white outline-none">
                    <option value="default">TRI : DÉFAUT</option>
                    <option value="S">TRI : SIMPLE</option>
                    <option value="D">TRI : DOUBLE</option>
                    <option value="M">TRI : MIXTE</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-slate-500 uppercase font-bold text-[10px] border-b border-slate-100">
                    <tr><th className="p-4">Joueur</th><th className="p-4">Statut</th><th className="p-4 text-center">Classements (S/D/M)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayedPlayers.length > 0 ? (
                      displayedPlayers.map((joueur, i) => (
                        <tr key={i} className={`hover:bg-slate-50 transition ${joueur.isBrule ? 'bg-red-50/20' : ''}`}>
                          <td className="p-4 font-semibold text-slate-800 flex items-center flex-wrap gap-2">
                            <User size={16} className={joueur.genre === 'H' ? 'text-indigo-500' : 'text-pink-500'} /> {joueur.nom}
                            
                            {/* ÉTIQUETTES / BADGES */}
                            {(joueur.nom.toLowerCase().includes('capitaine') || (resultat.joueurs[i]?.nom === resultat.joueurs.find(x => x.isEquipeType)?.nom && i === 0)) ? (
                              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full uppercase font-bold border border-indigo-200 flex items-center gap-1"><Crown size={10} className="fill-indigo-500"/> Capitaine</span>
                            ) : null}
                            {joueur.isMute && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full uppercase font-bold">Muté</span>}
                            {joueur.isEquipeType && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full uppercase font-bold flex items-center gap-1 border border-yellow-200"><Star size={10} className="fill-yellow-500"/> Type</span>}
                            {joueur.isInactif && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase font-bold border border-slate-200">Absent</span>}
                            {!joueur.isQualifieBarrage && (
                              <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full uppercase font-bold border border-red-100 flex items-center gap-1" title={`${joueur.nbRencontresJouees} rencontres jouées sur 3 requises`}>
                                <ShieldAlert size={10}/> NQ BARRAGES
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {joueur.isBrule ? <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full"><Flame size={12}/> BRÛLÉ</span> : <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-full"><CheckCircle size={12}/> OK</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <RankBadge rank={joueur.clst?.S} cpph={joueur.cpphs?.S} /><RankBadge rank={joueur.clst?.D} cpph={joueur.cpphs?.D} /><RankBadge rank={joueur.clst?.M} cpph={joueur.cpphs?.M} />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : ( <tr><td colSpan="3" className="p-6 text-center text-slate-400 font-medium">Aucun joueur à afficher.</td></tr> )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- BOT STICKY ASSISTANT REGLEMENT --- */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center hover:scale-110 hover:bg-indigo-700 transition-all z-50 border-[3px] border-white"
        title="Poser une question sur le règlement"
      >
        {chatOpen ? <X size={24} /> : <MessageCircleQuestion size={24} />}
      </button>

      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-200 overflow-hidden origin-bottom-right animate-in zoom-in duration-200">
          
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center shadow-md">
            <div>
              <h3 className="font-bold flex items-center gap-2"><BrainCircuit size={20}/> Bot Llama 3</h3>
              <p className="text-[10px] text-indigo-100 opacity-90">Expert Règlement Comité 94</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition"><X size={18}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-sm">
            {chatMessages.length === 0 && (
              <div className="text-center mt-10 space-y-3">
                <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full inline-block mb-2">
                  <ShieldCheck size={28}/>
                </div>
                <p className="text-slate-500 font-medium">Pose-moi une question sur le règlement du Val-de-Marne !</p>
                <div className="flex flex-col gap-2 mt-4">
                  <button onClick={() => setChatInput("Un joueur muté peut-il faire les barrages ?")} className="text-xs bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:border-indigo-300 text-left transition">"Un joueur muté peut-il faire les barrages ?"</button>
                  <button onClick={() => setChatInput("Quel est le montant de l'amende pour forfait d'équipe ?")} className="text-xs bg-white border border-slate-200 p-2 rounded-lg text-slate-600 hover:border-indigo-300 text-left transition">"Quel est le montant de l'amende pour forfait d'équipe ?"</button>
                </div>
              </div>
            )}
            
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-400 p-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pose ta question..."
              className="flex-1 text-sm p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button type="submit" disabled={!chatInput.trim() || isTyping} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              <Send size={18} />
            </button>
          </form>

        </div>
      )}
    </main>
  );
}