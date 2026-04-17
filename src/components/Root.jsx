import { useEffect, useState } from "react"
import { jwtDecode } from "jwt-decode" 
import Register from "./Register"
import App from "../App"

export default function Root() {
  const [loading, setLoading] = useState(true)
  const [auth, setAuth] = useState(false)

  function handleSuccess(token) {
    localStorage.setItem("accessToken", token)
    setAuth(true)
  }

  useEffect(() => {
    const checkAuth = async () => {
  const token = localStorage.getItem("accessToken")

  if (!token) {
    setAuth(false)
    setLoading(false)
    return
  }

  try {
    const decoded = jwtDecode(token)
    const isExpired = decoded.exp * 1000 < Date.now()

    if (!isExpired) {
      setAuth(true)
      setLoading(false)
      return
    }

    const res = await fetch("http://localhost:3000/auth/refresh", {
      method: "POST",
      credentials: "include",
    })

    const data = await res.json()

    if (!res.ok) {
      localStorage.removeItem("accessToken")
      setAuth(false)
      return
    }

    if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken)
    }

    setAuth(true)

  } catch {
    localStorage.removeItem("accessToken")
    setAuth(false)
  } finally {
    setLoading(false)
  }
}

    checkAuth()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!auth) return <Register onSuccess={handleSuccess} />
  return <App />
}