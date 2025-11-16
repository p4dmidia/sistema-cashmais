import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../shared/types'

export function useSupabaseProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('mocha_user_id', userId)
          .single()

        if (error) throw error
        setProfile(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  return { profile, loading, error }
}

export function useSupabaseTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false })

        if (error) throw error
        setTransactions(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [userId])

  return { transactions, loading, error }
}

export function useAffiliateBalance(userId: string | null) {
  const [balance, setBalance] = useState<{available_balance: number, total_earned: number}>({available_balance: 0, total_earned: 0})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchBalance = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('user_settings')
          .select('available_balance, total_earnings')
          .eq('user_id', userId)
          .single()

        if (error) throw error
        setBalance({
          available_balance: data?.available_balance || 0,
          total_earned: data?.total_earnings || 0
        })
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [userId])

  return { balance, loading, error }
}

export function useAffiliateTransactions(userId: string | null, limit?: number) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        
        if (limit) {
          query = query.limit(limit)
        }

        const { data, error } = await query

        if (error) throw error
        setTransactions(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [userId, limit])

  return { transactions, loading, error }
}

export function useNetworkMembers(userId: string | null) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchMembers = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('affiliates')
          .select('*')
          .eq('sponsor_referral_code', userId)

        if (error) throw error
        setMembers(data || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [userId])

  return { network: members, members, loading, error }
}