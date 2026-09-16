import { onMount, onCleanup } from 'solid-js'

interface SmoothScrollOptions {
  speed?: number
  smoothness?: number
  enabled?: boolean
  horizontal?: boolean
  lock?: () => boolean
}

export interface SmoothScrollControls {
  // Soma deltas ao alvo de scroll e deixa a animação existente interpolar até lá.
  // Usado, por exemplo, pelo auto-scroll do drag-select em MainContent.
  scrollBy: (deltaY: number, deltaX?: number) => void
}

export function useSmoothScroll(
  getElement: () => HTMLElement | undefined,
  options: SmoothScrollOptions = {}
): SmoothScrollControls {
  const { speed = 1, smoothness = 0.1, enabled = true, horizontal = true, lock } = options

  // ✅ movidos para fora do onMount para que scrollBy() (chamado de fora,
  // ex: durante um drag) possa acessar/alterar o mesmo estado de animação.
  let targetScrollTop = 0
  let currentScrollTop = 0
  let targetScrollLeft = 0
  let currentScrollLeft = 0
  let animationFrameId: number | null = null
  let isAnimating = false
  let isWheelScrolling = false

  const runAnimation = (element: HTMLElement) => {
    currentScrollTop += (targetScrollTop - currentScrollTop) * smoothness
    element.scrollTop = currentScrollTop

    currentScrollLeft += (targetScrollLeft - currentScrollLeft) * smoothness
    element.scrollLeft = currentScrollLeft

    const hasVerticalDiff = Math.abs(targetScrollTop - currentScrollTop) > 0.5
    const hasHorizontalDiff = Math.abs(targetScrollLeft - currentScrollLeft) > 0.5

    if (hasVerticalDiff || hasHorizontalDiff) {
      animationFrameId = requestAnimationFrame(() => runAnimation(element))
    } else {
      isAnimating = false
      isWheelScrolling = false // ✅ libera o handleScroll novamente
      currentScrollTop = targetScrollTop
      currentScrollLeft = targetScrollLeft
    }
  }

  const ensureAnimating = (element: HTMLElement) => {
    if (!isAnimating) {
      isAnimating = true
      runAnimation(element)
    }
  }

  // API pública: rolagem programática usando a mesma interpolação suave.
  // Não depende de `enabled` (o wheel pode estar desligado e o scrollBy
  // continuar funcionando, ex: auto-scroll de drag-select).
  const scrollBy = (deltaY: number, deltaX = 0) => {
    const element = getElement()
    if (!element) return

    isWheelScrolling = true
    targetScrollTop = Math.max(
      0,
      Math.min(targetScrollTop + deltaY, element.scrollHeight - element.clientHeight)
    )
    targetScrollLeft = Math.max(
      0,
      Math.min(targetScrollLeft + deltaX, element.scrollWidth - element.clientWidth)
    )
    ensureAnimating(element)
  }

  onMount(() => {
    const element = getElement()
    if (!element) return

    targetScrollTop = element.scrollTop
    currentScrollTop = element.scrollTop
    targetScrollLeft = element.scrollLeft
    currentScrollLeft = element.scrollLeft

    if (!enabled) return

    // ✅ fix: sincroniza targets quando o usuário usa a scrollbar
    const handleScroll = () => {
      if (!isWheelScrolling) {
        targetScrollTop = element.scrollTop
        currentScrollTop = element.scrollTop
        targetScrollLeft = element.scrollLeft
        currentScrollLeft = element.scrollLeft
      }
    }

    const handleWheel = (e: WheelEvent) => {
      if (lock?.()) return
      const isHorizontalScroll = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)

      e.preventDefault()
      isWheelScrolling = true

      if (isHorizontalScroll && horizontal) {
        const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY
        targetScrollLeft += delta * speed
        targetScrollLeft = Math.max(
          0,
          Math.min(targetScrollLeft, element.scrollWidth - element.clientWidth)
        )
      } else {
        targetScrollTop += e.deltaY * speed
        targetScrollTop = Math.max(
          0,
          Math.min(targetScrollTop, element.scrollHeight - element.clientHeight)
        )
      }

      ensureAnimating(element)
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    element.addEventListener('scroll', handleScroll, { passive: true })

    onCleanup(() => {
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('scroll', handleScroll)
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    })
  })

  return { scrollBy }
}

export default useSmoothScroll
