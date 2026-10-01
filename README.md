# Band Board

A shared scheduling and payout board for small bands: availability voting, gig cards, venue contacts, gear assignments, and pay splits with Venmo, Cash App, and Apple Cash links.

Built as a single-file app for the Claude artifact runtime.

## Features
- Dates: propose rehearsals/gigs, everyone votes In / Maybe / Out, best date highlighted
- Gigs: backstage-pass cards with load-in, set time, map links (Apple, Google, Waze), venue contact buttons, gear assignments
- Venues: saved contacts and history, autofill when booking
- Pay: even split after expenses, preferred payment method per member, one-tap send/request
- Request your share: one tap asks whoever is holding the money (Venmo request, or a pre-filled text); stays available after the gig until everyone's paid
- Setlists: one per gig, numbered and reorderable, with key/BPM/notes; start a new one by copying an old one; shows on the gig pass; text it to the band
- Text the band: pre-filled group text that links back to the board
- Catch up from chat: paste or screenshot a thread and review extracted dates (screenshots depend on viewer support)

## Runtime note
Shared data uses the Claude artifact runtime (`claude.use('db' | 'user' | 'sample')`), so the app only works when published as a Claude artifact. Opened as a plain file or on GitHub Pages it shows a "shared board isn't available" message. Moving it elsewhere means swapping the `db` calls for a backend such as Supabase or Firebase.

## Status
v4.2. Next: setlist voting.
