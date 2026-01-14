import Link from 'next/link'
import UserProfile from '@/components/UserProfile'
import PhoneTimeForm from '@/components/PhoneTimeForm'
import JournalEntriesList from '@/components/JournalEntriesList'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <svg
                className="h-8 w-8 text-primary-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
              <span className="text-xl font-bold text-gray-900">VoiceJournal</span>
            </Link>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700">
              Dashboard
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your journal preferences and view past entries.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile and Form */}
          <div className="space-y-6 lg:col-span-1">
            <UserProfile />
            <PhoneTimeForm />
          </div>

          {/* Right Column - Journal Entries */}
          <div className="lg:col-span-2">
            <JournalEntriesList />
          </div>
        </div>
      </main>
    </div>
  )
}
