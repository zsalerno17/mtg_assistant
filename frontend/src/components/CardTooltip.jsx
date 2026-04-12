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
  const elementRef = useRef(null)

  // Clear hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
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
    // Determine if tooltip should appear above or below
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
    setShowTooltip(false)
  }

  // Don't show tooltip if image failed to load
  if (imageError) {
    return <span>{children || cardName}</span>
  }

  return (
    <span 
      ref={elementRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block cursor-help"
    >
      {children || cardName}
      
      {showTooltip && (
        <div 
          className={`absolute left-1/2 -translate-x-1/2 z-[9999] ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{ width: '244px' }}
        >
          {loading || !imageUrl ? (
            // Loading shimmer placeholder
            <div 
              className="skeleton rounded-lg pointer-events-none"
              style={{ width: '244px', height: '340px' }}
            />
          ) : (
            // Clickable Scryfall card image
            <a
              href={`https://scryfall.com/search?q=!${encodeURIComponent(cardName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block pointer-events-auto"
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
    </span>
  )
}
