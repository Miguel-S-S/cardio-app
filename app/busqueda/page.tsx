'use client'

import { useEffect, useState, useMemo } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'

// --- TIPOS ---
type Paciente = { id: string; nombre: string; apellido: string; dni: string }
type Tratamiento = { id: string; descripcion: string }
type Respuesta = { id: string; pregunta: string; respuesta: boolean }
type Consulta = { id: string; motivo: string; fecha: string; tratamientos?: Tratamiento[]; respuestas?: Respuesta[] }
type Archivo = { id: string; paciente_id: string; nombre: string; path: string; created_at: string }

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

  // --- LÓGICA DE DATOS ---
  const cargarArchivos = async (pacienteId: string) => {
    const { data } = await supabase.from('archivos').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false })
    setArchivos(data ? (data as Archivo[]) : [])
  }

  const verArchivo = (path: string) => {
    const { data } = supabase.storage.from('estudios').getPublicUrl(path)
    window.open(data.publicUrl, '_blank')
  }

  const descargarArchivo = async (path: string, nombre: string) => {
    const { data } = await supabase.storage.from('estudios').download(path)
    if (!data) return
    const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = nombre; a.click()
  }

  useEffect(() => {
    const fetchPacientes = async () => {
      const { data } = await supabase.from('pacientes').select('id, nombre, apellido, dni').ilike('apellido', `%${busqueda}%`)
      if (data) setPacientes(data as Paciente[])
    }
    if (busqueda.length > 2) fetchPacientes(); else setPacientes([])
  }, [busqueda, supabase])

  const cargarConsultas = async (idPaciente: string) => {
    let query = supabase.from('consultas').select('id, motivo, fecha, tratamientos (id, descripcion), respuestas (id, pregunta, respuesta)').eq('paciente_id', idPaciente)
    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)
    const { data } = await query.order('fecha', { ascending: false })
    if (data) setConsultas(data as any[])
  }

  const subirArchivo = async () => {
    if (!archivo || !pacienteSeleccionado) return
    const nombreArchivo = `${Date.now()}-${archivo.name}`
    const { data, error } = await supabase.storage.from('estudios').upload(nombreArchivo, archivo)
    if (!error) {
      await supabase.from('archivos').insert([{ paciente_id: pacienteSeleccionado.id, nombre: archivo.name, path: data.path }])
      setArchivo(null); cargarArchivos(pacienteSeleccionado.id)
    }
  }

  const guardarTratamiento = async (consultaId: string, descripcion: string) => {
    if (!descripcion.trim()) return
    const { error } = await supabase.from('tratamientos').insert([{ consulta_id: consultaId, descripcion }])
    if (!error && pacienteSeleccionado) cargarConsultas(pacienteSeleccionado.id)
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-10 text-foreground">
      
      {/* HEADER VISIBLE EN PANTALLA */}
      <header className="flex items-center justify-between pb-6 border-b border-border no-print">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-secondary">❤️</span>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Pacientes</h1>
        </div>
        <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary-dark transition-all flex items-center gap-2" onClick={() => window.print()}>
          <span>🖨️</span> Imprimir Historia Clínica
        </button>
      </header>

      {/* BUSCADOR VISIBLE EN PANTALLA */}
      <section className="no-print bg-surface p-6 rounded-3xl shadow-lg border border-border">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">🔍</span>
          <input type="text" placeholder="Buscar por apellido..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-muted border border-border rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition" />
        </div>
        {pacientes.length > 0 && (
          <ul className="mt-5 space-y-2">
            {pacientes.map((p) => (
              <li key={p.id} onClick={() => { setPacienteSeleccionado(p); cargarConsultas(p.id); cargarArchivos(p.id); }}
                className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border cursor-pointer hover:bg-primary/5 transition">
                <div><p className="font-bold text-lg">{p.apellido.toUpperCase()}, {p.nombre}</p><p className="text-xs opacity-60">DNI: {p.dni}</p></div>
                <span>➡️</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pacienteSeleccionado && (
        <>
          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
            {/* COLUMNA IZQUIERDA: INFO Y ARCHIVOS (NO SE IMPRIME) */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-surface p-6 rounded-3xl shadow-lg border border-border">
                <h2 className="text-2xl font-bold mb-2">{pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}</h2>
                <p className="text-sm opacity-60 mb-6 font-mono tracking-tighter">ID: {pacienteSeleccionado.id}</p>
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" onChange={(e) => setDesde(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-xs" />
                    <input type="date" onChange={(e) => setHasta(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-xs" />
                  </div>
                  <button className="w-full bg-muted py-2 rounded-lg font-bold text-sm border border-border hover:bg-border transition" onClick={() => cargarConsultas(pacienteSeleccionado.id)}>Aplicar Filtro 📅</button>
                </div>
              </div>

              <div className="bg-surface p-6 rounded-3xl shadow-lg border border-border space-y-4">
                <h3 className="font-bold">📎 Adjuntar Estudio</h3>
                <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="w-full text-xs" />
                <button className="w-full bg-secondary text-white py-2 rounded-lg font-bold text-sm hover:bg-secondary/90 transition" onClick={subirArchivo}>Subir Archivo</button>
                <div className="pt-4 space-y-2">
                  {archivos.map((a) => (
                    <div key={a.id} className="bg-muted/50 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="truncate w-32">{a.nombre}</span>
                      <div className="flex gap-2">
                        <button onClick={() => verArchivo(a.path)}>👁️</button>
                        <button onClick={() => descargarArchivo(a.path, a.nombre)}>⬇️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* COLUMNA DERECHA: TRATAMIENTOS (NO SE IMPRIME) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface p-6 md:p-8 rounded-3xl shadow-lg border border-border min-h-150">
                <h3 className="text-2xl font-bold tracking-tight mb-8 flex items-center gap-2"><span>📋</span> Plan de Tratamiento</h3>
                <div className="space-y-6">
                  {consultas.map((c) => (
                    <div key={c.id} className="bg-muted/30 border border-border rounded-2xl p-6 transition-all">
                      <div className="flex justify-between items-start mb-4 border-b border-border pb-2">
                        <span className="text-[10px] font-black uppercase bg-muted px-2 py-1 rounded border border-border">{new Date(c.fecha).toLocaleDateString()}</span>
                        <h4 className="text-md font-bold uppercase">{c.motivo}</h4>
                      </div>
                      
                   {c.respuestas && c.respuestas.some(r => r.respuesta) && (
                      <div className="mb-4 flex flex-wrap gap-1">
                        {c.respuestas.filter(r => r.respuesta).map(r => (
                          <span key={r.id} className="text-[10px] bg-muted px-2 py-0.5 rounded-full border border-border opacity-70">
                            ● {r.pregunta}
                          </span>
                        ))}
                      </div>
                    )}

                      <div className="space-y-2 mb-6">
                        {c.tratamientos?.map((t) => (
                          <div key={t.id} className="flex items-start gap-2 bg-surface p-3 rounded-xl border border-border text-sm italic">
                            <span className="text-success">✅</span> {t.descripcion}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input type="text" placeholder="Nueva indicación..." className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-sm outline-none" 
                          onKeyDown={(e) => { if (e.key === 'Enter') { guardarTratamiento(c.id, (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; }}} />
                        <button onClick={(e) => { const input = (e.currentTarget.previousSibling as HTMLInputElement); guardarTratamiento(c.id, input.value); input.value = ''; }} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold">Agregar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* ==========================================
              BLOQUE EXCLUSIVO DE IMPRESIÓN (HIDDEN)
              ========================================== */}
          <div className="print-only p-8 text-black bg-white">
            {/* MEMBRETE */}
            <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-black uppercase">Cardio-App | Medico Cardiologo</h1>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Servicio de Cardiología Integral</p>
                <p className="text-xs mt-1 text-gray-500">Clinica Cardiologica del  - Tel: 0800-CARDIO</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase">Historia Clínica DNI Nº</p>
                <p className="text-lg font-mono">{pacienteSeleccionado.dni}</p>
              </div>
            </div>

            {/* DATOS PACIENTE */}
            <div className="grid grid-cols-2 gap-4 bg-gray-100 p-4 rounded-lg mb-10 border border-gray-300">
              <p className="text-sm"><strong>PACIENTE:</strong> {pacienteSeleccionado.apellido.toUpperCase()}, {pacienteSeleccionado.nombre}</p>
              <p className="text-sm"><strong>DNI:</strong> {pacienteSeleccionado.dni}</p>
              <p className="text-sm"><strong>FECHA IMPRESIÓN:</strong> {new Date().toLocaleDateString()}</p>
              <p className="text-sm"><strong>SISTEMA:</strong> CardioApp v1.0</p>
            </div>

            {/* EVOLUCIÓN MÉDICA */}
            <div className="space-y-8">
              <h2 className="text-xl font-black uppercase border-b border-black pb-2 mb-6 text-center">Registro de Evolución y Tratamientos</h2>
              {consultas.map(c => (
                <div key={c.id} className="pb-6 border-b border-gray-200">
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-bold">FECHA: {new Date(c.fecha).toLocaleDateString()}</p>
                    <p className="text-sm font-black uppercase">MOTIVO: {c.motivo}</p>
                  </div>

                  {c.respuestas && c.respuestas.some(r => r.respuesta) && (
                    <div className="text-[10px] text-gray-600 italic mb-3">
                      Antecedentes registrados: {c.respuestas.filter(r => r.respuesta).map(r => r.pregunta).join(', ')}
                    </div>
                  )}

                  <div className="pl-4">
                    <p className="text-xs font-bold mb-2 uppercase text-gray-500 underline">Indicaciones y Plan de Accion:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {c.tratamientos?.map(t => (
                        <li key={t.id} className="text-sm leading-tight text-gray-800">{t.descripcion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* SECCIÓN DE FIRMA (AL FINAL) */}
            <div className="mt-20 flex justify-end">
              <div className="text-center w-64 border-t-2 border-black pt-2">
                <p className="text-sm font-bold uppercase">Saucedo Manuel</p>
                <p className="text-xs text-gray-500">Firma y Sello del Médico Responsable</p>
                <div className="h-20 mt-2 border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-300">Espacio para Sello</div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full text-center text-[8px] text-gray-400 uppercase">
              Historia CLinica. Prohibida su alteración.
            </div>
          </div>
        </>
      )}
    </div>
  )
}