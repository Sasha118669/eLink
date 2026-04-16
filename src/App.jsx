import { useState, useEffect } from "react"
import "./App.css"

const CHATS = [
  { id: 1, name: "Алексей К.", initials: "АК", color: "purple", time: "14:32", preview: "Окей, завтра встретимся", unread: 0 },
  { id: 2, name: "Мария В.",   initials: "МВ", color: "teal",   time: "13:10", preview: "Ты посмотрел файл?",    unread: 3 },
  { id: 3, name: "Дима С.",    initials: "ДС", color: "coral",  time: "вчера", preview: "Спасибо!",              unread: 0 },
  { id: 4, name: "Юля П.",     initials: "ЮП", color: "blue",   time: "вчера", preview: "Напишу позже",          unread: 1 },
  { id: 5, name: "Никита О.",  initials: "НО", color: "pink",   time: "пн",    preview: "Ок давай",              unread: 0 },
]

const INIT_MESSAGES = [
  { id: 1, text: "Привет! Как дела?",                    out: false, time: "14:20" },
  { id: 2, text: "Всё хорошо, работаю над проектом",     out: true,  time: "14:21" },
  { id: 3, text: "Что за проект?",                       out: false, time: "14:22" },
  { id: 4, text: "Делаю мессенджер на React + Node.js",  out: true,  time: "14:25" },
  { id: 5, text: "Звучит круто! Когда покажешь?",        out: false, time: "14:28" },
  { id: 6, text: "Окей, завтра встретимся",              out: true,  time: "14:32" },
]

export default function App() {
  const [activeChat, setActiveChat] = useState(CHATS[0])
  const [messages, setMessages]     = useState(INIT_MESSAGES)
  const [input, setInput]           = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    const now  = new Date()
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`
    setMessages(prev => [...prev, { id: Date.now(), text, out: true, time }])
    setInput("")
  }

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage()
  }

  return (
    <div className="app">

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`} aria-label="Список чатов">
        <header className="sidebar__header">
          <span className="sidebar__title">Сообщения</span>
          <button className="icon-btn" aria-label="Новая беседа">
            <PlusIcon />
          </button>
        </header>

        <div className="sidebar__search">
          <input placeholder="Поиск..." aria-label="Поиск чатов" />
        </div>

        <ul className="chat-list">
          {CHATS.map(chat => (
            <li key={chat.id}>
              <button
                type="button"
                className={`chat-item ${chat.id === activeChat.id ? "chat-item--active" : ""}`}
                onClick={() => { setActiveChat(chat); setSidebarOpen(false) }}
                aria-pressed={chat.id === activeChat.id}
              >
                <div className={`avatar avatar--${chat.color}`}>{chat.initials}</div>
                <div className="chat-item__info">
                  <span className="chat-item__name">{chat.name}</span>
                  <span className="chat-item__preview">{chat.preview}</span>
                </div>
                <div className="chat-item__meta">
                  <span className="chat-item__time">{chat.time}</span>
                  {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="chat-header">
          <button className="icon-btn mobile-back" onClick={() => setSidebarOpen(true)}>
            <BackIcon />
          </button>
          <div className={`avatar avatar--${activeChat.color}`} style={{ width: 36, height: 36, fontSize: 12 }}>
            {activeChat.initials}
          </div>
          <div className="chat-header__info">
            <span className="chat-header__name">{activeChat.name}</span>
            <span className="chat-header__status">онлайн</span>
          </div>
        </div>

        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id} className={`msg ${msg.out ? "msg--out" : "msg--in"}`}>
              <div className="bubble">{msg.text}</div>
              <span className="msg__time">{msg.time}</span>
            </div>
          ))}
        </div>

        <footer className="input-area">
          <button className="icon-btn" aria-label="Прикрепить файл">
            <AttachIcon />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать сообщение..."
            aria-label="Текст сообщения"
          />
          <button className="send-btn" onClick={sendMessage} aria-label="Отправить сообщение">
            <SendIcon />
          </button>
        </footer>
      </main>
    </div>
  )
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M12 5v14M5 12h14"/></svg>
}
function BackIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M15 18l-6-6 6-6"/></svg>
}
function AttachIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
}
function SendIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="#EEEDFE" strokeWidth="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
}