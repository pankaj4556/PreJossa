# PreJOSAA: 100/100 Lighthouse & Grade A+ Security Architecture Blueprint

This document specifies the complete engineering blueprint for refactoring **PreJOSAA** to achieve a **100/100 Google Lighthouse audit** across all categories (Performance, Accessibility, SEO, Best Practices) and a **Grade A+ Security Header rating** on Mozilla Observatory and SSL Labs.

---

## 1. Metric Audit Breakdown & Target Architecture

| Lighthouse Category | Current Status / Bottlenecks | Architecture Target | Key Optimization Drivers |
| :--- | :--- | :--- | :--- |
| **Performance** | Runtime Tailwind CDN (`cdn.tailwindcss.com`), unoptimized PNG assets, client render latency | **100 / 100** | Next.js SSG/ISR, Next/Image (AVIF/WebP), AOT PostCSS/Tailwind, route code-splitting, zero-CDN scripts |
| **Accessibility** | Slate contrast ratios on dark surfaces, missing ARIA on dynamic selectors, implicit focus states | **100 / 100** | WCAG 2.1 AA (4.5:1 / 3:1), semantic HTML5 landmarks, visible focus rings, ARIA live regions |
| **SEO** | Generic titles, unindexed dynamic routes, no JSON-LD schemas | **100 / 100** | Automated `sitemap.xml`, `robots.txt`, dynamic OpenGraph tags, EducationalOrganization JSON-LD |
| **Best Practices** | External scripts without integrity, non-optimized doctype placement | **100 / 100** | Strict UTF-8 `<head>` sequencing, CSP hash enforcement, HTTPS asset resolution, zero console warnings |
| **Security & Headers**| Default Express headers (missing CSP, HSTS, X-Frame-Options) | **Grade A+ (100%)** | HSTS preload (2 years), restrictive Content-Security-Policy, Permissions-Policy, Clickjacking prevention |

---

## 2. Pillar 1: Performance (Target 100/100 — Core Web Vitals)

### 2.1 FCP & LCP Optimization: Image Pipeline (AVIF / WebP)
1. **Automated Conversion**: Convert all hero images (`student.png`, UI mockups) into modern compressed formats:
   - **AVIF** (up to 50% smaller than WebP at identical visual fidelity).
   - **WebP** (fallback for legacy browsers).
2. **Next.js `next/image` Implementation**:
   ```tsx
   // components/HeroBanner.tsx
   import Image from 'next/image';

   export default function HeroBanner() {
     return (
       <div className="relative w-full max-w-xl mx-auto aspect-[4/3] overflow-hidden rounded-2xl">
         <Image
           src="/images/student.avif"
           alt="PreJOSAA Engineering College Counseling and Cutoff Explorer"
           fill
           priority
           fetchPriority="high"
           sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
           className="object-cover object-center"
           quality={85}
         />
       </div>
     );
   }
   ```
3. **Server Response Time (TTFB) & Eliminating Render Cold Starts**:
   - **Render Keep-Alive**: Deploy on Render's Standard/Starter persistent tier to prevent CPU throttling and container spin-down.
   - **Edge Caching**: Implement `stale-while-revalidate=86400` headers on static data and dynamic cutoff queries using HTTP Cache-Control headers.
   - **SQLite Read-Replication / In-Memory Cache**: Use `better-sqlite3` prepared statements with memory caching (`WAL` journal mode enabled) for instant <10ms lookup times.

### 2.2 TBT & Script Execution: Code-Splitting & Zero-CDN Pipeline
1. **Eliminate Runtime Tailwind CDN**: Replace `cdn.tailwindcss.com` with pre-compiled Tailwind CSS v3/v4 via PostCSS.
   ```js
   // postcss.config.js
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
       ...(process.env.NODE_ENV === 'production' ? { cssnano: { preset: 'default' } } : {})
     }
   };
   ```
2. **Dynamic Imports (`next/dynamic` / `React.lazy`)**:
   Heavy client interactive elements (e.g., preference generators, multi-filter sliders, Lenis smooth scrolling, GSAP timelines, and modal drawers) are deferred until user interaction or viewport intersection:
   ```tsx
   import dynamic from 'next/dynamic';

   // Defer Choice Generator table hydration
   const ChoiceGenerator = dynamic(
     () => import('@/components/generator/ChoiceGeneratorTable'),
     {
       ssr: false,
       loading: () => <GeneratorSkeleton />
     }
   );

   // Defer Payment Modal
   const PaymentModal = dynamic(
     () => import('@/components/payment/PaymentModal'),
     { ssr: false }
   );
   ```

### 2.3 Cumulative Layout Shift (CLS) Prevention
- Always enforce explicit aspect ratio containers (`aspect-video`, `aspect-[4/3]`, or explicit `width` and `height` attributes).
- Use Skeleton UI components matching the exact dimensions of dynamic cutoff cards and NIRF tables.
- Set `min-height` on all dynamic sections to prevent DOM reflows when async data resolves.

### 2.4 Font & Network Optimization
Self-host fonts using `next/font/google` to eliminate third-party blocking network requests to Google Fonts:
```tsx
// app/layout.tsx
import { Plus_Jakarta_Sans, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});
```

---

## 3. Pillar 2: Accessibility (Target 100/100 — WCAG 2.1 AA Compliant)

### 3.1 Color Contrast Ratios (WCAG AA Compliance)
- **Normal Text (< 18pt)**: Minimum contrast ratio of **4.5:1**.
- **Large Text / UI Boundaries**: Minimum contrast ratio of **3.0:1**.
- Replace muted dark-mode text (`text-slate-500` on `bg-slate-950` = ~2.8:1) with `text-slate-300` or `text-slate-200` (contrast ratio > 7:1).
- Accessible badge configurations:
  ```html
  <!-- High-contrast IIT / Cutoff Badge -->
  <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-950 text-blue-200 border border-blue-800">
    IIT Bombay &bull; Computer Science
  </span>
  ```

### 3.2 Semantic HTML & Keyboard Navigation
1. **Semantic Landmarks**:
   - `<header role="banner">`
   - `<nav aria-label="Primary Navigation">`
   - `<main id="main-content">`
   - `<section aria-labelledby="section-heading-id">`
   - `<footer role="contentinfo">`
2. **Skip to Content Link**:
   ```html
   <a 
     href="#main-content" 
     class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white">
     Skip to main content
   </a>
   ```
3. **Interactive Element Accessibility**:
   - Explicit `aria-label` on all icon-only buttons (search, modal close, table sort).
   - High-visibility focus indicators: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`.
   - Modals use `aria-modal="true"`, `role="dialog"`, and maintain a strict focus trap.

---

## 4. Pillar 3: SEO (Target 100/100)

### 4.1 Metadata & Social OpenGraph Configuration
```tsx
// app/layout.tsx or app/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://prejosaa.onrender.com'),
  title: {
    default: 'PreJOSAA — JoSAA Choice Filling & Engineering College Predictor',
    template: '%s | PreJOSAA',
  },
  description: 'Generate optimized JoSAA choice filling lists for 23 IITs, 31 NITs, IIITs, and GFTIs using official rank cutoffs, placement stats, and NIRF rankings.',
  keywords: ['JoSAA choice filling', 'IIT cutoff 2025', 'NIT cutoffs', 'JEE Main college predictor', 'JEE Advanced counseling'],
  authors: [{ name: 'PreJOSAA Engineering Counseling' }],
  themeColor: '#070d1e',
  openGraph: {
    title: 'PreJOSAA — JoSAA Choice Filling & College Explorer',
    description: 'Optimize your engineering admissions with verified cutoffs and automated choice lists.',
    url: 'https://prejosaa.onrender.com',
    siteName: 'PreJOSAA',
    images: [
      {
        url: '/images/og-banner.png',
        width: 1200,
        height: 630,
        alt: 'PreJOSAA JoSAA Choice Filling and College Predictor Dashboard',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PreJOSAA — JoSAA Choice Filling & College Explorer',
    description: 'JEE Main & Advanced college preferences generated in minutes.',
    images: ['/images/og-banner.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

### 4.2 Structured JSON-LD Schema
Embed rich schema markup in `<head>`:
```tsx
export default function JsonLdSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': 'https://prejosaa.onrender.com/#webapp',
        'name': 'PreJOSAA',
        'applicationCategory': 'EducationalApplication',
        'operatingSystem': 'All',
        'offers': {
          '@type': 'Offer',
          'price': '49',
          'priceCurrency': 'INR'
        },
        'description': 'Automated JoSAA choice filling sequence generator with cutoff analytics.'
      },
      {
        '@type': 'EducationalOrganization',
        '@id': 'https://prejosaa.onrender.com/#organization',
        'name': 'PreJOSAA',
        'url': 'https://prejosaa.onrender.com',
        'logo': 'https://prejosaa.onrender.com/favicon.png'
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

---

## 5. Pillar 4: Best Practices (Target 100/100)

1. **HTML Standards**:
   - `<!DOCTYPE html>` declared as byte 0 of every response.
   - `<meta charset="utf-8">` placed as the first child of `<head>`.
2. **Asset Integrity & Zero 404s**:
   - Multi-resolution `favicon.ico` (16x16, 32x32, 48x48) + `favicon.png` (512x512) + `apple-touch-icon.png`.
   - Manifest configuration via `manifest.json`.
3. **Clean Runtime Execution**:
   - Eliminate deprecated APIs (`window.event`, synchronous layout reads).
   - All async operations and fetch handlers wrapped in resilient `try/catch` with user-friendly toast alerts.

---

## 6. Pillar 5: Security & Headers (Grade A+ Security Rating)

### 6.1 Production Security Headers Configuration
The application enforces strict defense-in-depth headers:

| Header | Production Setting | Security Objective |
| :--- | :--- | :--- |
| **Strict-Transport-Security** | `max-age=63072000; includeSubDomains; preload` | Forces SSL/TLS; eliminates MITM downgrade attacks. |
| **X-Frame-Options** | `DENY` | Prevents UI redressing and clickjacking attacks. |
| **X-Content-Type-Options** | `nosniff` | Disables MIME sniffing vulnerabilities. |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Protects privacy by omitting sensitive query strings in cross-origin requests. |
| **Permissions-Policy** | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Blocks browser surveillance APIs. |
| **Content-Security-Policy (CSP)**| Restrictive allowlist with Razorpay payment gateway integration | Blocks unauthorized XSS and data exfiltration. |

### 6.2 Next.js Security Configuration (`next.config.js`)
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com;",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              "font-src 'self' https://fonts.gstatic.com data:;",
              "img-src 'self' data: https: blob:;",
              "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;",
              "frame-src 'self' https://api.razorpay.com;",
              "object-src 'none';",
              "base-uri 'self';",
              "form-action 'self';",
              "frame-ancestors 'none';"
            ].join(' ')
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
```

---

## 7. Zero-Secret Confidentiality Protocol

All sensitive credentials (admin passwords, session secrets, payment gateway keys, webhook tokens) are managed using the following rules:
1. **Never commit secrets into source control**: `.gitignore` ignores all `.env`, `.env.*`, and database dump files.
2. **Render Environment Variables**: All confidential values are provisioned inside the Render dashboard under **Environment Variables** (or Secret Groups) with `sync: false` in `render.yaml`.
3. **No Hardcoded Defaults**: Replace any in-code test secrets with strict runtime validations:
   ```javascript
   if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
     throw new Error("FATAL: SESSION_SECRET must be supplied via environment variable.");
   }
   ```
