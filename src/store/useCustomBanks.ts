import { useState, useCallback } from 'react'
import { getActiveProfileId } from '../profiles/profileService'
import type { Bank } from '../types/data'

function storageKey(): string {
  const id = getActiveProfileId()
  return id ? `patrimoine-custom-banks-${id}` : 'patrimoine-custom-banks-default'
}

function load(): Bank[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey()) ?? '[]')
  } catch {
    return []
  }
}

function persist(banks: Bank[]): void {
  localStorage.setItem(storageKey(), JSON.stringify(banks))
}

export function useCustomBanks() {
  const [banks, setBanks] = useState<Bank[]>(() => load())

  const add = useCallback((bank: Bank) => {
    setBanks(prev => {
      const next = [...prev, bank]
      persist(next)
      return next
    })
  }, [])

  const update = useCallback((id: string, bank: Bank) => {
    setBanks(prev => {
      const next = prev.map(b => b.id === id ? bank : b)
      persist(next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setBanks(prev => {
      const next = prev.filter(b => b.id !== id)
      persist(next)
      return next
    })
  }, [])

  return { banks, add, update, remove }
}
