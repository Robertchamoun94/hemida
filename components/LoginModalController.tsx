// components/LoginModalController.tsx
'use client';

import { useEffect, useState } from 'react';
import { OPEN_LOGIN_MODAL_EVENT } from '@/lib/loginModalBus';
import LoginModal from './LoginModal';

// Byt prop-namn här om din LoginModal använder t.ex. isOpen istället för open.
export default function LoginModalController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_LOGIN_MODAL_EVENT, handler);
    return () => window.removeEventListener(OPEN_LOGIN_MODAL_EVENT, handler);
  }, []);

  return <LoginModal open={open} onClose={() => setOpen(false)} />;
}
