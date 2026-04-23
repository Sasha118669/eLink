import { useState, useEffect } from "react"
import "./App.css"
import MiniSearch from 'minisearch'
import { PlusIcon, BackIcon, AttachIcon, SendIcon } from "./components/icons/Icons"

const COLORS = ["purple", "teal", "coral", "blue", "pink"]
const getColor = (id) => COLORS[id.charCodeAt(0) % COLORS.length]
const getInitials = (username) => username?.slice(0, 2).toUpperCase() ?? "??"

const miniSearch = new MiniSearch({
  fields: ['name'],
  storeFields: ['id', 'name'],
  idField: 'id',
})

export default function App() {
  const token = localStorage.getItem("accessToken")

  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatUsername, setNewChatUsername] = useState("")
  const [newChatPhone, setNewChatPhone] = useState("")
  const [searchError, setSearchError] = useState("")

  useEffect(() => {
    const fetchChats = async () => {
      const res = await fetch("http://localhost:3000/chats", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setChats(data)
      miniSearch.removeAll()
      miniSearch.addAll(data.map(c => ({
        id: c._id,
        name: c.members.map(m => m.username).join(", "),
      })))
      if (data.length > 0) setActiveChat(data[0])
    }
    fetchChats()
  }, [])

  const filteredChats = query.trim()
    ? miniSearch.search(query, { prefix: true, fuzzy: 0.2 })
    : chats

  const searchUser = async () => {
  setSearchError("")

  if (!newChatUsername.trim() && !newChatPhone.trim()) {
    setSearchError("Введи никнейм или номер телефона")
    return
  }

  const params = new URLSearchParams()
  if (newChatUsername.trim()) params.append("username", newChatUsername.trim())
  if (newChatPhone.trim()) params.append("phonenumber", newChatPhone.trim())

  try {
    const res = await fetch(`http://localhost:3000/users/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      setSearchError("Пользователь не найден")
      return
    }
    const user = await res.json()

    // сразу создаём чат
    const chatRes = await fetch("http://localhost:3000/chats", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ contactId: user._id })
    })
    const chat = await chatRes.json()

    // добавляем в список если его там ещё нет
    setChats(prev => {
      const exists = prev.find(c => c._id === chat._id)
      return exists ? prev : [...prev, chat]
    })

    setNewChatUsername("")
    setNewChatPhone("")
    setNewChatOpen(false)

  } catch {
    setSearchError("Ошибка соединения")
  }
}

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    const now = new Date()
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`
    setMessages(prev => [...prev, { id: Date.now(), text, out: true, time }])
    setInput("")
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getChatName = (chat) => chat.members
    ? chat.members.map(m => m.username).join(", ")
    : chat.name

  if (!activeChat) return <div className="loading">Загрузка...</div>

  return (
    <div className="app">

      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`} aria-label="Список чатов">
        <header className="sidebar__header">
          <span className="sidebar__title">Сообщения</span>
          <button
            className={`icon-btn plus-btn ${newChatOpen ? "plus-btn--open" : ""}`}
            aria-label="Новая беседа"
            onClick={() => setNewChatOpen(prev => !prev)}
          >
            <PlusIcon />
          </button>
        </header>

        <div className={`new-chat-panel ${newChatOpen ? "new-chat-panel--open" : ""}`}>
          <p className="new-chat-panel__title">Новый чат</p>
          <input
            placeholder="Никнейм"
            className="new-chat-input"
            value={newChatUsername}
            onChange={e => setNewChatUsername(e.target.value)}
          />
          <input
            placeholder="Номер телефона"
            className="new-chat-input"
            value={newChatPhone}
            onChange={e => setNewChatPhone(e.target.value)}
          />

          {searchError && <p className="new-chat-error">{searchError}</p>}
          <button className="new-chat-submit" onClick={searchUser}>Найти</button>
        </div>

        <div className="sidebar__search">
          <input
            placeholder="Поиск..."
            aria-label="Поиск чатов"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <ul className="chat-list">
          {filteredChats.map(chat => {
            const id = chat._id ?? chat.id
            const name = getChatName(chat)
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`chat-item ${id === (activeChat._id ?? activeChat.id) ? "chat-item--active" : ""}`}
                  onClick={() => { setActiveChat(chat); setSidebarOpen(false) }}
                  aria-pressed={id === (activeChat._id ?? activeChat.id)}
                >
                  <div className={`avatar avatar--${getColor(id)}`}>
                    {getInitials(name)}
                  </div>
                  <div className="chat-item__info">
                    <span className="chat-item__name">{name}</span>
                    <span className="chat-item__preview"></span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <main className="main">
        <div className="chat-header">
          <button className="icon-btn mobile-back" aria-label="Назад" onClick={() => setSidebarOpen(true)}>
            <BackIcon />
          </button>
          <div className={`avatar avatar--${getColor(activeChat._id ?? activeChat.id)}`}>
            {getInitials(getChatName(activeChat))}
          </div>
          <div className="chat-header__info">
            <span className="chat-header__name">{getChatName(activeChat)}</span>
            <span className="chat-header__status">онлайн</span>
          </div>
        </div>

        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id} className={`msg ${msg.out ? "msg--out" : "msg--in"}`}>
              <div className="bubble">{msg.text}</div>
              <time className="msg__time">{msg.time}</time>
            </div>
          ))}
        </div>

        <footer className="input-area">
          <button className="icon-btn" aria-label="Прикрепить файл">
            <AttachIcon />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать сообщение..."
            aria-label="Текст сообщения"
            rows={1}
          />
          <button className="send-btn" onClick={sendMessage} aria-label="Отправить сообщение">
            <SendIcon />
          </button>
        </footer>
      </main>
    </div>
  )
}