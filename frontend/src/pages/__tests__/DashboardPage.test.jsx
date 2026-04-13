import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { api } from '../../lib/api'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock PageTransition to a passthrough
vi.mock('../../components/PageTransition', () => ({
  default: ({ children }) => children,
}))

// Mock CardTooltip to a simple wrapper
vi.mock('../../components/CardTooltip', () => ({
  default: ({ children }) => <span>{children}</span>,
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const { initial, animate, transition, exit, ...rest } = props
      return <div {...rest}>{children}</div>
    },
    tr: ({ children, ...props }) => {
      const { initial, animate, transition, exit, ...rest } = props
      return <tr {...rest}>{children}</tr>
    },
  },
  AnimatePresence: ({ children }) => children,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Eye: (props) => <span data-testid="icon-eye" {...props} />,
  LoaderCircle: (props) => <span data-testid="icon-loader" {...props} />,
  ClipboardCheck: (props) => <span data-testid="icon-clipboard" {...props} />,
  Swords: (props) => <span data-testid="icon-swords" {...props} />,
}))

// Mock the api module — we control every return value
vi.mock('../../lib/api', () => ({
  api: {
    getDeckLibrary: vi.fn(),
    getCollectionSummary: vi.fn(),
    addToLibrary: vi.fn(),
    analyzeDeck: vi.fn(),
  },
}))

// Mock AuthContext — provide a session with an access_token so the useEffect fires
let mockSession = { access_token: 'test-token-1', user: { id: 'u1' } }

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: mockSession,
    profile: { display_name: 'TestUser' },
  }),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Import AFTER mocks
import DashboardPage from '../DashboardPage'

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = { access_token: 'test-token-1', user: { id: 'u1' } }
    // Default: summary returns a count
    api.getCollectionSummary.mockResolvedValue({ count: 42, last_updated: '2026-01-01' })
  })

  it('renders deck list on successful load', async () => {
    api.getDeckLibrary.mockResolvedValue({
      decks: [
        { moxfield_id: 'deck-1', deck_name: 'Turtle Time', format: 'commander', analyzed: true, power_level: 7, colors: ['U', 'G'], commander_name: 'Aesi' },
        { moxfield_id: 'deck-2', deck_name: 'Burn Baby', format: 'commander', analyzed: false, power_level: null, colors: ['R'], commander_name: 'Torbran' },
      ],
    })

    renderDashboard()

    await waitFor(() => {
      // Deck names appear in both mobile card and desktop table views
      expect(screen.getAllByText('Turtle Time').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Burn Baby').length).toBeGreaterThanOrEqual(1)
    })

    // Stats should show
    expect(screen.getByText('2 decks')).toBeInTheDocument()
  })

  it('shows empty state when no decks', async () => {
    api.getDeckLibrary.mockResolvedValue({ decks: [] })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('No decks in your library yet')).toBeInTheDocument()
    })
  })

  it('shows error banner on API failure', async () => {
    api.getDeckLibrary.mockRejectedValue(new Error('Network error'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Failed to load decks')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('retry button re-fetches decks', async () => {
    // First call fails
    api.getDeckLibrary.mockRejectedValueOnce(new Error('Temporary failure'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    // Second call succeeds
    api.getDeckLibrary.mockResolvedValueOnce({
      decks: [{ moxfield_id: 'deck-1', deck_name: 'Recovered Deck', format: 'commander', analyzed: false, power_level: null, colors: ['W'], commander_name: 'Heliod' }],
    })

    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getAllByText('Recovered Deck').length).toBeGreaterThanOrEqual(1)
    })

    // getDeckLibrary should have been called twice (initial + retry)
    expect(api.getDeckLibrary).toHaveBeenCalledTimes(2)
  })

  it('ignores stale response when generation counter is superseded', async () => {
    // The first call is slow and returns an error
    let resolveFirst
    const firstPromise = new Promise((resolve, reject) => {
      resolveFirst = reject
    })
    // The second call is fast and returns valid data
    const secondResult = {
      decks: [{ moxfield_id: 'deck-fresh', deck_name: 'Fresh Deck', format: 'commander', analyzed: false, power_level: null, colors: ['B'], commander_name: 'Sheoldred' }],
    }

    api.getDeckLibrary
      .mockReturnValueOnce(firstPromise)   // gen=1 (slow, will error)
      .mockResolvedValueOnce(secondResult) // gen=2 (fast, succeeds)

    api.getCollectionSummary
      .mockResolvedValue({ count: 10, last_updated: null })

    const { rerender } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    )

    // The first request is in-flight. Now simulate a token refresh by
    // changing the session, which causes the useEffect to re-fire.
    await act(async () => {
      mockSession = { access_token: 'test-token-2', user: { id: 'u1' } }
      rerender(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      )
    })

    // The second (gen=2) response resolves immediately
    await waitFor(() => {
      expect(screen.getAllByText('Fresh Deck').length).toBeGreaterThanOrEqual(1)
    })

    // Now resolve the first (gen=1) promise with an error — it should be ignored
    await act(async () => {
      resolveFirst(new Error('Stale 401 error'))
    })

    // Fresh Deck should still be showing — the stale error must NOT overwrite it
    expect(screen.getAllByText('Fresh Deck').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Failed to load decks')).not.toBeInTheDocument()
  })

  it('shows collection count from summary', async () => {
    api.getDeckLibrary.mockResolvedValue({ decks: [] })
    api.getCollectionSummary.mockResolvedValue({ count: 1234, last_updated: '2026-01-01' })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument()
    })
  })
})
