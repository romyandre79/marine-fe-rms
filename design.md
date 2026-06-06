# Frontend Design Guide
# Remote Monitoring System (RMS)

Version: 1.0  
Frontend: Nuxt 4  
UI Framework: TailwindCSS  
Architecture: SaaS Multi Company  
Theme: Modern Enterprise Dashboard

---

# 1. Design Principles

- Clean enterprise appearance
- Fast loading
- Mobile responsive
- Minimal clicks for monitoring
- Real-time first design
- Multi company isolation
- Dark mode support
- Large data visualization optimized

---

# 2. Color Palette

## Primary

Primary:

#2563EB

Primary Hover:

#1D4ED8

Secondary:

#0F172A

Success:

#16A34A

Danger:

#DC2626

Warning:

#F59E0B

Info:

#0EA5E9

---

## Background

Main Background:

#F8FAFC

Card:

#FFFFFF

Sidebar:

#111827

Dark Background:

#0F172A

Border:

#E2E8F0

---

# 3. Typography

Font:

Inter

Fallback:

sans-serif

Heading:

font-bold

Body:

font-medium

Table:

text-sm

Small Label:

text-xs

---

# 4. Layout Structure

```
+------------------------------------+
| Header                             |
+---------+--------------------------+
| Sidebar | Main Content             |
|         |                          |
|         | Dashboard Widgets        |
|         | Tables                   |
|         | Monitoring Charts        |
|         | Alerts                   |
|         | Device Maps              |
+---------+--------------------------+
```

Desktop:

Sidebar Width:

280px

Content:

Flexible

Tablet:

Sidebar Collapse

Mobile:

Drawer Navigation

---

# 5. SaaS Multi Company Design

Tenant selector always visible:

[Company Dropdown]

Example:

Acme Corp ▼

Rules:

- Company switch reloads tenant context
- Company color accent optional
- Tenant badge shown in header
- Tenant ID never shown

---

# 6. Header Components

Height:

72px

Contains:

- Company Selector
- Search
- Notifications
- User Profile
- Theme Toggle

Example:

```
-------------------------------------------------
Company ▼   Search...     Bell   Theme  Avatar
-------------------------------------------------
```

---

# 7. Sidebar Navigation

Groups:

Dashboard

Monitoring

Devices

Alerts

Analytics

Users

Settings

Collapsed State:

Icons Only

Expanded State:

Icon + Label

Example:

```
📊 Dashboard

🖥 Devices

🔔 Alerts

📈 Analytics

⚙ Settings
```

---

# 8. Dashboard Design

Dashboard contains:

## KPI Cards

- Total Devices
- Online Devices
- Offline Devices
- Critical Alerts

Grid:

Desktop:

4 columns

Tablet:

2 columns

Mobile:

1 column

---

## Monitoring Widgets

Examples:

- Live Device Status
- Temperature Graph
- CPU Usage
- Memory Usage
- Network Usage
- Uptime

Card Style:

rounded-xl

shadow-sm

border

padding:

24px

---

# 9. Monitoring Page

Layout:

```
Filters

Map / Graph

Live Table

Logs
```

Filtering:

- Company
- Device Group
- Status
- Time Range

Sticky Filter Bar:

Yes

---

# 10. Device Table

Features:

- Sorting
- Pagination
- Virtualization
- Column Toggle
- Export CSV

Columns:

Device

Status

CPU

RAM

Last Seen

Location

Actions

Row Height:

56px

Hover:

background-gray-50

---

# 11. Real-time Alerts

Priority Colors:

Critical:

Red

Warning:

Yellow

Info:

Blue

Alert Card:

```
[CRITICAL]

Device A Down

2 Minutes Ago
```

Realtime:

Websocket

SSE

Polling fallback

---

# 12. Charts

Recommended:

- Line
- Area
- Heatmap
- Gauge
- Bar

Rules:

- Avoid more than 5 colors
- Support dark mode
- Lazy load charts

---

# 13. Forms

Input Height:

44px

Rounded:

lg

Spacing:

16px

Validation:

Inline

Button Style:

Primary:

Blue

Secondary:

Gray

Danger:

Red

---

# 14. Dark Mode

Requirements:

- Full support
- Persist selection

Background:

#0F172A

Cards:

#1E293B

Text:

#F1F5F9

---

# 15. Component Structure

```
components/

ui/

Button/

Card/

Input/

Modal/

Table/

charts/

dashboard/

monitoring/

alerts/

layout/

Sidebar/

Header/
```

---

# 16. Page Structure

```
pages/

dashboard/

monitoring/

devices/

alerts/

analytics/

settings/

profile/
```

---

# 17. Recommended Nuxt Modules

- TailwindCSS
- Pinia
- VueUse
- Nuxt Image
- Nuxt Fonts
- Nuxt Security
- Nuxt Icon

---

# 18. Performance Rules

- Dynamic imports
- Lazy load charts
- Virtual table
- Route chunk splitting
- SWR caching
- Image optimization

---

# 19. Accessibility

Requirements:

- Keyboard navigation
- Focus visible
- Contrast AA
- Screen reader labels

---

# 20. Responsive Breakpoints

Mobile:

<640px

Tablet:

640-1024px

Desktop:

1024px+

Large:

1440px+

---

# 21. Empty States

Example:

"No devices connected"

Show:

Illustration

Action Button

Description

---

# 22. Loading States

Use:

Skeleton Loader

Avoid:

Spinners everywhere

---

# 23. Security UX

- Auto logout warning
- Session expiration modal
- Permission based menus
- Disable hidden routes

---

# 24. Branding

White-label Ready

Customizable:

- Logo
- Primary Color
- Favicon
- Login Background

---

# 25. Target Feel

"Modern Datadog + Grafana + Enterprise SaaS"


# 26. Performance Standards (Mandatory)

Target:

First Contentful Paint:

< 1.5s

Largest Contentful Paint:

< 2.5s

Time To Interactive:

< 3s

CLS:

< 0.1

Requirements:

- SSR by default
- Dynamic imports
- Route based chunking
- Lazy loading components
- Lazy loading images
- Tree shaking enabled
- Remove unused JS
- Minimize hydration
- Virtualized large tables
- Debounced search
- SWR caching

Bundle Rules:

Page Bundle:

< 250kb preferred

Images:

WebP / AVIF preferred

Monitoring:

- Lighthouse CI
- Web Vitals
- Bundle Analyzer

---

# 27. Frontend Security Standards (Mandatory)

Must Implement:

- CSP Headers
- XSS Protection
- Input Sanitization
- Escape HTML
- CSRF Protection
- Secure Cookies
- HttpOnly Cookies
- SameSite Strict

Authentication:

- Access Token Short Lifetime
- Refresh Rotation
- Auto Logout

Sensitive Data:

Never Store:

- Passwords
- Secrets
- API Keys

Storage:

Prefer:

- HttpOnly Cookie

Avoid:

- localStorage for sensitive tokens

Dependencies:

- Dependency Audit Required
- SAST Scan
- npm audit

Headers:

Content-Security-Policy

X-Frame-Options

X-Content-Type-Options

Referrer-Policy

Permissions-Policy