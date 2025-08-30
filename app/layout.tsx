// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import Image from 'next/image'
import Header from '@/components/Header'
import LoginModalController from '@/components/LoginModalController' // ⬅️ NY: lyssnar på open-login-modal

export const metadata: Metadata = {
  title: 'Hemida',
  description: 'Hitta din bostad – till salu och uthyres',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body className="relative min-h-screen text-slate-900 antialiased">
        {/* Fullskärms bakgrundsbild */}
        <div className="fixed inset-0 -z-50">
          <Image
            src="/bg-home.png"
            alt="Somrig villa med blå himmel"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Svag overlay för kontrast */}
        <div className="fixed inset-0 -z-40 bg-white/10" />

        {/* Header – visas bara här */}
        <Header />

        {/* Sidinnehåll */}
        <main className="relative z-10 backdrop-blur-sm">
          {children}
        </main>

        {/* Global controller som kan öppna LoginModal från var som helst */}
        <LoginModalController />
      </body>
    </html>
  )
}
