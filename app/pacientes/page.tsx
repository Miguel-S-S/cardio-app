'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'

type Paciente = {
  id?: string
  nombre: string
  apellido: string
  dni: string
  fecha_nacimiento?: string
}

export default function PacientesPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    fecha_nacimiento: '',
    motivo: ''
  })

  const [error, setError] = useState('')
  const [respuestas, setRespuestas] = useState<Record<string, boolean>>({})

  const preguntas = [
    "Dolor en el pecho", "Dificultad para respirar", "Palpitaciones",
    "Hinchazón en piernas", "Mareos o desmayos", "Fuma o fumó",
    "Mala alimentación", "Sedentarismo", "Antecedentes familiares",
    "Estrés elevado", "Hipertensión", "Diabetes",
    "Colesterol alto", "Medicamentos actuales", "Cirugías cardíacas previas"
  ]

  const calcularEdad = (fecha: string) => {
    if (!fecha) return ''
    const hoy = new Date()
    const nacimiento = new Date(fecha)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const m = hoy.getMonth() - nacimiento.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--
    return edad
  }

  const fetchPacientes = async () => {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) setPacientes(data)
  }

  useEffect(() => {
    const checkUser = async () => {
      const {data} = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/login'
    }
    checkUser()
    fetchPacientes()
  }, [supabase])

  const validar = () => {
    if (!form.nombre || !form.apellido || !form.dni || !form.fecha_nacimiento || !form.motivo) {
      setError('⚠️ Todos los campos, incluido el motivo, son obligatorios')
      return false
    }
    if (!/^\d+$/.test(form.dni)) {
      setError('⚠️ El DNI debe contener solo números')
      return false
    }
    setError('')
    return true
  }

  const crearPacienteCompleto = async () => {
    if (!validar()) return
    setLoading(true)

    // 1. Crear el Paciente
    const { data: pacienteData, error: errorPaciente } = await supabase
      .from('pacientes')
      .insert([{
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni,
        fecha_nacimiento: form.fecha_nacimiento
      }])
      .select().single()

    if (errorPaciente) {
      setError('Error al crear el perfil del paciente')
      setLoading(false)
      return
    }

    // 2. Crear la Consulta inicial (AQUÍ SE GUARDA EL MOTIVO)
    const { data: consultaData, error: errorConsulta } = await supabase
      .from('consultas')
      .insert([{
        paciente_id: pacienteData.id,
        motivo: form.motivo,
        fecha: new Date().toISOString().split('T')[0] // Guardamos la fecha actual
      }])
      .select().single()

    if (errorConsulta) {
      setError('Error al registrar la consulta inicial')
      setLoading(false)
      return
    }

    // 3. Guardar Respuestas del Cuestionario
    const respuestasArray = Object.entries(respuestas).map(([pregunta, valor]) => ({
      consulta_id: consultaData.id,
      pregunta,
      respuesta: valor
    }))

    if (respuestasArray.length > 0) {
      await supabase.from('respuestas').insert(respuestasArray)
    }

    // Limpieza del formulario
    setForm({ nombre: '', apellido: '', dni: '', fecha_nacimiento: '', motivo: '' })
    setRespuestas({})
    setLoading(false)
    fetchPacientes()
    alert('✅ Paciente y Consulta inicial registrados con éxito')
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8 text-foreground">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Paciente</h1>
          <p className="text-muted-foreground">Ingrese los datos para la apertura de la historia clínica</p>
        </div>
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl text-sm font-bold flex items-center gap-2">
          <span>🩺</span> Consultorio de Cardiología
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-surface p-6 rounded-3xl shadow-xl border border-border space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              Datos Personales
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                className="bg-muted border border-border rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition"
                placeholder="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <input
                className="bg-muted border border-border rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition"
                placeholder="Apellido"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              />
              <input
                className="bg-muted border border-border rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition"
                placeholder="DNI (Sin puntos)"
                value={form.dni}
                onChange={(e) => setForm({ ...form, dni: e.target.value })}
              />
              <div className="relative">
                <input
                  className="w-full bg-muted border border-border rounded-xl p-3.5 focus:ring-2 focus:ring-primary/20 outline-none transition"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                />
                {form.fecha_nacimiento && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white text-[10px] px-2 py-1 rounded-full font-bold">
                    {calcularEdad(form.fecha_nacimiento)} AÑOS
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold flex items-center gap-2 pt-4">
              <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              Motivo y Cuestionario
            </h2>

            <textarea
              className="bg-muted border border-border rounded-xl p-3.5 w-full focus:ring-2 focus:ring-primary/20 outline-none transition"
              rows={2}
              placeholder="Motivo de la consulta inicial..."
              value={form.motivo}
              onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-muted/50 p-4 rounded-2xl border border-border">
              {preguntas.map((p) => (
                <label key={p} className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg cursor-pointer transition group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border transition-all checked:bg-secondary checked:border-secondary"
                      checked={respuestas[p] || false}
                      onChange={(e) => setRespuestas({ ...respuestas, [p]: e.target.checked })}
                    />
                    <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-[10px]">
                      ✓
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{p}</span>
                </label>
              ))}
            </div>

            {error && (
              <div className="p-4 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full mt-8 py-4 rounded-2xl font-bold text-lg text-white 
                        bg-linear-to-r from-secondary to-red-700 
                        hover:from-red-700 hover:to-secondary
                        shadow-[0_0_20px_rgba(225,29,72,0.4)] 
                        hover:shadow-[0_0_30px_rgba(225,29,72,0.6)]
                        active:scale-[0.98] transition-all duration-300
                        flex items-center justify-center gap-2 border border-white/10"
              onClick={crearPacienteCompleto}
            >
              {loading ? "Procesando..." : "Finalizar Registro y Abrir Historia"}
            </button>
          </div>
        </section>

<aside className="space-y-6">
          <div className="bg-surface p-6 rounded-3xl shadow-lg border border-border">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
              <span>👥</span> Ingresos Recientes
            </h3>
            <ul className="space-y-4">
              {pacientes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border group hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xs">
                    {p.apellido[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate w-32 text-foreground">{p.apellido}, {p.nombre}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">DNI {p.dni}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button 
              className="w-full mt-6 text-sm text-primary font-bold hover:underline transition-all flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/busqueda'}
            >
              Buscar pacientes <span>→</span>
            </button>
          </div>

          {/* RECORDATORIO MÉDICO */}
          <div className="bg-secondary/5 p-6 rounded-3xl border border-secondary/10">
            <h4 className="text-secondary font-bold text-sm mb-2 uppercase tracking-tighter">Recordatorio Legal</h4>
            <p className="text-xs text-foreground/70 leading-relaxed italic">
              "Toda información ingresada forma parte de un documento legal. Verifique el DNI antes de confirmar."
            </p>
          </div>
        </aside>
      </main>
    </div>
  )
}