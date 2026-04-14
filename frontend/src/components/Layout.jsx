import TopNavbar from './TopNavbar'

/** Wraps page content with horizontal top navigation. */
export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      <TopNavbar />
      <main className="flex-1 overflow-auto pt-4 md:pt-6 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
