export type MatchResult = 'win' | 'loss' | 'draw'

export type User = {
  id: string
  name: string
  avatar: string | null
  created_at: string
}

export type Competition = {
  id: string
  user_id: string
  name: string
  game: string | null
  category: string | null
  decklog: string | null
  decklog_image: string | null
  created_at: string
}

export type Match = {
  id: string
  competition_id: string
  user_id: string
  match_date: string
  round_number: number | null
  opponent: string | null
  went_first: boolean | null
  result: MatchResult
  score: string | null
  notes: string | null
  extra: Record<string, string>
  created_at: string
}

export type ProfileLink = {
  label: string
  url: string
}

export type ProfileCard = {
  id: string
  user_id: string
  tagline: string | null
  links: ProfileLink[]
  extra: Record<string, string>
  updated_at: string
  created_at: string
}

export type Session = {
  token: string
  userId: string
  name: string
  isAdmin: boolean
}
