import { useEffect, useState } from 'react'

const GITHUB_URL = 'https://github.com/juandaalean'
const LINKEDIN_URL = 'https://www.linkedin.com/in/juanda-alean-medina'
const APP_VERSION = 'v1.1.2'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

type SocialLinkProps = {
  href: string
  label: string
  children: React.ReactNode
  hoverClass?: string
}

function SocialLink({ href, label, children, hoverClass }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      data-tip={label}
      className="tooltip tooltip-top"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full text-base-content/75 transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          hoverClass ?? 'hover:bg-base-200 hover:text-base-content'
        }`}
      >
        {children}
      </span>
    </a>
  )
}

export function FloatingSponsorPanel() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      aria-label="Project links and version"
      className={`fixed z-50 transition-all duration-500 ease-out bottom-3 right-3 sm:bottom-4 sm:right-4 ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-base-300/60 bg-base-100/80 p-1.5 shadow-lg shadow-primary/10 backdrop-blur-md transition-all duration-300 hover:border-primary/40 hover:shadow-primary/20 hover:-translate-y-0.5">
        <SocialLink href={GITHUB_URL} label="GitHub">
          <GitHubIcon className="h-[18px] w-[18px]" />
        </SocialLink>

        <SocialLink
          href={LINKEDIN_URL}
          label="LinkedIn"
          hoverClass="hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]"
        >
          <LinkedInIcon className="h-[18px] w-[18px]" />
        </SocialLink>

        <span aria-hidden="true" className="mx-1 h-5 w-px bg-base-300/70 sm:mx-1.5" />

        <span className="select-none rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-primary">
          {APP_VERSION}
        </span>
      </div>
    </div>
  )
}
