'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'

type Paciente = {
  id: string
  nombre: string
  apellido: string
  dni: string
}

type Tratamiento = {
  id: string
  descripcion: string
}

type Consulta = {
  id: string
  motivo: string
  fecha: string
  tratamientos?: Tratamiento[]
}

type Archivo = {
  id: string
  paciente_id: string
  nombre: string
  path: string
  created_at: string
}

export default function BusquedaPage() {
  const supabase = useMemo(() => getSupabaseClient(), [])

  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [archivos, setArchivos] = useState<Archivo[]>([]) 

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  
  const [archivo, setArchivo] = useState<File | null>(null)

  const cargarArchivos = async (pacienteId: string) => {
    const { data } = await supabase
      .from('archivos')
      .select('*')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })

    if (data) {
      setArchivos(data as Archivo[])
    } else {
      setArchivos([]) 
    }
  }

  const verArchivo = (path: string) => {
    const { data } = supabase.storage.from('estudios').getPublicUrl(path)
    window.open(data.publicUrl, '_blank')
  }

  const descargarArchivo = async (path: string, nombre: string) => {
    const { data } = await supabase.storage.from('estudios').download(path)
    if (!data) return
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    a.click()
  }

  useEffect(() => {
    const fetchPacientes = async () => {
      const { data } = await supabase
        .from('pacientes')
        .select('id, nombre, apellido, dni')
        .ilike('apellido', `%${busqueda}%`)

      if (data) setPacientes(data as Paciente[])
    }

    if (busqueda.length > 2) {
      fetchPacientes()
    } else {
      setPacientes([])
    }
  }, [busqueda, supabase])

  // 🔄 CORRECCIÓN: Cargar Consultas trayendo sus Tratamientos asociados
  const cargarConsultas = async (idPaciente: string) => {
    let query = supabase
      .from('consultas')
      .select(`
        id, 
        motivo, 
        fecha, 
        tratamientos (
          id, 
          descripcion
        )
      `) // <-- Traemos los tratamientos anidados
      .eq('paciente_id', idPaciente)

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)

    const { data } = await query.order('fecha', { ascending: false })
    if (data) setConsultas(data as any[])
  }

  const subirArchivo = async () => {
    if (!archivo || !pacienteSeleccionado) {
      alert("Seleccione un archivo primero")
      return
    }

    const nombreArchivo = `${Date.now()}-${archivo.name}`
    const { data, error } = await supabase.storage.from('estudios').upload(nombreArchivo, archivo)

    if (error) {
      alert('Error al subir archivo')
      return
    }

    await supabase.from('archivos').insert([
      { 
        paciente_id: pacienteSeleccionado.id, 
        nombre: archivo.name, 
        path: data.path 
      }
    ])

    alert('✅ Archivo subido correctamente')
    setArchivo(null)
    cargarArchivos(pacienteSeleccionado.id)
  }

  const guardarTratamiento = async (consultaId: string, descripcion: string) => {
    if (!descripcion.trim()) return

    const { error } = await supabase.from('tratamientos').insert([
      { consulta_id: consultaId, descripcion: descripcion }
    ])

    if (!error) {
      // 🚀 Recargamos las consultas para que el tratamiento aparezca en la lista automáticamente
      if (pacienteSeleccionado) cargarConsultas(pacienteSeleccionado.id)
    } else {
      alert('Error al guardar el tratamiento')
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-10">
      
      <header className="flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-4xl">❤️</span>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Búsqueda de Historias Clínicas
          </h1>
        </div>
        <button 
          className="no-print bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-dark transition-all shadow-sm flex items-center gap-2"
          onClick={() => window.print()}
        >
          <span>🖨️</span> Imprimir Historia
        </button>
      </header>

      <section className="no-print bg-surface p-6 rounded-3xl shadow-lg border border-border">
        <label className="block text-sm font-medium text-foreground/70 mb-2">Buscar Paciente</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          <input
            type="text"
            placeholder="Escribe el apellido del paciente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-muted border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        {pacientes.length > 0 && (
          <ul className="mt-5 space-y-3">
            {pacientes.map((p) => (
              <li 
                key={p.id} 
                onClick={() => {
                  setPacienteSeleccionado(p)
                  cargarConsultas(p.id)
                  cargarArchivos(p.id)
                }} 
                className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-sm hover:border-primary/30 hover:bg-primary/5 cursor-pointer transition-all group"
              >
                <div>
                  <p className="font-semibold text-foreground group-hover:text-primary transition text-lg">
                    {p.apellido.toUpperCase()}, {p.nombre}
                  </p>
                  <p className="text-sm text-muted-foreground">DNI: {p.dni}</p>
                </div>
                <span className="text-primary opacity-0 group-hover:opacity-100 transition">➡️</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pacienteSeleccionado && (
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-8 no-print">
            <div className="bg-surface p-6 rounded-3xl shadow-lg border border-border">
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-3xl text-muted-foreground font-bold">
                  {pacienteSeleccionado.apellido[0]}{pacienteSeleccionado.nombre[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}
                  </h2>
                  <p className="text-muted-foreground italic text-sm">DNI: {pacienteSeleccionado.dni}</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground/70">Filtrar Consultas</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" onChange={(e) => setDesde(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl text-foreground focus:ring-1 focus:ring-primary text-xs" />
                  <input type="date" onChange={(e) => setHasta(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl text-foreground focus:ring-1 focus:ring-primary text-xs" />
                </div>
                <button className="w-full bg-muted text-foreground px-4 py-2.5 rounded-xl font-medium border border-border hover:bg-border transition text-sm" onClick={() => cargarConsultas(pacienteSeleccionado.id)}>
                  Aplicar Filtro 📅
                </button>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-3xl shadow-lg border border-border space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2"><span>📎</span> Adjuntar Estudio</h3>
              <input
                type="file"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              <button 
                className="w-full bg-secondary text-white px-4 py-3 rounded-xl font-semibold hover:bg-secondary/90 transition shadow-sm" 
                onClick={subirArchivo}
              >
                Subir Archivo
              </button>

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-bold mb-4">Estudios Almacenados</h4>
                <ul className="space-y-3">
                  {archivos.map((a) => (
                    <li key={a.id} className="bg-muted/50 p-3 rounded-xl flex justify-between items-center border border-border group">
                      <span className="text-xs font-medium truncate w-32">{a.nombre}</span>
                      <div className="flex gap-2">
                        <button onClick={() => verArchivo(a.path)} className="text-sm hover:scale-110 transition" title="Ver">👁️</button>
                        <button onClick={() => descargarArchivo(a.path, a.nombre)} className="text-sm hover:scale-110 transition" title="Descargar">⬇️</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-surface p-6 md:p-8 rounded-3xl shadow-lg border border-border min-h-150">
              <h3 className="text-2xl font-bold tracking-tight mb-8 pb-6 border-b border-border flex items-center gap-2 text-primary">
                <span>💊</span> Plan de Tratamiento y Evolución
              </h3>

              {consultas.length > 0 ? (
                <div className="space-y-8">
                  {consultas.map((c) => (
                    <div key={c.id} className="bg-muted/30 border border-border rounded-2xl p-6 hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                          {new Date(c.fecha).toLocaleDateString()}
                        </span>
                        <h4 className="text-lg font-bold text-foreground uppercase tracking-tight">{c.motivo}</h4>
                      </div>

                      <div className="space-y-3 mb-6">
                        {c.tratamientos && c.tratamientos.length > 0 ? (
                          c.tratamientos.map((t) => (
                            <div key={t.id} className="flex items-start gap-3 bg-surface p-4 rounded-xl border border-border shadow-sm group">
                              <span className="text-success">✅</span>
                              <p className="text-sm text-foreground/90 font-medium leading-relaxed">{t.descripcion}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic pl-1">No se han registrado indicaciones aún.</p>
                        )}
                      </div>

                      <div className="flex gap-3 no-print mt-4 pt-4 border-t border-border/50">
                        <input 
                          type="text"
                          placeholder="Indicar medicación o conducta..."
                          className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              guardarTratamiento(c.id, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <button 
                          onClick={(e) => {
                            const inputElement = (e.currentTarget.previousSibling as HTMLInputElement);
                            guardarTratamiento(c.id, inputElement.value);
                            inputElement.value = '';
                          }}
                          className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-primary-dark transition-all shadow-md active:scale-95"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-muted-foreground/40 italic text-center">
                   <span className="text-7xl mb-6 grayscale opacity-20">⚕️</span>
                   <p className="text-xl">Historial clínico vacío para este paciente</p>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}