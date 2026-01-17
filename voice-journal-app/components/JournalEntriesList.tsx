'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JournalEntry } from '@/types'

export default function JournalEntriesList() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchEntries = useCallback(async (cursor?: string) => {
    try {
      const url = cursor
        ? `/api/journal?cursor=${cursor}`
        : '/api/journal'
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch journal entries')
      }

      const data = await response.json()
      return data
    } catch (err) {
      throw err
    }
  }, [])

  useEffect(() => {
    async function loadEntries() {
      try {
        const data = await fetchEntries()
        setEntries(data.entries)
        setNextCursor(data.nextCursor || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    loadEntries()
  }, [fetchEntries])

  const loadMore = async () => {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const data = await fetchEntries(nextCursor)
      setEntries((prev) => [...prev, ...data.entries])
      setNextCursor(data.nextCursor || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more entries')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900">Journal Entries</h2>
        <div className="mt-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse border-b border-gray-100 pb-4">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-full bg-gray-200 rounded mb-1"></div>
              <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900">Journal Entries</h2>
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900">Journal Entries</h2>
        <div className="mt-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No journal entries yet
          </h3>
          <p className="mt-2 text-gray-600">
            Once you complete your first call, your journal entries will appear
            here.
          </p>
          <div className="mt-6 rounded-lg bg-primary-50 p-4">
            <p className="text-sm text-primary-700">
              <strong>Tip:</strong> Make sure to save your phone number and
              preferred call time so we can schedule your first journal call!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900">Journal Entries</h2>
      <div className="mt-4 space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.entryId}
            className="border-b border-gray-100 pb-4 last:border-0"
          >
            <div className="flex items-center justify-between">
              <time className="text-sm font-medium text-gray-900">
                {formatDate(entry.createdAt)}
              </time>
              <span className="text-xs text-gray-500">
                {formatTime(entry.createdAt)}
                {entry.duration && ` - ${formatDuration(entry.duration)}`}
              </span>
            </div>
            <p className="mt-2 text-gray-600 whitespace-pre-wrap">
              {entry.transcription}
            </p>
            {entry.summary && (
              <div className="mt-2 rounded bg-gray-50 p-2">
                <p className="text-xs text-gray-500 font-medium">Summary</p>
                <p className="text-sm text-gray-700">{entry.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {nextCursor && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load more entries'}
          </button>
        </div>
      )}
    </div>
  )
}
