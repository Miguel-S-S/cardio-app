'use client'

import { useState } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = getSupabaseClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setError('Credenciales incorrectas')
    } else {
      router.push('/pacientes')
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Login Médico</h1>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Contraseña"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition" onClick={login}>Ingresar</button>

      {error && <p>{error}</p>}
    </div>
  )
}