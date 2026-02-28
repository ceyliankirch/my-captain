"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Scale, Users, User, Flame, CheckCircle, BrainCircuit, 
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
      className={`inline-block w-8 text-center py-1 rounded text-xs font-bold shadow-sm transition hover:scale-110 ${colorClass}`}
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

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedFavs = localStorage.getItem('icbad_favoris');
    if (savedFavs) { try { setFavoris(JSON.parse(savedFavs)); } catch (e) { setFavoris([]); } }
  }, []);

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
      setChatMessages(prev => [...prev, { role: "assistant", content: "Erreur de connexion..." }]);
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
    <main className={`min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 pb-24 transition-all duration-700 flex flex-col ${!resultat ? 'justify-center items-center' : 'pt-[50px]'}`}>
      <div className="max-w-4xl mx-auto w-full transition-all duration-700">
        
        {/* En-tête */}
        <header className="mb-8 text-center relative animate-fade-in flex flex-col items-center">
          <h1 
            style={{ fontFamily: "'MonumentExtended', sans-serif" }}
            className="text-3xl md:text-5xl font-extrabold mb-3 flex items-center justify-center gap-4 text-indigo-600 normal-case leading-tight"
          >
            <img 
              src="/mycaptain_logo.svg" 
              alt="Logo" 
              className="w-10 h-10 md:w-14 md:h-14 object-contain shrink-0" 
            />
            My Captain
          </h1>
          <p className="text-slate-500 mb-6 font-medium tracking-tight">L'assistant ultime pour les capitaines ICBaD</p>
          <a href="https://icbad.ffbad.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-bold transition shadow-sm">
            Accéder au site ICBaD <ExternalLink size={14} />
          </a>
        </header>

        {/* Bloc Recherche */}
        <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-10 transition-all hover:shadow-2xl">
          <form onSubmit={analyserEquipe}>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider">Lien de l'équipe sur ICBaD :</label>
              {url.includes('icbad.ffbad.org') && (
                <button type="button" onClick={toggleFavori} className={`text-xs font-bold px-4 py-1.5 rounded-full transition flex items-center gap-1.5 ${isFavori ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  <Star size={14} className={isFavori ? "fill-yellow-500" : ""} /> {isFavori ? 'Retirer' : 'Enregistrer'}
                </button>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="url" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                placeholder="https://icbad.ffbad.org/equipe/..." 
                className="flex-1 p-4 bg-slate-50 border-0 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium transition text-sm" 
                required 
              />
              <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 px-10 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 lowercase">
                <Search size={20} /> {loading ? 'scan...' : 'scanner'}
              </button>
            </div>
            {error && <p className="text-rose-500 mt-4 text-sm font-bold flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
          </form>

          {/* Section FAVORIS CENTRÉE */}
          {favoris.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col items-center">
              <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2 justify-center">
                <Star size={12} /> FAVORIS RÉCENTS
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {favoris.map((fav, index) => (
                  <div key={index} className="flex items-center bg-slate-50 border border-slate-100 rounded-xl overflow-hidden group hover:border-indigo-300 transition shadow-sm">
                    <button type="button" onClick={() => setUrl(fav.url)} className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white transition">{fav.nom}</button>
                    <button type="button" onClick={() => supprimerFavori(fav.url)} className="px-3 py-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition border-l border-slate-100"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {resultat && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Équipe</p>
                <p className="text-xl font-bold text-slate-900">{resultat.equipe.sigle || '?'}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-b-4 border-b-indigo-500 flex flex-col items-center justify-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1"><Scale size={14}/> Poids Règlementaire</p>
                <p className="text-4xl font-black text-indigo-600">{resultat.poidsEquipe} <span className="text-sm font-bold text-slate-400 uppercase tracking-normal">pts</span></p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Disponibles</p>
                <p className="text-xl font-bold text-slate-900">{nbDispos} <span className="text-slate-300 font-medium">/ {resultat.joueurs.length}</span></p>
              </div>
            </div>

            <button onClick={() => setShowCompoOfficielle(!showCompoOfficielle)} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 px-6 rounded-2xl shadow-xl transition flex items-center justify-center gap-3 text-sm">
              <FileText size={20} /> {showCompoOfficielle ? 'MASQUER' : 'VOIR'} LA COMPO TYPE OFFICIELLE
            </button>

            {showCompoOfficielle && resultat.compoTypeOfficielle && (
              <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner animate-in fade-in zoom-in-95 duration-500">
                <h3 className="text-lg font-black text-indigo-900 mb-6 flex items-center gap-3 uppercase tracking-tighter"><FileText size={22} className="text-indigo-600"/> Composition de Base</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {resultat.compoTypeOfficielle.map((c, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-indigo-100/50 shadow-sm">
                      <span className="font-black text-indigo-700 text-[10px] block mb-2 border-b border-indigo-50 pb-2 tracking-widest">{c.match}</span>
                      {c.joueurs.map((joueurText, k) => ( 
                        <div key={k} className="text-xs font-bold text-slate-700 mt-1 leading-tight">{joueurText}</div> 
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50/50 p-6 border-b border-slate-100 gap-6">
                <div className="flex flex-wrap justify-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={hideBrules} onChange={e => setHideBrules(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-lg border-slate-200" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CACHER BRÛLÉS</span></label>
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={hideAbsents} onChange={e => setHideAbsents(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-lg border-slate-200" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CACHER ABSENTS</span></label>
                  <label className="flex items-center gap-2 cursor-pointer group"><input type="checkbox" checked={hideNonQualifies} onChange={e => setHideNonQualifies(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded-lg border-slate-200" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BARRAGES NQ</span></label>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-100"><SlidersHorizontal size={14} className="text-indigo-400"/>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-[10px] font-black bg-transparent outline-none uppercase tracking-widest text-slate-600">
                    <option value="default">TRI PAR DÉFAUT</option>
                    <option value="S">TRI PAR SIMPLE</option>
                    <option value="D">TRI PAR DOUBLE</option>
                    <option value="M">TRI PAR MIXTE</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/30 text-slate-400 uppercase font-black text-[9px] tracking-[0.2em] border-b border-slate-100">
                    <tr><th className="p-6">Joueur</th><th className="p-6">Statut</th><th className="p-6 text-center">Classements (S/D/M)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayedPlayers.map((joueur, i) => (
                      <tr key={i} className={`hover:bg-slate-50/80 transition-colors ${joueur.isBrule ? 'bg-rose-50/10' : ''}`}>
                        <td className="p-6 font-bold text-slate-800 flex items-center flex-wrap gap-2">
                          <User size={18} className={joueur.genre === 'H' ? 'text-indigo-500' : 'text-rose-500'} /> 
                          <span className="text-sm tracking-tight">{joueur.nom}</span>
                          
                          {(joueur.nom.toLowerCase().includes('capitaine') || (resultat.joueurs[i]?.nom === resultat.joueurs.find(x => x.isEquipeType)?.nom && i === 0)) && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase font-black border border-indigo-200 flex items-center gap-1"><Crown size={10} className="fill-indigo-500"/> Cap.</span>
                          )}
                          {joueur.isMute && <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase font-black border border-orange-200">Muté</span>}
                          {joueur.isEquipeType && <span className="text-[9px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full uppercase font-black border border-yellow-200 flex items-center gap-1"><Star size={10} className="fill-yellow-500"/> Type</span>}
                          {joueur.isInactif && <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase font-black border border-slate-300">Absent</span>}
                          {!joueur.isQualifieBarrage && <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase font-black border border-rose-200 flex items-center gap-1"><ShieldAlert size={10}/> NQ BARRAGES</span>}
                        </td>
                        <td className="p-6">
                          {joueur.isBrule ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] bg-rose-500 text-white font-black px-3 py-1.5 rounded-full shadow-lg shadow-rose-100"><Flame size={12}/> BRÛLÉ</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-100 text-emerald-700 font-black px-3 py-1.5 rounded-full"><CheckCircle size={12}/> OK</span>
                          )}
                        </td>
                        <td className="p-6">
                          <div className="flex justify-center gap-3">
                            <RankBadge rank={joueur.clst?.S} cpph={joueur.cpphs?.S} />
                            <RankBadge rank={joueur.clst?.D} cpph={joueur.cpphs?.D} />
                            <RankBadge rank={joueur.clst?.M} cpph={joueur.cpphs?.M} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bouton Chatbot */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 hover:rotate-12 transition-all z-50 border-[4px] border-white"
      >
        {chatOpen ? <X size={28} /> : <MessageCircleQuestion size={28} />}
      </button>

      {/* Fenêtre Chat */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-[22rem] sm:w-96 h-[550px] bg-white rounded-[2rem] shadow-2xl flex flex-col z-50 border border-slate-100 overflow-hidden origin-bottom-right animate-in zoom-in duration-300">
          <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shadow-lg">
            <div>
              <h3 className="font-black text-sm tracking-tight flex items-center gap-2 uppercase"><BrainCircuit size={18}/> Assistant Règlement</h3>
              <p className="text-[10px] font-bold text-indigo-100 tracking-widest mt-1 opacity-80 uppercase">Llama 3 • Comité 94</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="bg-white/20 hover:bg-white/40 p-2 rounded-xl transition"><X size={18}/></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
            {chatMessages.length === 0 && (
              <div className="text-center mt-12 space-y-4">
                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-3xl inline-block">
                  <ShieldCheck size={32}/>
                </div>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-loose">Pose-moi une question sur le règlement !</p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-xs leading-relaxed font-bold ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex gap-3 items-center">
            <input 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Question..."
              className="flex-1 text-xs font-bold p-4 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button type="submit" disabled={!chatInput.trim() || isTyping} className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition disabled:opacity-30 shadow-lg shadow-indigo-100">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </main>
  );
}