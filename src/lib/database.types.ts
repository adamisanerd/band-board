// Types for the database schema in supabase/migrations.
// Regenerate after changing the schema: `npm run db:types` (needs the local database running).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Table<Row, Required extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      bands: Table<{ id: string; name: string; invite_code: string; created_at: string }, 'name'>
      members: Table<
        {
          id: string
          band_id: string
          user_id: string | null
          name: string
          role: string
          venmo: string
          cashtag: string
          phone: string
          pref_pay: '' | 'venmo' | 'cashapp' | 'applecash'
          created_at: string
        },
        'band_id' | 'name'
      >
      dates: Table<
        {
          id: string
          band_id: string
          day: string
          start_time: string | null
          kind: 'Rehearsal' | 'Gig' | 'Either'
          note: string
          booked: boolean
          created_by: string | null
          created_at: string
        },
        'band_id' | 'day'
      >
      votes: Table<
        { date_id: string; member_id: string; band_id: string; vote: 'yes' | 'maybe' | 'no' },
        'date_id' | 'member_id' | 'band_id' | 'vote'
      >
      venues: Table<
        {
          id: string
          band_id: string
          name: string
          address: string
          contact_name: string
          phone: string
          email: string
          notes: string
          created_at: string
        },
        'band_id' | 'name'
      >
      gigs: Table<
        {
          id: string
          band_id: string
          venue_id: string | null
          venue_name: string
          day: string
          load_in: string | null
          set_time: string | null
          address: string
          contact_name: string
          phone: string
          email: string
          pay: number
          expenses: number
          collector_id: string | null
          notes: string
          from_date_id: string | null
          created_at: string
        },
        'band_id' | 'venue_name' | 'day'
      >
      gear_items: Table<
        { id: string; band_id: string; gig_id: string; item: string; member_id: string | null; position: number },
        'band_id' | 'gig_id' | 'item'
      >
      gig_payments: Table<
        { gig_id: string; member_id: string; band_id: string; paid_at: string },
        'gig_id' | 'member_id' | 'band_id'
      >
      setlists: Table<
        { id: string; band_id: string; gig_id: string | null; name: string; created_at: string },
        'band_id' | 'name'
      >
      setlist_songs: Table<
        {
          id: string
          band_id: string
          setlist_id: string
          position: number
          title: string
          song_key: string
          bpm: number | null
          notes: string
        },
        'band_id' | 'setlist_id' | 'title'
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      create_band: { Args: { band_name: string; lineup: Json; me: number }; Returns: string }
      band_preview: {
        Args: { code: string }
        Returns: {
          band_id: string
          band_name: string
          member_id: string | null
          member_name: string | null
          member_role: string | null
          claimed: boolean | null
        }[]
      }
      join_band: { Args: { code: string; member?: string; new_name?: string }; Returns: string }
      is_member: { Args: { b: string }; Returns: boolean }
      my_member_id: { Args: { b: string }; Returns: string }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
