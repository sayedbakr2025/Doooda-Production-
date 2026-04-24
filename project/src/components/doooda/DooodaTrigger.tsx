import { useCallback, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDooodaAccess } from './useDooodaAccess';
import './dooodaTrigger.css';

export default function DooodaTrigger() {
  const triggerRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  const access = useDooodaAccess();

  const handleClick = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 150);

    if (access.loading) return;

    window.dispatchEvent(
      new CustomEvent('toggle-doooda-chat', {
        detail: { source: 'floating-button' },
      })
    );
  }, [access, language]);

  if (access.loading) return null;
  if (!access.visible) return null;

  return (
    <div
      ref={triggerRef}
      className="dooooda-trigger"
      onClick={handleClick}
    >
      <div className="ooo">
        <span className="dot side" />
        <span className="dot middle" />
        <span className="dot side" />
      </div>
    </div>
  );
}
