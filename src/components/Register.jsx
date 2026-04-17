import { useState } from "react"
import "./Register.css"

export default function Register({ onSuccess }) {
  const [mode, setMode] = useState("register") // "register" | "login"

  const [form, setForm] = useState({
    username: "",
    phonenumber: "",
    email: "",
    password: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError("")

    const url = mode === "register"
      ? "http://localhost:3000/auth/register"
      : "http://localhost:3000/auth/login"

    const body = mode === "register"
      ? form
      : { email: form.email, password: form.password }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Ошибка")
      }
      onSuccess(data.accessToken)

    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(prev => prev === "register" ? "login" : "register")
    setError("")
    setForm({ username: "", phonenumber: "", email: "", password: "" })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>{mode === "register" ? "Создать аккаунт" : "Войти"}</h2>

        {mode === "register" && (
          <>
            <input
              placeholder="Имя пользователя"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
            <input
              placeholder="+380 XX XXX XX XX"
              type="tel"
              value={form.phonenumber}
              onChange={e => setForm({ ...form, phonenumber: e.target.value })}
            />
          </>
        )}

        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Пароль"
          type="password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />

        {error && <p className="auth-error">{error}</p>}

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "..." : mode === "register" ? "Зарегистрироваться" : "Войти"}
        </button>

        <p className="auth-link">
          {mode === "register"
            ? <>Уже есть аккаунт? <a onClick={switchMode}>Войти</a></>
            : <>Нет аккаунта? <a onClick={switchMode}>Зарегистрироваться</a></>
          }
        </p>
      </div>
    </div>
  )
}