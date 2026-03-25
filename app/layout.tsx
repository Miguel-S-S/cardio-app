import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🏥 Metadatos personalizados para tu sistema
export const metadata: Metadata = {
  title: "CardioApp | Gestión de Historias Clínicas",
  description: "Sistema profesional de monitoreo y registro cardiológico",
};

// --- COMPONENTE DEL MONITOR ECG REALISTA V2 (en layout.tsx) ---
const ECGHeader = () => (
  <div className="ecg-container no-print">
    <div className="ecg-line-wrapper">
      {/* Generamos un dibujo SVG realista con las ondas P, QRS, T (complejo) */}
      <svg className="ecg-svg-realistic" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <path d="M0,50 L200,50 C210,50 215,40 220,50 S225,60 230,50 L300,50 L310,10 L330,90 L350,50 L450,50 C460,50 465,45 470,50 S475,55 480,50 L550,50 C560,50 565,40 570,50 S575,60 580,50 L650,50 L660,10 L680,90 L700,50 L800,50 C810,50 815,45 820,50 S825,55 830,50 L900,50 L1000,50" />
      </svg>
      {/* Repetimos el mismo SVG exacto para el efecto de bucle infinito */}
      <svg className="ecg-svg-realistic" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <path d="M0,50 L200,50 C210,50 215,40 220,50 S225,60 230,50 L300,50 L310,10 L330,90 L350,50 L450,50 C460,50 465,45 470,50 S475,55 480,50 L550,50 C560,50 565,40 570,50 S575,60 580,50 L650,50 L660,10 L680,90 L700,50 L800,50 C810,50 815,45 820,50 S825,55 830,50 L900,50 L1000,50" />
      </svg>
    </div>
    
    {/* Texto de estado (Opcional, si lo tenías) */}
    <div className="ecg-monitor-text">
      MONITOR CARDIOAPP ACTIVO
    </div>
  </div>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es" // Cambiado a español
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-[60px]"> 
        {/* pt-[60px] deja espacio para que el monitor ECG no tape el contenido */}
        
        <ECGHeader />
        
        <main className="flex-1">
          {children}
        </main>

        <footer className="no-print p-8 text-center text-muted-foreground text-xs border-t border-border">
          <p>CardioApp v1.0 - Sistema de Gestión Médica Especializada</p>
        </footer>
      </body>
    </html>
  );
}