'use client'

export default function JournalEntriesList() {
  // Empty state - no entries yet
  const entries: never[] = []

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

  // Future implementation for when entries exist
  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900">Journal Entries</h2>
      <div className="mt-4 space-y-4">
        {/* Entry items would be mapped here */}
      </div>
    </div>
  )
}
