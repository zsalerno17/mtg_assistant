import { Link } from 'react-router-dom'
import PageTransition from '../components/PageTransition'

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-8xl font-bold text-[var(--color-muted)] mb-4 select-none">404</p>
        <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-2">Page not found</h1>
        <p className="text-[var(--color-muted)] mb-8 max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/"
          className="px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </Link>
      </div>
    </PageTransition>
  )
}
