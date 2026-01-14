'use client'

import { useState } from 'react'

export default function PhoneTimeForm() {
  const [phone, setPhone] = useState('')
  const [callTime, setCallTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call - replace with actual API endpoint
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log('Phone:', phone, 'Call Time:', callTime)
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  if (isSubmitted) {
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
            We&apos;ll call you at {callTime} every day.
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
          <p className="mt-1 text-xs text-gray-500">
            Time is in your local timezone
          </p>
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
