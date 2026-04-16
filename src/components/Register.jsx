import { useState } from "react"
import "./Register.css"

export default function Register({ onSuccess }) {
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

    try {
      const res = await fetch("http://localhost:3000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Ошибка регистрации")
      }

      onSuccess()

    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2>Создать аккаунт</h2>

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
          {loading ? "..." : "Зарегистрироваться"}
        </button>
      </div>
    </div>
  )
}