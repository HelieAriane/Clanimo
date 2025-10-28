// frontend/src/services/meetups.ts
import api from '@/lib/api'

export type Meetup = {
  _id: string
  title: string
  description?: string
  date: string // ISO
  district: string
  imageURL?: string
  createdBy: string
  participants: string[]
  invites?: string[]
  type?: 'offre' | 'demande'
}

export type MeetupsQuery = {
  district?: string | string[]
  start?: string // 'YYYY-MM-DD'
  end?: string   // 'YYYY-MM-DD'
}

function toQueryString(params: Record<string, unknown>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    if (Array.isArray(v)) (v as unknown[]).forEach(item => sp.append(k, String(item)))
    else sp.append(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export default {
  async list(filters: MeetupsQuery = {}) {
    return api.get<{ meetups: Meetup[] }>(`/meetups${toQueryString(filters)}`)
  },

  async create(payload: Partial<Meetup>) {
    return api.post<{ meetup: Meetup }>(`/meetups`, payload)
  },

  async getOne(id: string) {
    return api.get<{ meetup: Meetup }>(`/meetups/${id}`)
  },

  async update(id: string, payload: Partial<Meetup>) {
    return api.put<{ meetup: Meetup }>(`/meetups/${id}`, payload)
  },

  // Retour JSON attendu -> utilise api.delete<T>
  async remove(id: string) {
    return api.delete<{ ok: boolean }>(`/meetups/${id}`)
  },

  async join(id: string) {
    return api.post<{ meetup: Meetup }>(`/meetups/${id}/join`)
  },

  async leave(id: string) {
    return api.post<{ meetup: Meetup }>(`/meetups/${id}/leave`)
  },

  async invite(id: string, friendId: string) {
    return api.post<{ ok: boolean }>(`/meetups/${id}/invite/${friendId}`)
  },

  async participants(id: string) {
    return api.get<{ users: Array<{ _id: string; name: string; avatarURL?: string }> }>(
      `/meetups/${id}/participants`
    )
  },
}
