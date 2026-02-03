import { useLayoutEffect, RefObject, useRef } from 'react';

interface SmoothScrollOptions {
  speed?: number;
  smoothness?: number;
  enabled?: boolean;
  horizontal?: boolean;
}

export function useSmoothScroll<T extends HTMLElement>(
  ref: RefObject<T>,
  options: SmoothScrollOptions = {},
) {
  const {
    speed = 1,
    smoothness = 0.1,
    enabled = true,
    horizontal = true,
  } = options;

  const cleanupRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled) return;

    // Limpar qualquer listener anterior
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Função de inicialização
    const initialize = () => {
      const element = ref.current;

      if (!element) {
        console.warn(
          'useSmoothScroll: elemento não encontrado, tentando novamente...',
        );
        // Tentar novamente após 100ms se o elemento não existir
        setTimeout(initialize, 100);
        return;
      }

      // Evitar inicializar múltiplas vezes
      if (isInitializedRef.current) {
        console.log('useSmoothScroll: já inicializado, pulando');
        return;
      }

      isInitializedRef.current = true;
      console.log('useSmoothScroll: inicializado com sucesso', {
        speed,
        smoothness,
        horizontal,
      });

      let targetScrollTop = element.scrollTop;
      let currentScrollTop = element.scrollTop;
      let targetScrollLeft = element.scrollLeft;
      let currentScrollLeft = element.scrollLeft;
      let animationFrameId: number | null = null;
      let isAnimating = false;

      const handleWheel = (e: WheelEvent) => {
        const isHorizontalScroll =
          e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

        if (isHorizontalScroll && horizontal) {
          e.preventDefault();
          const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
          targetScrollLeft += delta * speed;
          targetScrollLeft = Math.max(
            0,
            Math.min(
              targetScrollLeft,
              element.scrollWidth - element.clientWidth,
            ),
          );
        } else {
          e.preventDefault();
          targetScrollTop += e.deltaY * speed;
          targetScrollTop = Math.max(
            0,
            Math.min(
              targetScrollTop,
              element.scrollHeight - element.clientHeight,
            ),
          );
        }

        if (!isAnimating) {
          isAnimating = true;
          smoothScroll();
        }
      };

      const smoothScroll = () => {
        currentScrollTop += (targetScrollTop - currentScrollTop) * smoothness;
        element.scrollTop = currentScrollTop;

        currentScrollLeft +=
          (targetScrollLeft - currentScrollLeft) * smoothness;
        element.scrollLeft = currentScrollLeft;

        const hasVerticalDiff =
          Math.abs(targetScrollTop - currentScrollTop) > 0.5;
        const hasHorizontalDiff =
          Math.abs(targetScrollLeft - currentScrollLeft) > 0.5;

        if (hasVerticalDiff || hasHorizontalDiff) {
          animationFrameId = requestAnimationFrame(smoothScroll);
        } else {
          isAnimating = false;
          currentScrollTop = targetScrollTop;
          currentScrollLeft = targetScrollLeft;
        }
      };

      element.addEventListener('wheel', handleWheel, { passive: false });

      // Guardar cleanup
      cleanupRef.current = () => {
        console.log('useSmoothScroll: removendo listeners');
        element.removeEventListener('wheel', handleWheel);
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        isInitializedRef.current = false;
      };
    };

    // Pequeno delay para garantir que o DOM está pronto
    const timeoutId = setTimeout(initialize, 50);

    return () => {
      clearTimeout(timeoutId);
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [speed, smoothness, enabled, horizontal]);
}

export default useSmoothScroll;
