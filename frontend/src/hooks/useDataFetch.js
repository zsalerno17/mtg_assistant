import { useState, useEffect } from 'react'

/**
 * Fetches data on mount (or when deps change) and returns loading/error/data state.
 * @param {() => Promise<any>} fetcher - A function that returns a Promise.
 * @param {any[]} deps - Dependency array (same semantics as useEffect deps).
 * @returns {{ data: any, loading: boolean, error: string|null }}
 */
export function useDataFetch(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetcher()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
