import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['gu', 'en'],
  // Gujarati first: the audience reads Gujarati more comfortably than English,
  // and defaulting to `en` would silently exclude most of them.
  defaultLocale: 'gu',
})

export type Locale = (typeof routing.locales)[number]
