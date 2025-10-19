/**
 * Navigation constants
 * Icons use heroicons (outline style)
 */
export const NAV_LINKS = [
  {
    name: 'Home',
    href: '/',
    icon: 'heroicons:home'
  },
  {
    name: 'Leaderboard',
    href: '/leaderboard',
    icon: 'heroicons:trophy'
  },
  {
    name: 'Login',
    href: '/login',
    icon: 'heroicons:lock-closed',
    authHidden: true
  }
];

export const SOCIAL_LINKS = [
  {
    name: 'GitHub',
    href: 'https://github.com/CodeMaverick-143',
    icon: 'mdi:github'
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/in/arpit-sarang/',
    icon: 'mdi:linkedin'
  },
  {
    name: 'Twitter',
    href: 'https://twitter.com/nstsdc',
    icon: 'mdi:twitter'
  }
];

export const FOOTER_LINKS = {
  about: [
    { name: 'About Us', href: '/' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'FAQ', href: '/#faq' }
  ],
  resources: [
    { name: 'Hacktoberfest', href: 'https://hacktoberfest.com', external: true },
    { name: 'GitHub', href: 'https://github.com', external: true },
    { name: 'Documentation', href: '/docs' }
  ],
  community: [
    { name: 'Leaderboard', href: '/leaderboard' },
    { name: 'Contributors', href: '/contributors' },
    { name: 'Projects', href: '/projects' }
  ]
};
