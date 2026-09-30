import { useEffect, useRef } from 'react';
import { overlayOpen, overlayClose } from '../lib/overlayBack';

export function useOverlay(id: string, open: boolean, onClose: () => void) {
  const idRef = useRef(id);
  idRef.current = id;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      overlayOpen(idRef.current, () => onCloseRef.current());
    } else {
      overlayClose(idRef.current);
    }
    return () => {
      overlayClose(idRef.current);
    };
  }, [open, id]);
}