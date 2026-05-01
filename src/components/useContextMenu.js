import { useState, useEffect, useCallback, useRef } from "react";

export function useContextMenu() {
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, type: null, chatId: null, msgId: null });
  const timerRef = useRef(null);

  const open = useCallback((x, y, type, chatId, msgId) => {
    setMenu({ visible: true, x, y, type, chatId, msgId });
  }, []);

  const close = useCallback(() => {
    setMenu(m => ({ ...m, visible: false }));
  }, []);

  // ПКМ на десктопе
  const onContextMenu = useCallback((e, type, chatId, msgId) => {
    console.log("Context menu triggered", { x: e.clientX, y: e.clientY, type, chatId, msgId });
    e.preventDefault();
    open(e.clientX, e.clientY, type, chatId, msgId);
  }, [open]);

  // Зажатие на телефоне
  const onTouchStart = useCallback((e, type, chatId, msgId) => {
    const touch = e.touches[0];
    timerRef.current = setTimeout(() => {
      open(touch.clientX, touch.clientY, type, chatId, msgId);
    }, 500);
  }, [open]);

  const onTouchEnd = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const onTouchMove = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
  if (menu.visible) {
    const handleClick = () => close();
    const handleContext = (e) => {
      e.preventDefault();
      close();
    };

    // setTimeout чтобы не поймать тот же самый клик
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
      window.addEventListener("contextmenu", handleContext);
    }, 0);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleContext);
    };
  }
}, [menu.visible, close]);

  return { menu, open, close, onContextMenu, onTouchStart, onTouchEnd, onTouchMove };
}