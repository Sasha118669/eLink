import { useState, useEffect, useRef } from "react"
import "./App.css"
import MiniSearch from 'minisearch'
import { PlusIcon, BackIcon, AttachIcon, SendIcon, BurgerIcon, LogoutIcon } from "./components/icons/Icons"
import { io } from "socket.io-client"
import { useContextMenu } from "./components/useContextMenu";
import { ContextMenu } from "./components/ContextMenu";


const COLORS = ["purple", "teal", "coral", "blue", "pink"]
const getColor = (id) => COLORS[id.charCodeAt(0) % COLORS.length]
const getInitials = (username) => username?.slice(0, 2).toUpperCase() ?? "??"

const miniSearch = new MiniSearch({
  fields: ['name'],
  storeFields: ['id', 'name'],
  idField: 'id',
})

const socket = io("https://elink-p96q.onrender.com")

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const messagesEndRef = useRef(null)
  const { menu, close, onContextMenu, onTouchStart, onTouchEnd, onTouchMove } = useContextMenu()

  // Инициализация: загружаем пользователя и чаты
  useEffect(() => {
    if (!token) return
    const init = async () => {
      const meRes = await fetch("https://elink-p96q.onrender.com/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!meRes.ok) return
      const me = await meRes.json()
      setCurrentUser(me)

      const chatsRes = await fetch("https://elink-p96q.onrender.com/chats", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!chatsRes.ok) return
      const data = await chatsRes.json()
      setChats(data)
      miniSearch.removeAll()
      miniSearch.addAll(data.map(c => ({
        id: c._id,
        name: c.members.find(m => m._id !== me._id)?.username ?? "Неизвестный"
      })))
      if (data.length > 0) setActiveChat(data[0])
    }
    init()
  }, [])

  // Загружаем сообщения при смене активного чата
  useEffect(() => {
    if (!activeChat || !token || !currentUser) return
    const loadMessages = async () => {
      const res = await fetch(`https://elink-p96q.onrender.com/chats/${activeChat._id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.map(msg => ({
        id: msg._id,
        text: msg.text,
        out: msg.sender._id === currentUser._id,
        time: formatTime(msg.createdAt),
      })))
    }
    loadMessages()

    // Входим в комнату чата
    socket.emit("join_chat", activeChat._id)

    // Слушаем новые сообщения
    socket.on("new_message", (message) => {
      if (message.chat === activeChat._id) {
        setMessages(prev => [...prev, {
          id: message._id,
          text: message.text,
          out: message.sender._id === currentUser._id,
          time: formatTime(message.createdAt),
        }])
      }
    })

    // Чистим при смене чата
    return () => {
      socket.emit("leave_chat", activeChat._id)
      socket.off("new_message")
    }
  }, [activeChat, currentUser])

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const formatTime = (iso) => {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
  }

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
      const res = await fetch(`https://elink-p96q.onrender.com/users/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { setSearchError("Пользователь не найден"); return }
      const user = await res.json()
      const chatRes = await fetch("https://elink-p96q.onrender.com/chats", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: user._id })
      })
      const chat = await chatRes.json()
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

    
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !activeChat) return
    setInput("")
    try {
      const res = await fetch(`https://elink-p96q.onrender.com/chats/${activeChat._id}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
  
    } catch (e) {
      console.error("Ошибка отправки:", e)
    }
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getChatName = (chat) => {
    if (!chat.members) return chat.name ?? ""
    const other = chat.members.find(m => m._id !== currentUser?._id)
    return other?.username ?? "Неизвестный"
  }

  const logout = async () => {
    await fetch("https://elink-p96q.onrender.com/auth/logout", {
      method: "POST",
      credentials: "include",
    })
    localStorage.removeItem("accessToken")
    window.location.href = "/"
  }

  if (!currentUser || !activeChat) return <div className="loading">Загрузка...</div>

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        <header className="sidebar__header">
          <button className="icon-btn burger-btn" onClick={() => setMenuOpen(prev => !prev)}>
            <BurgerIcon />
          </button>
          <span className="sidebar__title">Сообщения</span>
          <button
            className={`icon-btn plus-btn ${newChatOpen ? "plus-btn--open" : ""}`}
            onClick={() => setNewChatOpen(prev => !prev)}
          >
            <PlusIcon />
          </button>
        </header>

        <div className={`account-panel ${menuOpen ? "account-panel--open" : ""}`}>
          <div className="account-panel__overlay" onClick={() => setMenuOpen(false)} />
          <div className="account-panel__content">
            <div className="account-panel__profile">
              <div className={`avatar avatar--${getColor(currentUser._id)} account-panel__avatar`}>
                {getInitials(currentUser.username)}
              </div>
              <span className="account-panel__username">@{currentUser.username}</span>
            </div>
            <button className="account-panel__logout" onClick={logout}>
              <LogoutIcon />
              Выйти
            </button>
          </div>
        </div>

        <div className={`new-chat-panel ${newChatOpen ? "new-chat-panel--open" : ""}`}>
          <p className="new-chat-panel__title">Новый чат</p>
          <input placeholder="Никнейм" className="new-chat-input" value={newChatUsername} onChange={e => setNewChatUsername(e.target.value)} />
          <input placeholder="Номер телефона" className="new-chat-input" value={newChatPhone} onChange={e => setNewChatPhone(e.target.value)} />
          {searchError && <p className="new-chat-error">{searchError}</p>}
          <button className="new-chat-submit" onClick={searchUser}>Найти</button>
        </div>

        <div className="sidebar__search">
          <input placeholder="Поиск..." value={query} onChange={e => setQuery(e.target.value)} />
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
                >
                  <div className={`avatar avatar--${getColor(id)}`}>{getInitials(name)}</div>
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
          <button className="icon-btn mobile-back" onClick={() => setSidebarOpen(true)}>
            <BackIcon />
          </button>
          <div className={`avatar avatar--${getColor(activeChat._id)}`}>
            {getInitials(getChatName(activeChat))}
          </div>
          <div className="chat-header__info">
            <span className="chat-header__name">{getChatName(activeChat)}</span>
            <span className="chat-header__status">онлайн</span>
          </div>
        </div>

        <div className="messages">
  {messages.map(msg => (
    <div
      key={msg.id}
      className={`msg ${msg.out ? "msg--out" : "msg--in"}`}
      onContextMenu={e => onContextMenu(e, msg.out ? "out" : "in", msg.id)}
      onTouchStart={e => onTouchStart(e, msg.out ? "out" : "in", msg.id)}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
    >
      <div className="bubble">{msg.text}</div>
      <time className="msg__time">{msg.time}</time>
    </div>
  ))}
  <div ref={messagesEndRef} />

  {menu.visible && (
    <ContextMenu
      x={menu.x}
      y={menu.y}
      type={menu.type}
      onAction={action => handleAction(action, menu.msgId)}
      onClose={close}
    />
  )}
</div>

        <footer className="input-area">
          <button className="icon-btn">
            <AttachIcon />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать сообщение..."
            rows={1}
          />
          <button className="send-btn" onClick={sendMessage}>
            <SendIcon />
          </button>
        </footer>
      </main>
    </div>
  )
}