---
version: "alpha"
name: "KelbyOne Pages"
description: "Design system for lightweight KelbyOne/Grid microsites, submission forms, and event landing pages. Dark, photographic, premium, direct-response, and optimized for fast single-page builds."
colors:
  primary: "#0A0A0A"
  surface: "#161616"
  surface-raised: "#1E1E1E"
  surface-hover: "#252525"
  border: "#2A2A2A"
  text-primary: "#F5F5F5"
  text-secondary: "#A0A0A0"
  text-muted: "#666666"
  grid-gold: "#F5A623"
  edit-blue: "#4FC3F7"
  edit-blue-strong: "#29B6F6"
  summit-gold: "#D6A34A"
  success: "#2ECC71"
  error: "#E74C3C"
  youtube-red: "#FF0000"
  facebook-blue: "#1877F2"
  black: "#000000"
  white: "#FFFFFF"
typography:
  h1-hero:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "4rem"
    fontWeight: 900
    lineHeight: "1"
    letterSpacing: "-0.03em"
  h2-section:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: "1.15"
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.6"
  label-caps:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 800
    lineHeight: "1.2"
    letterSpacing: "0.18em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  badge-grid:
    backgroundColor: "{colors.grid-gold}"
    textColor: "{colors.black}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.sm}"
    padding: "8px"
  button-primary-grid:
    backgroundColor: "{colors.grid-gold}"
    textColor: "{colors.black}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.lg}"
    padding: "16px"
  button-primary-edit:
    backgroundColor: "{colors.edit-blue}"
    textColor: "{colors.black}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-dark:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-dark:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px"
---

## Overview

KelbyOne pages should feel like a premium photography environment: darkroom blacks, high-contrast typography, crisp cards, and one clear accent per page. The visual language should feel energetic and broadcast-ready for The Grid, but still practical and trustworthy for forms and member actions.

The default mode is dark, minimal, and focused. Avoid generic SaaS gradients or overly soft startup styling. These pages are for photographers, live shows, conferences, submissions, and education — they should feel direct, visual, and a little cinematic.

## Colors

Use **Primary (#0A0A0A)** as the default page background. Use **Surface (#161616)** and **Surface Raised (#1E1E1E)** for form cards, upload areas, and navigation surfaces. Text should be **Text Primary (#F5F5F5)** for core readability, with **Text Secondary (#A0A0A0)** for support copy and **Text Muted (#666666)** for helper text.

Accent color is contextual:

- **Grid Gold (#F5A623):** default Grid/the-show action color.
- **Edit Blue (#4FC3F7):** editing/photo-submission workflow color.
- **Summit Gold (#D6A34A):** premium event/conference color.

Keep accents disciplined. One main accent per page. YouTube red and Facebook blue are reserved for platform buttons only.

## Typography

Use the system font stack for speed, native rendering, and low operational complexity. Headlines should be heavy, uppercase, tight, and direct. Body copy should stay readable and plain. Small labels and badges should use uppercase with wide tracking.

Hero headlines can use `clamp()` in implementation, but should preserve the intent of `h1-hero`: heavy, compressed, and high impact.

## Layout

Default layouts are centered, narrow, and mobile-first. Submission forms should use a max width around 640–760px. Link hubs can be narrower, around 480px. Use generous vertical spacing and keep the page hierarchy obvious: badge → headline → explanation → primary action/form.

Cards should not feel crowded. Prefer fewer sections with clear labels over dense dashboards.

## Elevation & Depth

Depth should be subtle: borders, light glows in the page accent, and occasional soft shadows. Avoid heavy neumorphism, glassmorphism overload, or loud animated effects. Background radial gradients are acceptable when they support the page accent and stay low contrast.

## Shapes

Use small-to-medium radii for controls. Buttons and form cards should feel modern but not bubbly. Pills are reserved for badges and small status labels. Upload zones and major form shells can use larger radii when the page needs a more premium event feel.

## Components

Primary buttons should be full-width on form pages and use the page accent as the background with black text. Dark cards use Surface with a Border. Inputs use Surface Raised with Text Primary and an accent focus ring.

Badges are uppercase, compact, and high-contrast. They should introduce context like “Live Every Thursday,” “Live Editing Session,” or “Summit Submission,” not carry full sentence copy.

## Do's and Don'ts

Do:

- Use one accent color per page.
- Keep CTAs obvious and high contrast.
- Make upload/form flows feel safe and simple.
- Preserve the premium photography/darkroom mood.
- Use direct, plain language.

Don't:

- Mix Grid Gold, Edit Blue, and Summit Gold as competing accents on one page.
- Use generic SaaS pastel gradients.
- Over-animate forms or submission states.
- Hide the primary action below unnecessary marketing copy.
- Let AI-generated designs invent unrelated fonts, colors, or playful illustration styles.
