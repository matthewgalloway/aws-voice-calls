'use client'

import { useState, useEffect } from 'react'
import { TIMEZONE_OPTIONS } from '@/types'

interface Preferences {
  phoneNumber: string
  preferredCallTime: string
  timezone: string
  isActive: boolean
}

export default function PhoneTimeForm() {
  const [phone, setPhone] = useState('')
  const [callTime, setCallTime] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data: Preferences = await response.json()
          if (data.phoneNumber) {
            setPhone(formatPhoneDisplay(data.phoneNumber))
          }
          if (data.preferredCallTime) {
            setCallTime(data.preferredCallTime)
          }
          if (data.timezone) {
            setTimezone(data.timezone)
          }
        }
      } catch (err) {
        console.error('Failed to load preferences:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadPreferences()
  }, [])

  // Convert display format to E.164
  const toE164 = (displayPhone: string): string => {
    const numbers = displayPhone.replace(/\D/g, '')
    if (numbers.length === 10) {
      return `+1${numbers}`
    }
    if (numbers.length === 11 && numbers.startsWith('1')) {
      return `+${numbers}`
    }
    return `+${numbers}`
  }

  // Convert E.164 to display format
  const formatPhoneDisplay = (e164: string): string => {
    const numbers = e164.replace(/\D/g, '')
    const nationalNumber = numbers.startsWith('1') ? numbers.slice(1) : numbers
    if (nationalNumber.length === 10) {
      return `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`
    }
    return e164
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: toE164(phone),
          preferredCallTime: callTime,
          timezone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    const tzLabel = TIMEZONE_OPTIONS.find(tz => tz.value === timezone)?.label || timezone
    return (
      <div className="card">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Preferences Saved!
          </h3>
          <p className="mt-2 text-gray-600">
            We&apos;ll call you at {callTime} ({tzLabel}) every day.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Update preferences
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900">Call Preferences</h2>
      <p className="mt-1 text-sm text-gray-600">
        Set your phone number and preferred time for daily journal calls.
      </p>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(555) 123-4567"
            className="input mt-1"
            required
          />
        </div>

        <div>
          <label
            htmlFor="callTime"
            className="block text-sm font-medium text-gray-700"
          >
            Preferred Call Time
          </label>
          <input
            type="time"
            id="callTime"
            value={callTime}
            onChange={(e) => setCallTime(e.target.value)}
            className="input mt-1"
            required
          />
        </div>

        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700"
          >
            Timezone
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input mt-1"
            required
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            'Save Preferences'
          )}
        </button>
      </form>
    </div>
  )
}
