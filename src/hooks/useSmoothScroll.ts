import { onMount, onCleanup } from 'solid-js'

interface SmoothScrollOptions {
  speed?: number
  smoothness?: number
  enabled?: boolean
  horizontal?: boolean
  lock?: () => boolean
}

export function useSmoothScroll(
  getElement: () => HTMLElement | undefined,
  options: SmoothScrollOptions = {}
) {
  const { speed = 1, smoothness = 0.1, enabled = true, horizontal = true, lock } = options

  onMount(() => {
    if (!enabled) return

    const element = getElement()
    if (!element) return

    let targetScrollTop = element.scrollTop
    let currentScrollTop = element.scrollTop
    let targetScrollLeft = element.scrollLeft
    let currentScrollLeft = element.scrollLeft
    let animationFrameId: number | null = null
    let isAnimating = false
    let isWheelScrolling = false

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

      if (!isAnimating) {
        isAnimating = true
        smoothScroll()
      }
    }

    const smoothScroll = () => {
      currentScrollTop += (targetScrollTop - currentScrollTop) * smoothness
      element.scrollTop = currentScrollTop

      currentScrollLeft += (targetScrollLeft - currentScrollLeft) * smoothness
      element.scrollLeft = currentScrollLeft

      const hasVerticalDiff = Math.abs(targetScrollTop - currentScrollTop) > 0.5
      const hasHorizontalDiff = Math.abs(targetScrollLeft - currentScrollLeft) > 0.5

      if (hasVerticalDiff || hasHorizontalDiff) {
        animationFrameId = requestAnimationFrame(smoothScroll)
      } else {
        isAnimating = false
        isWheelScrolling = false // ✅ libera o handleScroll novamente
        currentScrollTop = targetScrollTop
        currentScrollLeft = targetScrollLeft
      }
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    element.addEventListener('scroll', handleScroll, { passive: true })

    onCleanup(() => {
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('scroll', handleScroll)
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    })
  })
}

export default useSmoothScroll
