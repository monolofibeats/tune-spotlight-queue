import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PopOutPortalProps {
  widgetId: string;
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
  height?: number;
  /** A window that was pre-opened synchronously from a user click (to bypass popup blockers) */
  preOpenedWindow?: Window;
}

export function PopOutPortal({ widgetId, title, children, onClose, width = 600, height = 500, preOpenedWindow }: PopOutPortalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const windowRef = useRef<Window | null>(null);
  const onCloseRef = useRef(onClose);

  // Keep the ref in sync without re-triggering the effect
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    // Use pre-opened window if available, otherwise try to open a new one
    const popup = preOpenedWindow || window.open('', `widget_${widgetId}`, `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`);
    if (!popup) {
      onCloseRef.current();
      return;
    }

    windowRef.current = popup;
    popup.document.title = `UpStar — ${title}`;

    // Clear any existing content (for pre-opened windows)
    popup.document.head.innerHTML = '';
    popup.document.body.innerHTML = '';

    // Copy stylesheets from parent
    const parentStyles = document.querySelectorAll('link[rel="stylesheet"], style');
    parentStyles.forEach(style => {
      popup.document.head.appendChild(style.cloneNode(true));
    });

    // Add base styles
    const baseStyle = popup.document.createElement('style');
    baseStyle.textContent = `
      body {
        margin: 0;
        padding: 16px;
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        font-family: inherit;
        overflow: auto;
      }
      :root {
        ${getComputedCSSVars()}
      }
    `;
    popup.document.head.appendChild(baseStyle);

    // Create render container
    const div = popup.document.createElement('div');
    div.id = 'pop-out-root';
    popup.document.body.appendChild(div);
    setContainer(div);

    // Handle window close
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        onCloseRef.current();
      }
    }, 500);

    popup.addEventListener('beforeunload', () => {
      clearInterval(checkClosed);
      onCloseRef.current();
    });

    return () => {
      clearInterval(checkClosed);
      if (!popup.closed) popup.close();
    };
  // Only re-run when widgetId, title, or dimensions change — NOT onClose
  }, [widgetId, title, width, height, preOpenedWindow]);

  if (!container) return null;

  return createPortal(children, container);
}

function getComputedCSSVars(): string {
  const root = document.documentElement;
  const computed = getComputedStyle(root);
  const vars = [
    '--background', '--foreground', '--card', '--card-foreground',
    '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
    '--muted', '--muted-foreground', '--accent', '--accent-foreground',
    '--destructive', '--destructive-foreground', '--border', '--input', '--ring',
    '--radius',
  ];
  return vars.map(v => `${v}: ${computed.getPropertyValue(v)};`).join('\n');
}
