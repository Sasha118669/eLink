import { useEffect, useState } from "react"
import Register from "./Register"
import App from "../App"

export default function Root() {
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:3000/auth/refresh", {
          method: "POST",
          credentials: "include",
        })

        if (!res.ok) {
          setAuth(false)
          return
        }

        const data = await res.json()
        setAuth(true)

      } catch {
        setAuth(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) return <div>Loading...</div>

  if (!auth) return <Register onSuccess={() => setAuth(true)} />

  return <App />
}