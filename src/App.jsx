import { useEffect, useMemo, useRef, useState } from 'react'

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const [languages, setLanguages] = useState([])
  const [language, setLanguage] = useState('hi')
  const [sessionId, setSessionId] = useState('')
  const [title, setTitle] = useState('My Farm Chat')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetch(`${baseUrl}/languages`)
      .then(res => res.json())
      .then(data => setLanguages(data.languages || []))
      .catch(() => setLanguages(['en', 'hi']))
  }, [baseUrl])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const t = useMemo(() => uiText(language), [language])

  const startSession = async () => {
    try {
      setStarting(true)
      const res = await fetch(`${baseUrl}/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, language })
      })
      if (!res.ok) throw new Error('Failed to start')
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages([])
      setInput('')
    } catch (e) {
      alert(t.startError)
    } finally {
      setStarting(false)
    }
  }

  const fetchHistory = async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`${baseUrl}/chat/${sessionId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {}
  }

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return
    const userMsg = {
      session_id: sessionId,
      role: 'user',
      content: input,
      language
    }
    setMessages(prev => [...prev, { ...userMsg, _id: Math.random().toString() }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${baseUrl}/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, language, question: userMsg.content })
      })
      if (!res.ok) throw new Error('send failed')
      const data = await res.json()
      // Append assistant answer
      setMessages(prev => [...prev, { session_id: sessionId, role: 'assistant', content: data.answer, language, _id: Math.random().toString() }])
    } catch (e) {
      alert(t.sendError)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-lime-50">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 font-bold">Ag</span>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-800">AI Agri Chatbot</h1>
          </div>
          <a href="/test" className="text-sm text-gray-500 hover:text-gray-700 underline">{t.checkBackend}</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {!sessionId ? (
          <div className="mx-auto max-w-xl bg-white rounded-xl shadow-sm border p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.getStarted}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.language}</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languages.map((lng) => (
                    <option key={lng} value={lng}>{lng.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t.chatTitle}</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={startSession}
              disabled={starting}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg"
            >
              {starting ? t.starting : t.startChat}
            </button>
            <p className="text-xs text-gray-500 mt-3">{t.note}</p>
          </div>
        ) : (
          <div className="grid grid-rows-[auto_1fr_auto] h-[calc(100vh-120px)] max-h-[900px] bg-white border rounded-xl shadow-sm overflow-hidden mt-4">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t.language} · {language.toUpperCase()}</p>
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              </div>
              <button onClick={fetchHistory} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">{t.refresh}</button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-10">
                  {t.welcome}
                </div>
              )}
              {messages.map(m => (
                <MessageBubble key={m._id} role={m.role} content={m.content} />
              ))}
              {loading && (
                <MessageBubble role="assistant" content={t.thinking} loading />
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t bg-white">
              <div className="flex gap-2">
                <textarea
                  rows={1}
                  value={input}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.placeholder}
                  className="flex-1 resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-semibold"
                >{t.send}</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">{t.footer}</footer>
    </div>
  )
}

function MessageBubble({ role, content, loading }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${isUser ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border rounded-bl-sm'}`}>
        {loading ? (
          <span className="inline-flex gap-1 items-center">
            <Dot /> <Dot /> <Dot />
          </span>
        ) : (
          <span>{content}</span>
        )}
      </div>
    </div>
  )
}

function Dot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"></span>
}

function uiText(lang) {
  const dict = {
    en: {
      checkBackend: 'Check backend',
      getStarted: 'Get started',
      language: 'Language',
      chatTitle: 'Chat title',
      starting: 'Starting...',
      startChat: 'Start Chat',
      note: 'Tip: Ask about soil, fertilizer, irrigation, pests in your language.',
      refresh: 'Refresh',
      welcome: 'Welcome! Ask any agriculture question to begin.',
      placeholder: 'Type your question and press Enter...',
      send: 'Send',
      footer: 'Built for farmers to get quick guidance in regional languages.',
      startError: 'Could not start chat. Please try again.',
      sendError: 'Could not send message. Please try again.',
      thinking: 'Thinking...'
    },
    hi: {
      checkBackend: 'बैकएंड जाँचें',
      getStarted: 'शुरू करें',
      language: 'भाषा',
      chatTitle: 'चैट शीर्षक',
      starting: 'प्रारंभ हो रहा है...',
      startChat: 'चैट शुरू करें',
      note: 'सुझाव: मिट्टी, खाद, सिंचाई, कीट आदि के बारे में अपनी भाषा में पूछें।',
      refresh: 'रीफ़्रेश',
      welcome: 'स्वागत है! कृषि से जुड़े किसी भी प्रश्न से शुरू करें।',
      placeholder: 'अपना प्रश्न लिखें और Enter दबाएँ...',
      send: 'भेजें',
      footer: 'किसानों के लिए क्षेत्रीय भाषाओं में त्वरित मार्गदर्शन।',
      startError: 'चैट शुरू नहीं हो सकी, कृपया पुनः प्रयास करें।',
      sendError: 'संदेश नहीं भेजा जा सका, कृपया पुनः प्रयास करें।',
      thinking: 'सोच रहा हूँ...'
    },
    ta: {
      checkBackend: 'பின்தளத்தை சரிபார்',
      getStarted: 'தொடங்கவும்',
      language: 'மொழி',
      chatTitle: 'அரட்டை தலைப்பு',
      starting: 'தொடங்குகிறது...',
      startChat: 'அரட்டை தொடங்கு',
      note: 'குறிப்பு: மண், உரம், பாசனம், பூச்சிகள் பற்றி உங்கள் மொழியில் கேளுங்கள்.',
      refresh: 'புதுப்பிக்க',
      welcome: 'வரவேற்கிறோம்! வேளாண்மை கேள்வியுடன் தொடங்குங்கள்.',
      placeholder: 'உங்கள் கேள்வியை எழுதுங்கள்...',
      send: 'அனுப்பு',
      footer: 'மண்டல மொழிகளில் விவசாயிகளுக்கான உதவி.',
      startError: 'அரட்டை தொடங்க முடியவில்லை.',
      sendError: 'செய்தி அனுப்ப முடியவில்லை.',
      thinking: 'சிந்திக்கிறது...'
    }
  }
  return dict[lang] || dict.en
}

export default App
