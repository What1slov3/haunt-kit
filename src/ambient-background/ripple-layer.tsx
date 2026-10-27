import { useEffect, useRef, useState } from 'react';

import { ambient, reactionGain, type AmbientReaction } from './ambient-events';
import styles from './ambient-background.module.css';

interface RippleLayerProps {
  reaction: AmbientReaction;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  strength: number;
}

/**
 * Реакция фона из пятен на `ambient.pulse`: одно расходящееся кольцо на CSS (transform + opacity).
 * Не больше трёх одновременно; кольцо удаляется по концу анимации.
 */
export function RippleLayer({ reaction }: RippleLayerProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (reactionGain[reaction] === 0) return;

    return ambient.subscribe((pulse) => {
      const root = rootRef.current;

      if (!root) return;

      const rect = root.getBoundingClientRect();
      const ripple = {
        id: nextId.current++,
        x: pulse.x - rect.left,
        y: pulse.y - rect.top,
        strength: pulse.strength * reactionGain[reaction],
      };

      setRipples((current) => [...current.slice(-2), ripple]);
    });
  }, [reaction]);

  const remove = (id: number) => setRipples((current) => current.filter((r) => r.id !== id));

  return (
    <div ref={rootRef} className={styles.rippleLayer}>
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className={styles.ripple}
          style={{ left: ripple.x, top: ripple.y, opacity: 0.5 * ripple.strength }}
          onAnimationEnd={() => remove(ripple.id)}
        />
      ))}
    </div>
  );
}
