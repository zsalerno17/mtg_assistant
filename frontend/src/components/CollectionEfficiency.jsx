import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, TrendingUp, Package, DollarSign, AlertCircle, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import CardTooltip from './CardTooltip'

const MANA_SYMBOL_IDS = new Set(['W', 'U', 'B', 'R', 'G', 'C'])

/**
 * CollectionEfficiency Component - Display utilization, duplicates, and high-value unused cards
 */
export default function CollectionEfficiency({ efficiency, loading }) {
  const [expandedSection, setExpandedSection] = useState('overview')
  const [unusedSort, setUnusedSort] = useState({ key: 'total_value', direction: 'desc' })
  const [duplicatesSort, setDuplicatesSort] = useState({ key: 'trade_value', direction: 'desc' })
  const [unusedFilter, setUnusedFilter] = useState('')
  const [duplicatesFilter, setDuplicatesFilter] = useState('')

  // Sorting function
  const sortData = (data, sortConfig) => {
    if (!data) return []
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      const direction = sortConfig.direction === 'asc' ? 1 : -1
      
      if (typeof aVal === 'string') {
        return direction * aVal.localeCompare(bVal)
      }
      return direction * (aVal - bVal)
    })
  }

  // Filter and sort unused cards
  const filteredUnused = useMemo(() => {
    if (!efficiency?.high_value_unused) return []
    let filtered = efficiency.high_value_unused
    if (unusedFilter) {
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(unusedFilter.toLowerCase())
      )
    }
    return sortData(filtered, unusedSort)
  }, [efficiency?.high_value_unused, unusedFilter, unusedSort])

  // Filter and sort duplicates
  const filteredDuplicates = useMemo(() => {
    if (!efficiency?.duplicates) return []
    let filtered = efficiency.duplicates
    if (duplicatesFilter) {
      filtered = filtered.filter(card => 
        card.name.toLowerCase().includes(duplicatesFilter.toLowerCase())
      )
    }
    return sortData(filtered, duplicatesSort)
  }, [efficiency?.duplicates, duplicatesFilter, duplicatesSort])

  // Sort header component
  const SortHeader = ({ label, sortKey, currentSort, onSort }) => {
    const isActive = currentSort.key === sortKey
    const Icon = isActive ? (currentSort.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
    
    return (
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-[var(--color-text)] transition-colors"
      >
        {label}
        <Icon className="w-3 h-3" />
      </button>
    )
  }

  const handleUnusedSort = (key) => {
    setUnusedSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  const handleDuplicatesSort = (key) => {
    setDuplicatesSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
        <p className="mt-4 text-sm text-[var(--color-muted)]">Analyzing efficiency...</p>
      </div>
    )
  }

  if (!efficiency) {
    return (
      <div className="text-center py-12 text-[var(--color-muted)]">
        <Package className="mx-auto mb-4 w-12 h-12 opacity-50" />
        <p className="text-sm">No collection data available</p>
        <p className="text-xs mt-2">Upload a collection to see efficiency metrics</p>
      </div>
    )
  }

  // Provide default values to prevent undefined errors
  const utilizationPercent = Math.round((efficiency.utilization_rate || 0) * 100)
  const totalValue = efficiency.total_value || 0
  const valueInUse = efficiency.value_in_use || 0
  const valueUnused = efficiency.value_unused || 0
  const valueUtilizationPercent = totalValue > 0 
    ? Math.round((valueInUse / totalValue) * 100) 
    : 0

  // Helper component to render color identity mana symbols
  const ColorPips = ({ colors }) => {
    if (!colors || colors.length === 0) {
      return <span className="text-xs text-[var(--color-muted)]">—</span>
    }

    return (
      <div className="flex gap-1 items-center">
        {colors.map((c, idx) => {
          const id = c.toUpperCase()
          if (!MANA_SYMBOL_IDS.has(id)) return null
          return (
            <i
              key={idx}
              className={`ms ms-${id.toLowerCase()} ms-cost ms-shadow`}
              style={{ fontSize: '0.9rem' }}
              aria-label={id}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Utilization Rate */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-muted)]">Card Utilization</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">
              {utilizationPercent}%
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              {efficiency.cards_in_use || 0} of {efficiency.total_cards || 0} cards in decks
            </div>
            <div className="mt-3 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </div>

          {/* Unique Cards */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-muted)]">Unique Cards</span>
              <Package className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">
              {efficiency.unique_cards || 0}
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              {efficiency.total_cards || 0} total copies
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-muted)]">Total Value</span>
              <DollarSign className="w-4 h-4 text-[var(--color-accent)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">
              ${totalValue.toFixed(0)}
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              ${valueInUse.toFixed(0)} in decks
            </div>
            <div className="mt-3 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${valueUtilizationPercent}%` }}
              />
            </div>
          </div>

          {/* Unused Value */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-muted)]">Unused Value</span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">
              ${valueUnused.toFixed(0)}
            </div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              {efficiency.cards_unused || 0} cards not in decks
            </div>
          </div>
        </div>
      </motion.div>

      {/* High-Value Unused Cards */}
      {efficiency.high_value_unused && efficiency.high_value_unused.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setExpandedSection(expandedSection === 'unused' ? '' : 'unused')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div className="text-left">
                <h3 className="font-semibold text-[var(--color-text)]">
                  High-Value Unused Cards
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  ${efficiency.high_value_unused.reduce((sum, c) => sum + (c.total_value || 0), 0).toFixed(0)} in expensive cards not in decks
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${
                expandedSection === 'unused' ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {expandedSection === 'unused' && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-[var(--color-border)] space-y-3">
                  {/* Filter Input */}
                  <input
                    type="text"
                    placeholder="Filter by card name..."
                    value={unusedFilter}
                    onChange={(e) => setUnusedFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                  
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                          <th className="text-left px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <SortHeader label="Card" sortKey="name" currentSort={unusedSort} onSort={handleUnusedSort} />
                          </th>
                          <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-center">
                              <SortHeader label="Qty" sortKey="quantity" currentSort={unusedSort} onSort={handleUnusedSort} />
                            </div>
                          </th>
                          <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            Colors
                          </th>
                          <th className="text-right px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-end">
                              <SortHeader label="Price Each" sortKey="price_per_card" currentSort={unusedSort} onSort={handleUnusedSort} />
                            </div>
                          </th>
                          <th className="text-right px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-end">
                              <SortHeader label="Total Value" sortKey="total_value" currentSort={unusedSort} onSort={handleUnusedSort} />
                            </div>
                          </th>
                          <th className="text-left px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUnused.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-[var(--color-muted)] text-sm">
                              {unusedFilter ? 'No cards match your filter' : 'No high-value unused cards'}
                            </td>
                          </tr>
                        ) : (
                          filteredUnused.map((card, idx) => (
                            <tr key={card.name} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                                <CardTooltip cardName={card.name}>
                                  <span className="cursor-pointer">{card.name}</span>
                                </CardTooltip>
                              </td>
                              <td className="px-4 py-3 text-center text-[var(--color-muted)]">
                                {card.quantity}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center">
                                  <ColorPips colors={card.color_identity} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--color-muted)]">
                                ${(card.price_per_card || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-[var(--color-accent)]">
                                ${(card.total_value || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-xs text-[var(--color-muted)]">
                                {card.reason}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Duplicates Analysis */}
      {efficiency.duplicates && efficiency.duplicates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setExpandedSection(expandedSection === 'duplicates' ? '' : 'duplicates')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-bg)]/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-[var(--color-accent)]" />
              <div className="text-left">
                <h3 className="font-semibold text-[var(--color-text)]">
                  Duplicate Analysis
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  {efficiency.duplicates.length} cards owned 2+ times
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${
                expandedSection === 'duplicates' ? 'rotate-180' : ''
              }`}
            />
          </button>

          <AnimatePresence>
            {expandedSection === 'duplicates' && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 border-t border-[var(--color-border)] space-y-3">
                  {/* Filter Input */}
                  <input
                    type="text"
                    placeholder="Filter by card name..."
                    value={duplicatesFilter}
                    onChange={(e) => setDuplicatesFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                  
                  <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                          <th className="text-left px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <SortHeader label="Card" sortKey="name" currentSort={duplicatesSort} onSort={handleDuplicatesSort} />
                          </th>
                          <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-center">
                              <SortHeader label="Owned" sortKey="owned" currentSort={duplicatesSort} onSort={handleDuplicatesSort} />
                            </div>
                          </th>
                          <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-center">
                              <SortHeader label="In Use" sortKey="in_use" currentSort={duplicatesSort} onSort={handleDuplicatesSort} />
                            </div>
                          </th>
                          <th className="text-center px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-center">
                              <SortHeader label="Available" sortKey="available" currentSort={duplicatesSort} onSort={handleDuplicatesSort} />
                            </div>
                          </th>
                          <th className="text-right px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-end">
                              <SortHeader label="Price Each" sortKey="price_per_card" currentSort={duplicatesSort} onSort={handleDuplicatesSort} />
                            </div>
                          </th>
                          <th className="text-right px-4 py-2.5 text-[var(--color-muted)] text-xs uppercase tracking-wider font-semibold">
                            <div className="flex items-center justify-end">
                              <SortHeader label="Trade Value" sortKey="trade_value" currentSort={duplicatesSort} onSort={handleDuplicatesSort} />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDuplicates.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-[var(--color-muted)] text-sm">
                              {duplicatesFilter ? 'No cards match your filter' : 'No duplicate cards'}
                            </td>
                          </tr>
                        ) : (
                          filteredDuplicates.map((card, idx) => (
                            <tr key={card.name} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                                <CardTooltip cardName={card.name}>
                                  <span className="cursor-pointer">{card.name}</span>
                                </CardTooltip>
                              </td>
                              <td className="px-4 py-3 text-center text-[var(--color-muted)]">
                                {card.owned}
                              </td>
                              <td className="px-4 py-3 text-center text-[var(--color-muted)]">
                                {card.in_use}
                              </td>
                              <td className="px-4 py-3 text-center text-[var(--color-muted)]">
                                {card.available}
                              </td>
                              <td className="px-4 py-3 text-right text-[var(--color-muted)]">
                                ${(card.price_per_card || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-[var(--color-accent)]">
                                ${(card.trade_value || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty state if no efficiency data */}
      {(!efficiency.high_value_unused || efficiency.high_value_unused.length === 0) &&
       (!efficiency.duplicates || efficiency.duplicates.length === 0) && (
        <div className="text-center py-12 text-[var(--color-muted)]">
          <TrendingUp className="mx-auto mb-4 w-12 h-12 opacity-50" />
          <p className="text-sm">Your collection is efficiently utilized!</p>
          <p className="text-xs mt-2">No significant duplicates or high-value unused cards found.</p>
        </div>
      )}
    </div>
  )
}
