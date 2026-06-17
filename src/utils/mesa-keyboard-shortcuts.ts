type ShortcutHandler = () => void;

export type MesaCharacterShortcutsOptions = {
  enabled: boolean;
  onOpenCharacterSheet: ShortcutHandler;
  onOpenSpellBook: ShortcutHandler;
};

const isTypingElement = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;

  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT' ||
    element.isContentEditable
  );
};

export const registerMesaCharacterShortcuts = (options: MesaCharacterShortcutsOptions) => {
  const onKeyDown = (event: KeyboardEvent) => {
    if (!options.enabled) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingElement(event.target)) return;

    const key = event.key.toLowerCase();
    if (key === 'f') {
      event.preventDefault();
      options.onOpenCharacterSheet();
      return;
    }

    if (key === 'g') {
      event.preventDefault();
      options.onOpenSpellBook();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
};
