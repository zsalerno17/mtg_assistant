import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '../../lib/api'

// Mock PageTransition first
vi.mock('../../components/PageTransition', () => ({
  default: ({ children }) => children,
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
}))

// Mock the api module
vi.mock('../../lib/api', () => ({
  api: {
    getLeagues: vi.fn(),
    createLeague: vi.fn(),
    getLeague: vi.fn(),
    getLeagueStandings: vi.fn(),
    getLeagueGames: vi.fn(),
    getLeagueMembers: vi.fn(),
    getDeckLibrary: vi.fn(),
    logGame: vi.fn(),
  },
}))

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test-user-id' } },
    profile: { display_name: 'TestUser' },
  }),
}))

// Import pages after mocks
import LeaguesPage from '../LeaguesPage'
import LeaguePage from '../LeaguePage'
import LogGamePage from '../LogGamePage'

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  )
}

// ============================================================================
// LeaguesPage Tests
// ============================================================================

describe('LeaguesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state initially', () => {
    api.getLeagues.mockReturnValue(new Promise(() => {})) // never resolves
    const { container } = renderWithRouter(<LeaguesPage />)
    // Skeleton loaders render with animate-pulse class
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty state when no leagues', async () => {
    api.getLeagues.mockResolvedValue({ leagues: [] })
    renderWithRouter(<LeaguesPage />)
    await waitFor(() => {
      expect(screen.getByText('Form your first pod.')).toBeInTheDocument()
    })
  })

  it('renders league cards', async () => {
    api.getLeagues.mockResolvedValue({
      leagues: [
        {
          id: 'league-1',
          name: 'Commander Gauntlet',
          status: 'active',
          season_start: '2026-01-01',
          season_end: '2026-06-01',
          league_members: [{ id: 'm1' }, { id: 'm2' }],
        },
      ],
    })
    renderWithRouter(<LeaguesPage />)
    await waitFor(() => {
      expect(screen.getByText('Commander Gauntlet')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('👥 2 members')).toBeInTheDocument()
    })
  })

  it('toggles create league form', async () => {
    api.getLeagues.mockResolvedValue({ leagues: [] })
    renderWithRouter(<LeaguesPage />)
    await waitFor(() => {
      expect(screen.getByText('Form your first pod.')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Create Campaign'))
    expect(screen.getByText('Create New Campaign')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows error on API failure', async () => {
    api.getLeagues.mockRejectedValue(new Error('Network error'))
    renderWithRouter(<LeaguesPage />)
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// LeaguePage Tests
// ============================================================================

describe('LeaguePage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Commander Gauntlet',
    status: 'active',
    season_start: '2026-01-01',
    season_end: '2026-06-01',
    league_members: [
      {
        id: 'member-1',
        superstar_name: 'The Destroyer',
        user_id: 'user-1',
        catchphrase: 'Feel the burn!',
        user_profiles: { display_name: 'Player1', avatar_url: null },
      },
    ],
  }

  const mockStandings = [
    {
      member_id: 'member-1',
      superstar_name: 'The Destroyer',
      total_points: 12,
      games_played: 5,
      wins: 3,
      first_bloods: 0,
      last_stands: 0,
      entrance_bonuses: 2,
    },
  ]

  const mockGames = [
    {
      id: 'game-1',
      game_number: 1,
      played_at: '2026-01-15T20:00:00Z',
      league_game_results: [
        {
          id: 'result-1',
          placement: 1,
          earned_win: true,
          earned_first_blood: false,
          earned_last_stand: false,
          earned_entrance_bonus: true,
          total_points: 4,
          league_members: { superstar_name: 'The Destroyer' },
          user_decks: { deck_name: 'Turtle Time' },
        },
      ],
      spicy_play_description: null,
      notes: null,
      screenshot_url: null,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getLeague.mockResolvedValue({ league: mockLeague })
    api.getLeagueStandings.mockResolvedValue({ standings: mockStandings })
    api.getLeagueGames.mockResolvedValue({ games: mockGames, has_more: false })
  })

  function renderLeaguePage() {
    return render(
      <MemoryRouter initialEntries={['/leagues/league-1']}>
        <Routes>
          <Route path="/leagues/:leagueId" element={<LeaguePage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('shows loading then league name', async () => {
    const { container } = renderLeaguePage()
    // Skeleton loaders render with animate-pulse class
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Commander Gauntlet').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders standings tab by default', async () => {
    renderLeaguePage()
    await waitFor(() => {
      expect(screen.getAllByText('The Destroyer').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('12')).toBeInTheDocument() // total points
    })
  })

  it('switches to games tab', async () => {
    renderLeaguePage()
    await waitFor(() => {
      expect(screen.getAllByText('Commander Gauntlet').length).toBeGreaterThanOrEqual(1)
    })
    fireEvent.click(screen.getByText('games'))
    await waitFor(() => {
      expect(screen.getByText('Game 1: The Destroyer Takes the Crown')).toBeInTheDocument()
    })
  })

  it('switches to members tab', async () => {
    renderLeaguePage()
    await waitFor(() => {
      expect(screen.getAllByText('Commander Gauntlet').length).toBeGreaterThanOrEqual(1)
    })
    fireEvent.click(screen.getByText('members'))
    await waitFor(() => {
      expect(screen.getByText('"Feel the burn!"')).toBeInTheDocument()
    })
  })

  it('shows error on API failure', async () => {
    api.getLeague.mockRejectedValue(new Error('Server error'))
    renderLeaguePage()
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// LogGamePage Tests
// ============================================================================

describe('LogGamePage', () => {
  const mockLeague = {
    id: 'league-1',
    name: 'Commander Gauntlet',
  }

  const mockMembers = [
    {
      id: 'member-1',
      user_id: 'test-user-id',
      superstar_name: 'The Destroyer',
      user_profiles: { display_name: 'TestUser' },
    },
    {
      id: 'member-2',
      user_id: 'other-user-id',
      superstar_name: 'The Creator',
      user_profiles: { display_name: 'OtherUser' },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    api.getLeague.mockResolvedValue({ league: mockLeague })
    api.getLeagueMembers.mockResolvedValue({ members: mockMembers })
    api.getDeckLibrary.mockResolvedValue({
      decks: [{ id: 'deck-1', deck_name: 'Turtle Time' }],
    })
    api.getLeagueGames.mockResolvedValue({ games: [] })
  })

  function renderLogGamePage() {
    return render(
      <MemoryRouter initialEntries={['/leagues/league-1/log-game']}>
        <Routes>
          <Route path="/leagues/:leagueId/log-game" element={<LogGamePage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('loads and renders member names', async () => {
    renderLogGamePage()
    await waitFor(() => {
      expect(screen.getAllByText('The Destroyer').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('The Creator').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows deck dropdown only for current user', async () => {
    renderLogGamePage()
    await waitFor(() => {
      expect(screen.getByText('Turtle Time')).toBeInTheDocument()
      expect(screen.getByText('Only the deck owner can select')).toBeInTheDocument()
    })
  })

  it('shows correct points description', async () => {
    renderLogGamePage()
    await waitFor(() => {
      expect(
        screen.getByText(/1st = 3pts, 2nd = 2pts, 3rd = 1pt/)
      ).toBeInTheDocument()
    })
  })

  it('validates unique placements on submit', async () => {
    renderLogGamePage()
    await waitFor(() => {
      expect(screen.getByText('Log Game Session')).toBeInTheDocument()
    })

    // Try to submit without any placements
    fireEvent.click(screen.getByText('Log Game'))
    await waitFor(() => {
      expect(
        screen.getByText('Please assign placements to at least one player')
      ).toBeInTheDocument()
    })
  })
})
