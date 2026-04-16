/**
 * Centered empty-state block with optional icon, title, and description.
 *
 * @param {React.ComponentType} [icon] - A component that accepts a `className` prop (e.g. a lucide icon wrapper).
 * @param {React.ReactNode} [iconNode] - Pre-rendered icon node; used when the icon doesn't accept className.
 * @param {string} [iconClassName] - Extra classes applied to the icon (e.g. color).
 * @param {string} [title]
 * @param {React.ReactNode} [description] - Accepts JSX for links inside the description.
 */
export default function EmptyState({ icon: Icon, iconNode, iconClassName = '', title, description }) {
  return (
    <div className="flex flex-col items-center py-16 max-w-xs mx-auto gap-4">
      {iconNode ?? (Icon && <Icon className={`w-8 h-8 ${iconClassName}`} />)}
      {title && <p className="text-[var(--color-text)] font-semibold text-sm">{title}</p>}
      {description && <p className="text-[var(--color-muted)] text-xs text-center">{description}</p>}
    </div>
  )
}
