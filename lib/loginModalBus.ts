// lib/loginModalBus.ts
export const OPEN_LOGIN_MODAL_EVENT = 'open-login-modal';

export function openLoginModal() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN_MODAL_EVENT));
}
