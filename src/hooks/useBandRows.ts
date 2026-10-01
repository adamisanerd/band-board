import { useCallback, useEffect, useState } from 'react'
import { supabase, type Row } from '../lib/supabase'
import type { Database } from '../lib/database.types'

/** Every table except `bands` has a band_id column. */
export type BandTable = Exclude<keyof Database['public']['Tables'], 'bands'>

export interface BandRows<T extends BandTable> {
  rows: Row<T>[]
  loading: boolean
  error: string | null
  /** Fetch again now, e.g. right after a write so the screen doesn't wait for realtime. */
  reload: () => Promise<void>
}

/**
 * All rows of `table` for one band, kept live: whenever anyone in the band changes the
 * table, the rows are fetched again. Simple and plenty fast for band-sized data.
 */
export function useBandRows<T extends BandTable>(table: T, bandId: string | undefined): BandRows<T> {
  const [rows, setRows] = useState<Row<T>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // supabase-js can't narrow the column types when the table name is a generic,
  // so the result is cast to the table's Row type once, here.
  const fetchRows = useCallback(
    () =>
      supabase
        .from(table as BandTable)
        .select('*')
        .eq('band_id', bandId ?? '')
        .then(({ data, error }) => ({ data: data as unknown as Row<T>[] | null, error })),
    [table, bandId],
  )

  const apply = useCallback(({ data, error }: { data: Row<T>[] | null; error: { message: string } | null }) => {
    if (error) setError(error.message)
    else {
      setRows(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  const reload = useCallback(async () => apply(await fetchRows()), [fetchRows, apply])

  useEffect(() => {
    if (!bandId) return
    void fetchRows().then(apply)

    // Inserts and updates are filtered to this band. Postgres can't filter delete events
    // by column, so deletes come through unfiltered; we just refetch, which RLS keeps scoped.
    const refetch = () => void fetchRows().then(apply)
    const channel = supabase
      .channel(`${table}:${bandId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter: `band_id=eq.${bandId}` }, refetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: `band_id=eq.${bandId}` }, refetch)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, refetch)
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [table, bandId, fetchRows, apply])

  return { rows, loading, error, reload }
}
