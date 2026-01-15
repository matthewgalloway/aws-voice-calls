'use client'

import { useUser, SignOutButton } from '@clerk/nextjs'
import Image from 'next/image'

export default function UserProfile() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-3 w-48 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {user.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={user.fullName || 'Profile'}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <span className="text-2xl font-semibold text-primary-600">
                {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user.fullName || 'Welcome!'}
            </h2>
            <p className="text-gray-600">
              {user.primaryEmailAddress?.emailAddress}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Member since{' '}
              {new Date(user.createdAt!).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <SignOutButton>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
