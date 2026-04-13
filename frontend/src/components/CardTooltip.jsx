import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Simple session-scoped cache to avoid redundant Scryfall requests
const imageCache = new Map()

/**
 * CardTooltip — shows Scryfall card image on hover
 *
 * Props:
 *   cardName  — card name used for Scryfall lookup (required unless imageUrl given)
 *   imageUrl  — optional pre-resolved image URL; skips the Scryfall fetch entirely
 *               (useful when the caller already has the CDN URL)
 *
 * On hover (delayed 150ms), fetches and displays the card image in a floating
 * tooltip positioned near the cursor, rendered via React Portal to escape
 * overflow/stacking contexts.
 */
export default function CardTooltip({ cardName, imageUrl: imageUrlProp, children }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [imageUrl, setImageUrl] = useState(imageUrlProp || null)
  const [imageError, setImageError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  
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

  // Fetch Scryfall image (with cache). Skipped when a direct imageUrl was supplied.
  const fetchImage = async () => {
    if (imageUrlProp) return  // already have a URL, nothing to fetch
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

  const handleMouseEnter = (e) => {
    // No card name and no fallback imageUrl means nothing to show
    if (!cardName && !imageUrlProp) return

    // Track cursor position for tooltip placement
    setCursorPos({ x: e.clientX, y: e.clientY })

    // Delay tooltip appearance by 150ms to avoid flicker on accidental hovers
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
      if (!imageUrl && !imageError) {
        fetchImage()
      }
    }, 150)
  }

  const handleMouseMove = (e) => {
    // Update cursor position while hovering (for dynamic positioning)
    if (showTooltip || hoverTimeoutRef.current) {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }
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

  // Calculate position near cursor, avoiding viewport edges
  const getTooltipPosition = () => {
    if (!showTooltip) return { left: -9999, top: -9999 }
    
    const tooltipWidth = 244
    const tooltipHeight = 340
    const offset = 16 // Offset from cursor (prevents tooltip from blocking cursor)
    const margin = 16 // Margin from viewport edges
    
    // Default: position below and to the right of cursor
    let left = cursorPos.x + offset
    let top = cursorPos.y + offset
    
    // If tooltip would go off right edge, position to left of cursor
    if (left + tooltipWidth + margin > window.innerWidth) {
      left = cursorPos.x - tooltipWidth - offset
    }
    
    // If tooltip would go off bottom edge, position above cursor
    if (top + tooltipHeight + margin > window.innerHeight) {
      top = cursorPos.y - tooltipHeight - offset
    }
    
    // Ensure tooltip stays within viewport bounds
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin))
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin))
    
    return { left, top }
  }

  const tooltipPos = getTooltipPosition()

  // Render tooltip via Portal to escape overflow containers and stacking contexts
  const tooltipElement = showTooltip && createPortal(
    <div 
      onMouseEnter={handleTooltipMouseEnter}
      onMouseLeave={handleTooltipMouseLeave}
      className="fixed pointer-events-auto"
      style={{
        left: `${tooltipPos.left}px`,
        top: `${tooltipPos.top}px`,
        zIndex: 999999,
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
    </div>,
    document.body // Portal to body — escapes ALL overflow/stacking contexts
  )

  return (
    <>
      <span 
        ref={elementRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative inline-block cursor-help"
      >
        {children || cardName}
      </span>
      
      {tooltipElement}
    </>
  )
}
