'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'
import LoginModal from './LoginModal'
import ProfileMenu from './ProfileMenu'

type AuthState = 'loading' | 'authed' | 'anon'

export default function Header() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [cachedAvatar, setCachedAvatar] = useState<string | null>(null)

  useEffect(() => {
    // Läs ev. senast sparad avatar från localStorage direkt (för att undvika flicker)
    try {
      const a = localStorage.getItem('hemida_avatar_url')
      if (a) setCachedAvatar(a)
    } catch {}

    let unsub = () => {}

    ;(async () => {
      const { data } = await supabase.auth.getSession()
      setAuthState(data.session ? 'authed' : 'anon')

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        setAuthState(s ? 'authed' : 'anon')
      })
      unsub = () => sub.subscription.unsubscribe()
    })()

    // Uppdatera när profilen ändras (vi triggar denna i profil-sidan)
    const onProfileUpdated = () => {
      try {
        const a = localStorage.getItem('hemida_avatar_url')
        setCachedAvatar(a)
      } catch {}
    }
    window.addEventListener('profile:updated', onProfileUpdated)
    window.addEventListener('storage', (e) => {
      if (e.key === 'hemida_avatar_url') {
        setCachedAvatar(e.newValue)
      }
    })

    return () => {
      unsub()
      window.removeEventListener('profile:updated', onProfileUpdated)
    }
  }, [])

  // Liten rund “skeleton” som håller platsen i layouten
  const AvatarPlaceholder = (
    <div
      className="
        h-8 w-8 md:h-9 md:w-9 rounded-full overflow-hidden
        border border-white/90 bg-white/20
        animate-pulse
      "
      aria-hidden
    >
      {cachedAvatar ? (
        <img src={cachedAvatar} alt="" className="h-full w-full object-cover" />
      ) : null}
    </div>
  )

  // Klickvakt: om utloggad -> stoppa navigation och öppna login-modal
  const handleProtectedClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (authState === 'anon') {
      e.preventDefault()
      setLoginOpen(true)
    }
  }

  return (
    <>
      <header
        className="
          sticky top-0 z-40 w-full border-b backdrop-blur
          bg-[#1E3A8A] shadow-sm
          overflow-visible
        "
      >
        <div
          className="
            mx-auto flex max-w-6xl items-center
            px-3 py-2
            md:px-4 md:py-2.5
            overflow-visible
          "
        >
          {/* LOGO */}
          <a href="/" className="flex items-center gap-2">
            <div
              className="
                grid h-7 w-7 place-items-center rounded-full border border-white text-white bg-[#1E3A8A]
                md:h-8 md:w-8
              "
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="text-white"
              >
                <path d="M3 11l9-7 9 7" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>
            <span className="font-semibold tracking-tight text-white text-[15px] md:text-lg">
              Hemida
            </span>
          </a>

          {/* Länkar + auth */}
          <nav
            className="
              ml-auto flex items-center
              gap-2 md:gap-3 lg:gap-4
              relative overflow-visible
            "
          >
            <a
              href="/salja"
              onClick={handleProtectedClick}
              className="
                whitespace-nowrap leading-none
                rounded-lg border border-white
                px-2.5 py-1 text-[13px] md:px-3 md:py-1.5 md:text-sm
                font-semibold text-white hover:bg-white hover:text-[#1E3A8A] transition
              "
            >
              Sälja bostad
            </a>
            <a
              href="/hyra-ut"
              onClick={handleProtectedClick}
              className="
                whitespace-nowrap leading-none
                rounded-lg border border-white
                px-2.5 py-1 text-[13px] md:px-3 md:py-1.5 md:text-sm
                font-semibold text-white hover:bg-white hover:text-[#1E3A8A] transition
              "
            >
              Hyra ut bostad
            </a>

            {/* Auth: loading => skeleton, authed => profilmeny, anon => Logga in */}
            {authState === 'loading' ? (
              AvatarPlaceholder
            ) : authState === 'authed' ? (
              // ⬇⬇ Viktigt för dropdownen ⬇⬇
              <div className="relative z-[60]">
                <ProfileMenu />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="
                  whitespace-nowrap leading-none
                  rounded-lg border border-white
                  px-2.5 py-1 text-[13px] md:px-3 md:py-1.5 md:text-sm
                  font-semibold text-white hover:bg-white hover:text-[#1E3A8A] transition
                "
              >
                Logga in
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Inloggnings-/registreringsmodal */}
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
