import { useState, useRef, useEffect } from 'react'

// Simple session-scoped cache to avoid redundant Scryfall requests
const imageCache = new Map()

/**
 * CardTooltip — shows Scryfall card image on hover
 * 
 * Wraps a card name string. On hover (delayed 300ms), fetches and displays
 * the Scryfall card image in a floating tooltip positioned above or below
 * the text depending on viewport position.
 */
export default function CardTooltip({ cardName, children }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState('top')
  
  const hoverTimeoutRef = useRef(null)
  const hideTimeoutRef = useRef(null)
  const elementRef = useRef(null)

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  // Fetch Scryfall image (with cache)
  const fetchImage = async () => {
    if (!cardName) return

    // Check cache first
    if (imageCache.has(cardName)) {
      const cached = imageCache.get(cardName)
      if (cached === 'error') {
        setImageError(true)
      } else {
        setImageUrl(cached)
      }
      return
    }

    setLoading(true)
    try {
      // Use 'normal' size (488×680px) instead of default thumbnail (146×204px)
      const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`
      
      // Test if image loads successfully
      const img = new Image()
      img.onload = () => {
        imageCache.set(cardName, url)
        setImageUrl(url)
        setLoading(false)
      }
      img.onerror = () => {
        imageCache.set(cardName, 'error')
        setImageError(true)
        setLoading(false)
      }
      img.src = url
    } catch (error) {
      console.error('Scryfall image fetch error:', error)
      imageCache.set(cardName, 'error')
      setImageError(true)
      setLoading(false)
    }
  }

  const handleMouseEnter = () => {
    // Determine position and calculate fixed coordinates
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      
      // If element is in bottom half of viewport, show tooltip above
      setPosition(rect.bottom > viewportHeight / 2 ? 'bottom' : 'top')
    }

    // Delay tooltip appearance by 300ms to avoid flicker on accidental hovers
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
      if (!imageUrl && !imageError) {
        fetchImage()
      }
    }, 300)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Small delay before hiding to allow moving to tooltip
    hideTimeoutRef.current = setTimeout(() => setShowTooltip(false), 150)
  }

  const handleTooltipMouseEnter = () => {
    // Cancel hide timeout when hovering over tooltip
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
  }

  const handleTooltipMouseLeave = () => {
    setShowTooltip(false)
  }

  // Don't show tooltip if image failed to load
  if (imageError) {
    return <span>{children || cardName}</span>
  }

  // Calculate position near the trigger element
  const getTooltipPosition = () => {
    if (!elementRef.current || !showTooltip) return { left: -9999, top: -9999 }
    
    const rect = elementRef.current.getBoundingClientRect()
    const tooltipWidth = 244
    const tooltipHeight = 340
    const gap = 4 // Smaller gap to keep tooltip close
    
    // Center horizontally relative to trigger
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2)
    
    // Position above or below based on viewport position
    let top = position === 'top' 
      ? rect.top - tooltipHeight - gap
      : rect.bottom + gap
    
    // Keep tooltip within viewport horizontally
    const margin = 16
    const maxLeft = window.innerWidth - tooltipWidth - margin
    left = Math.max(margin, Math.min(left, maxLeft))
    
    return { left, top }
  }

  const tooltipPos = getTooltipPosition()

  return (
    <>
      <span 
        ref={elementRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative inline-block cursor-help"
      >
        {children || cardName}
      </span>
      
      {showTooltip && (
        <div 
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          className="fixed pointer-events-auto"
          style={{
            left: `${tooltipPos.left}px`,
            top: `${tooltipPos.top}px`,
            zIndex: 99999,
            width: '244px'
          }}
        >
          {loading || !imageUrl ? (
            // Loading shimmer placeholder
            <div 
              className="skeleton rounded-lg"
              style={{ width: '244px', height: '340px' }}
            />
          ) : (
            // Clickable Scryfall card image
            <a
              href={`https://scryfall.com/search?q=!"${encodeURIComponent(cardName)}"`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageUrl}
                alt={cardName}
                className="rounded-lg shadow-2xl border border-white/10 hover:border-amber-400/50 transition-colors"
                style={{ width: '244px', height: '340px' }}
              />
            </a>
          )}
        </div>
      )}
    </>
  )
}
