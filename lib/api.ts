import { supabase } from './supabase'
import type { Competition, Match, MatchResult, Session, User } from './types'

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

// --- Auth ---

export async function login(name: string, pin: string): Promise<Session> {
  const { data, error } = await supabase.rpc('auth_login', { p_name: name, p_pin: pin })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return { token: row.token, userId: row.user_id, name: row.name, isAdmin: !!row.is_admin }
}

export async function logout(token: string): Promise<void> {
  await supabase.rpc('auth_logout', { p_token: token })
}

// --- Admin only (server-side enforced via RPC) ---

export async function adminDeleteUser(token: string, targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_token: token, p_target_user_id: targetUserId })
  if (error) throw new Error(error.message)
}

export async function updateAvatar(token: string, avatar: string | null): Promise<User> {
  const { data, error } = await supabase.rpc('update_avatar', { p_token: token, p_avatar: avatar })
  if (error) throw new Error(error.message)
  return data
}

// --- Reads (public) ---

export async function listUsers(): Promise<User[]> {
  return unwrap(await supabase.from('user_directory').select('*').order('name'))
}

export async function getUser(name: string): Promise<User | null> {
  const { data, error } = await supabase.from('user_directory').select('*').eq('name', name).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function listCompetitions(userId: string): Promise<Competition[]> {
  return unwrap(
    await supabase.from('competitions').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  )
}

export async function getCompetition(id: string): Promise<Competition | null> {
  const { data, error } = await supabase.from('competitions').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function listMatches(competitionId: string): Promise<Match[]> {
  return unwrap(
    await supabase
      .from('matches')
      .select('*')
      .eq('competition_id', competitionId)
      .order('round_number', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
  )
}

// --- Writes (via security-definer RPC, ownership enforced in DB) ---

export type CompetitionInput = {
  name: string
  game: string
  category: string
  decklog: string
  decklogImage: string | null
}

export async function createCompetition(token: string, fields: CompetitionInput): Promise<Competition> {
  const { data, error } = await supabase.rpc('create_competition', {
    p_token: token,
    p_name: fields.name,
    p_game: fields.game,
    p_category: fields.category,
    p_decklog: fields.decklog,
    p_decklog_image: fields.decklogImage,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function updateCompetition(token: string, id: string, fields: CompetitionInput): Promise<Competition> {
  const { data, error } = await supabase.rpc('update_competition', {
    p_token: token,
    p_id: id,
    p_name: fields.name,
    p_game: fields.game,
    p_category: fields.category,
    p_decklog: fields.decklog,
    p_decklog_image: fields.decklogImage,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function deleteCompetition(token: string, id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_competition', { p_token: token, p_id: id })
  if (error) throw new Error(error.message)
}

export type MatchInput = {
  matchDate: string
  roundNumber: number | null
  opponent: string
  wentFirst: boolean | null
  result: MatchResult
  score: string
  notes: string
  extra: Record<string, string>
}

export async function createMatch(token: string, competitionId: string, input: MatchInput): Promise<Match> {
  const { data, error } = await supabase.rpc('create_match', {
    p_token: token,
    p_competition_id: competitionId,
    p_match_date: input.matchDate,
    p_opponent: input.opponent,
    p_result: input.result,
    p_score: input.score,
    p_notes: input.notes,
    p_extra: input.extra,
    p_round_number: input.roundNumber,
    p_went_first: input.wentFirst,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function updateMatch(token: string, id: string, input: MatchInput): Promise<Match> {
  const { data, error } = await supabase.rpc('update_match', {
    p_token: token,
    p_id: id,
    p_match_date: input.matchDate,
    p_opponent: input.opponent,
    p_result: input.result,
    p_score: input.score,
    p_notes: input.notes,
    p_extra: input.extra,
    p_round_number: input.roundNumber,
    p_went_first: input.wentFirst,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function deleteMatch(token: string, id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_match', { p_token: token, p_id: id })
  if (error) throw new Error(error.message)
}
