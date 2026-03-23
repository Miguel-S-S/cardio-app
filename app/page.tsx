'use client'

import { getSupabaseClient } from './lib/supabaseClient'

export default function Home() {

  const crearPaciente = async () => {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('pacientes')
      .insert([
        {
          nombre: 'Juan',
          apellido: 'Pérez',
          dni: '12345678'
        }
      ])

    console.log(data, error)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Sistema Cardiología ❤️</h1>
      <button onClick={crearPaciente}>
        Crear paciente
      </button>
    </div>
  )
}