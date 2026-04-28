import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./ContextMenu.css";

const OUT_ITEMS = [
  { id: "edit",   label: "Изменить" },
  { id: "copy",   label: "Копировать" },
  { id: "delete", label: "Удалить", danger: true },
];

const IN_ITEMS = [
  { id: "copy",   label: "Копировать" },
  { id: "delete", label: "Удалить", danger: true },
];

export function ContextMenu({ x, y, type, onAction, onClose }) {
    console.log("ContextMenu render", { x, y, type });
  const ref = useRef(null);
  const items = type === "out" ? OUT_ITEMS : IN_ITEMS;

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const { innerWidth, innerHeight } = window;
    if (x + el.offsetWidth > innerWidth)  el.style.left = `${x - el.offsetWidth}px`;
    else                                   el.style.left = `${x}px`;
    if (y + el.offsetHeight > innerHeight) el.style.top  = `${y - el.offsetHeight}px`;
    else                                   el.style.top  = `${y}px`;
  }, [x, y]);

  return createPortal(
    <ul className="ctx-menu" ref={ref} style={{ left: x, top: y }}>
      {items.map(item => (
        <li
          key={item.id}
          className={`ctx-menu__item${item.danger ? " ctx-menu__item--danger" : ""}`}
          onClick={() => { onAction(item.id); onClose(); }}
        >
          {item.label}
        </li>
      ))}
    </ul>,
    document.body
  );
}