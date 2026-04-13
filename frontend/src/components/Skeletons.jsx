export function LeagueCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-40 skeleton rounded" />
        <div className="h-5 w-16 skeleton rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-48 skeleton rounded" />
        <div className="h-4 w-24 skeleton rounded" />
      </div>
    </div>
  )
}

export function StandingsRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-4"><div className="h-8 w-8 skeleton rounded-full" /></td>
      <td className="px-6 py-4"><div className="h-5 w-32 skeleton rounded" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 w-8 skeleton rounded mx-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 w-6 skeleton rounded mx-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 w-6 skeleton rounded mx-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 w-6 skeleton rounded mx-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 w-6 skeleton rounded mx-auto" /></td>
      <td className="px-6 py-4 text-center"><div className="h-5 w-6 skeleton rounded mx-auto" /></td>
    </tr>
  )
}

export function MemberCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-36 skeleton rounded" />
          <div className="h-4 w-24 skeleton rounded" />
          <div className="h-4 w-48 skeleton rounded" />
        </div>
      </div>
    </div>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-24 skeleton rounded" />
          <div className="h-4 w-36 skeleton rounded" />
        </div>
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 skeleton rounded-full" />
              <div className="h-4 w-28 skeleton rounded" />
            </div>
            <div className="h-4 w-16 skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
