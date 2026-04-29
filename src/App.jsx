import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// CONFIGURATION & API
// ==========================================


const TRANSLATIONS = {
  en: {
    title: "BARCHOBA",
    subtitle: "The 20 Questions Game",
    mode1Title: "I'll Guess!",
    mode1Desc: "You think of something, I will ask questions.",
    mode2Title: "You Guess!",
    mode2Desc: "I will think of something, you ask questions.",
    thinkOfSomething: "Think of an object, animal, or person, then press Ready.",
    ready: "I'm Ready!",
    yes: "Yes",
    no: "No",
    partially: "Partially / Sometimes",
    dontKnow: "I don't know",
    youGuessedIt: "You guessed it!",
    typeQuestion: "Type your Yes/No question here...",
    send: "Ask",
    thinking: "Thinking...",
    playAgain: "Play Again",
    qLeft: "Questions left",
    aiWins: "I win! I figured it out.",
    playerWins: "You win! You figured it out.",
    gameOver: "Game Over",
    secretWas: "The secret was:",
    starting: "Setting up the game...",
    error: "Oops, something went wrong with the connection. Try again.",
    back: "Back to Menu",
    aiStartMsg: "I've thought of something! Ask your first question.",
    userStartMsg: "I have thought of something. Ask your first question!",
    iGiveUp: "I give up! What was it?",
    revealPrompt: "Type what you were thinking of...",
    language: "Language"
  },
  hu: {
    title: "BARKOBA",
    subtitle: "A 20 Kérdés Játéka",
    mode1Title: "Én Találom Ki!",
    mode1Desc: "Gondolj valamire, és én kérdezek.",
    mode2Title: "Te Találod Ki!",
    mode2Desc: "Én gondolok valamire, te kérdezel.",
    thinkOfSomething: "Gondolj egy tárgyra, állatra vagy személyre, majd nyomd meg a Kész gombot.",
    ready: "Kész vagyok!",
    yes: "Igen",
    no: "Nem",
    partially: "Részben / Néha",
    dontKnow: "Nem tudom",
    youGuessedIt: "Kitaláltad!",
    typeQuestion: "Írd be az eldöntendő (igen/nem) kérdésed...",
    send: "Kérdez",
    thinking: "Gondolkodom...",
    playAgain: "Új Játék",
    qLeft: "Hátralévő kérdések",
    aiWins: "Nyertem! Kitaláltam.",
    playerWins: "Nyertél! Kitaláltad.",
    gameOver: "Vége a Játéknak",
    secretWas: "A feladvány ez volt:",
    starting: "Játék előkészítése...",
    error: "Hiba történt a kapcsolatban. Próbáld újra.",
    back: "Vissza a menübe",
    aiStartMsg: "Gondoltam valamire! Tedd fel az első kérdésed.",
    userStartMsg: "Gondoltam valamire. Tedd fel az első kérdésed!",
    iGiveUp: "Feladom! Mi volt az?",
    revealPrompt: "Írd be, mire gondoltál...",
    language: "Nyelv"
  }
};

// ==========================================
// GEMINI API UTILS
// ==========================================
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetries = async (url, options, retries = 5) => {
  let lastError;
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) {
      lastError = e;
      if (i < retries - 1) await delay(delays[i]);
    }
  }
  throw lastError;
};

const callGemini = async (history, systemPrompt) => {
  const url = `/api/chat`;
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'ai' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  const payload = {
    contents: formattedHistory,
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  const data = await fetchWithRetries(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
};

const generateSecretWord = async (lang) => {
  const url = `/api/chat`;
  const prompt = `Generate a single random well-known object, animal, or profession in the language: ${lang}. Reply with ONLY the word or short phrase, absolutely no punctuation or other text.`;
  
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9 }
  };

  const data = await fetchWithRetries(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || (lang === 'hu' ? 'Kutya' : 'Dog');
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function App() {
  const [lang, setLang] = useState('en');
  const [gameState, setGameState] = useState('menu');
  const [mode, setMode] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [qCount, setQCount] = useState(0);
  const [secretWord, setSecretWord] = useState('');
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const chatEndRef = useRef(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const startGameMode1 = async () => {
    setMode('ai_guesses');
    setGameState('setup');
    setHistory([]);
    setQCount(0);
    setWinner(null);
    setErrorMsg('');
  };

  const startMode1Gameplay = async () => {
    setGameState('playing');
    setIsLoading(true);
    
    const initialHistory = [{ role: 'user', text: t.userStartMsg }];
    
    try {
      const response = await callGemini(initialHistory, getSystemPrompt('ai_guesses'));
      setHistory([
        { role: 'user', text: t.userStartMsg, hidden: true },
        { role: 'ai', text: response }
      ]);
      setQCount(1);
    } catch (e) {
      setErrorMsg(t.error);
      setGameState('menu');
    } finally {
      setIsLoading(false);
    }
  };

  const startGameMode2 = async () => {
    setMode('player_guesses');
    setGameState('setup');
    setIsLoading(true);
    setHistory([]);
    setQCount(0);
    setWinner(null);
    setErrorMsg('');

    try {
      const word = await generateSecretWord(lang);
      setSecretWord(word);
      setHistory([{ role: 'ai', text: t.aiStartMsg }]);
      setGameState('playing');
    } catch (e) {
      setErrorMsg(t.error);
      setGameState('menu');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemPrompt = (currentMode) => {
    if (currentMode === 'ai_guesses') {
      return `You are playing 20 Questions. The user has thought of a secret word. You must guess what it is. Ask exactly ONE clear Yes/No question. Be strategic. If you are very confident, you may guess the word directly. Keep your response short, just the question. Language: ${lang}. This is question number ${qCount + 1} of 20.`;
    } else {
      return `You are the Game Master for 20 Questions. The secret word is "${secretWord}". The user will ask you yes/no questions to guess it. 
      Rules:
      1. Answer ONLY with "Yes", "No", "Partially", "I don't know", or "You guessed it!".
      2. If the user guesses the word "${secretWord}" or a very close synonym, say EXACTLY "You guessed it!" and nothing else.
      3. Do not reveal the secret word under any circumstances unless they guess it.
      Language: ${lang}.`;
    }
  };

  const handleUserAction = async (text, isWinningGuess = false) => {
    if (isLoading || gameState !== 'playing') return;

    const newQCount = mode === 'player_guesses' ? qCount + 1 : qCount;
    setQCount(newQCount);

    const newHistory = [...history, { role: 'user', text }];
    setHistory(newHistory);
    setInputText('');
    setIsLoading(true);

    if (isWinningGuess && mode === 'ai_guesses') {
        setWinner('ai');
        setGameState('end');
        setIsLoading(false);
        return;
    }

    if (newQCount >= 20) {
        if (mode === 'player_guesses') {
             setWinner('ai');
        } else {
             setWinner('player');
        }
        setGameState('end');
        setIsLoading(false);
        return;
    }

    try {
      const response = await callGemini(newHistory, getSystemPrompt(mode));
      setHistory([...newHistory, { role: 'ai', text: response }]);

      if (mode === 'player_guesses' && response.toLowerCase().includes(t.youGuessedIt.toLowerCase())) {
        setWinner('player');
        setGameState('end');
      }

      if (mode === 'ai_guesses') {
          setQCount(prev => prev + 1);
          if (qCount + 1 >= 20) {
              setWinner('player');
              setGameState('end');
          }
      }
    } catch (e) {
      setErrorMsg(t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiveUp = () => {
     setWinner('ai');
     setGameState('end');
  };

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md px-6 space-y-8 animate-fade-in">
      <div className="w-full">
        <label className="block text-[#818384] text-sm font-bold mb-2 tracking-wide uppercase">
          {t.language}
        </label>
        <select 
          className="w-full bg-[#3a3a3c] text-white border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#b59f3b] transition-all cursor-pointer"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          <option value="en">English</option>
          <option value="hu">Magyar</option>
        </select>
      </div>

      <div className="w-full space-y-4">
        <button 
          onClick={startGameMode1}
          className="w-full bg-[#3a3a3c] hover:bg-[#b59f3b] text-white font-bold py-6 px-4 rounded-xl transition-all transform hover:scale-105 shadow-lg flex flex-col items-center justify-center space-y-2 group"
        >
          <span className="text-2xl group-hover:text-white text-[#b59f3b] transition-colors">{t.mode1Title}</span>
          <span className="text-sm text-gray-300 font-normal">{t.mode1Desc}</span>
        </button>

        <button 
          onClick={startGameMode2}
          className="w-full bg-[#3a3a3c] hover:bg-[#b59f3b] text-white font-bold py-6 px-4 rounded-xl transition-all transform hover:scale-105 shadow-lg flex flex-col items-center justify-center space-y-2 group"
        >
          <span className="text-2xl group-hover:text-white text-[#b59f3b] transition-colors">{t.mode2Title}</span>
          <span className="text-sm text-gray-300 font-normal">{t.mode2Desc}</span>
        </button>
      </div>
      
      {errorMsg && <p className="text-red-400 text-sm mt-4 text-center">{errorMsg}</p>}
    </div>
  );

  const renderSetup = () => (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md px-6 animate-fade-in">
      {mode === 'ai_guesses' ? (
        <div className="bg-[#3a3a3c] p-8 rounded-xl shadow-lg text-center space-y-6 w-full">
          <p className="text-xl font-medium text-white">{t.thinkOfSomething}</p>
          <button 
            onClick={startMode1Gameplay}
            className="w-full bg-[#b59f3b] hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition-all text-lg"
          >
            {t.ready}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#b59f3b]"></div>
          <p className="text-[#818384] animate-pulse">{t.starting}</p>
        </div>
      )}
    </div>
  );

  const renderGame = () => (
    <div className="flex flex-col flex-1 w-full max-w-2xl px-4 py-6">
      <div className="flex justify-between items-center bg-[#3a3a3c] rounded-t-xl p-3 px-5">
        <span className="text-[#818384] text-sm font-semibold uppercase tracking-wider">{mode === 'ai_guesses' ? t.mode1Title : t.mode2Title}</span>
        <div className="flex items-center space-x-2">
          <span className="text-[#b59f3b] font-bold">{qCount}</span>
          <span className="text-[#818384]">/ 20</span>
        </div>
      </div>

      <div className="flex-1 bg-[#121213] border border-[#3a3a3c] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#3a3a3c]">
        {history.filter(m => !m.hidden).map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-[#b59f3b] text-white rounded-br-none' 
                : 'bg-[#3a3a3c] text-white rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#3a3a3c] text-[#818384] p-3 rounded-2xl rounded-bl-none animate-pulse">
              {t.thinking}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="bg-[#3a3a3c] p-4 rounded-b-xl">
        {mode === 'ai_guesses' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button disabled={isLoading} onClick={() => handleUserAction(t.yes)} className="bg-[#538d4e] hover:bg-green-600 text-white font-bold py-2 rounded transition-colors disabled:opacity-50">{t.yes}</button>
            <button disabled={isLoading} onClick={() => handleUserAction(t.no)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded transition-colors disabled:opacity-50">{t.no}</button>
            <button disabled={isLoading} onClick={() => handleUserAction(t.partially)} className="bg-[#818384] hover:bg-gray-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50">{t.partially}</button>
            <button disabled={isLoading} onClick={() => handleUserAction(t.dontKnow)} className="bg-[#818384] hover:bg-gray-500 text-white font-bold py-2 rounded transition-colors disabled:opacity-50">{t.dontKnow}</button>
            <button disabled={isLoading} onClick={() => handleUserAction(t.youGuessedIt, true)} className="col-span-2 sm:col-span-2 bg-[#b59f3b] hover:bg-yellow-600 text-white font-bold py-2 rounded transition-colors disabled:opacity-50">{t.youGuessedIt}</button>
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && inputText.trim() && handleUserAction(inputText.trim())}
                placeholder={t.typeQuestion}
                className="flex-1 bg-[#121213] text-white border border-[#818384] rounded-lg p-3 outline-none focus:border-[#b59f3b] transition-colors"
                disabled={isLoading}
                autoFocus
              />
              <button 
                onClick={() => inputText.trim() && handleUserAction(inputText.trim())}
                disabled={isLoading || !inputText.trim()}
                className="bg-[#b59f3b] hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {t.send}
              </button>
            </div>
            <button 
              onClick={handleGiveUp}
              disabled={isLoading}
              className="text-[#818384] hover:text-white text-sm text-right pr-2 underline"
            >
              {t.iGiveUp}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderEnd = () => (
    <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md px-6 animate-fade-in space-y-6">
      <div className="bg-[#3a3a3c] p-8 rounded-xl shadow-lg w-full text-center space-y-6">
        <h2 className="text-3xl font-bold text-[#b59f3b] uppercase tracking-widest">{t.gameOver}</h2>
        
        <p className="text-xl text-white font-medium">
          {winner === 'ai' ? t.aiWins : t.playerWins}
        </p>

        {mode === 'player_guesses' && (
          <div className="bg-[#121213] p-4 rounded-lg mt-4 border border-[#818384]">
            <p className="text-[#818384] text-sm uppercase mb-1">{t.secretWas}</p>
            <p className="text-2xl text-white font-bold">{secretWord}</p>
          </div>
        )}

        <div className="pt-4 flex flex-col space-y-3">
          <button 
            onClick={() => setGameState('menu')}
            className="w-full bg-[#b59f3b] hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition-all"
          >
            {t.playAgain}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#121213] text-white flex flex-col font-nzz">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&display=swap');
        .font-nzz { font-family: 'NZZ Serif', 'NZZ', 'Merriweather', Georgia, serif; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
      
      <header className="border-b border-[#3a3a3c] p-4 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold tracking-widest text-white cursor-pointer hover:text-[#b59f3b] transition-colors" onClick={() => setGameState('menu')}>
          {t.title}
        </h1>
        <p className="text-[#818384] text-sm tracking-wide">{t.subtitle}</p>
      </header>

      <main className="flex flex-col flex-1 items-center bg-[#121213]">
        {gameState === 'menu' && renderMenu()}
        {gameState === 'setup' && renderSetup()}
        {gameState === 'playing' && renderGame()}
        {gameState === 'end' && renderEnd()}
      </main>
      
    </div>
  );
}