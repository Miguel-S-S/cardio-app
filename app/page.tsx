import Link from 'next/link'

export default function Home() {
  return (
    
 <div className="bg-primary text-white p-4 shadow-md flex justify-between">
  <div className="ecg-line mb-4"></div>
  <h1 className="text-xl font-semibold">CardioSys</h1>
  <span className="text-sm opacity-80">Sistema de Gestión Cardiológica</span>
        <Link href="/pacientes">
        Ir a pacientes
      </Link>
      <Link href="/busqueda">
        Ir a búsqueda de pacientes
      </Link>
</div>


  )
}