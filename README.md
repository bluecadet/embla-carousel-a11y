# Embla Carousel A11y Plugin

An accessibility plugin for [Embla Carousel](https://www.embla-carousel.com/) that follows WAI-ARIA Authoring Practices for carousels.

## Features

- Adds proper ARIA roles and attributes to carousel elements
- Creates an accessible live region to announce slide changes
- Respects user-provided ARIA attributes
- Shows helpful development warnings for accessibility improvements

## Installation

```bash
# npm
npm install embla-carousel @bluecadet/embla-carousel-a11y

# yarn
yarn add embla-carousel @bluecadet/embla-carousel-a11y

# pnpm
pnpm add embla-carousel @bluecadet/embla-carousel-a11y
```

## Basic Usage

```typescript
import A11y from "@bluecadet/embla-carousel-a11y";
import EmblaCarousel from "embla-carousel";

// Initialize Embla with the A11y plugin
const emblaNode = document.querySelector(".embla");
const embla = EmblaCarousel(emblaNode, { loop: true }, [A11y()]);

// The plugin is accessible through embla.plugins().a11y
const a11yPlugin = embla.plugins().a11y;
```

## API Reference

### Options

The A11y plugin accepts the following options:

| Option                      | Type                  | Default                                       | Description                                                                                         |
| --------------------------- | --------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `carouselLabel`             | `string \| undefined` | `undefined`                                   | A custom label for the carousel. If not provided, uses an existing `aria-label` or sets a default.  |
| `slideSelector`             | `string \| undefined` | `undefined`                                   | Custom selector for slide elements. If not provided, uses Embla's default slide nodes.              |
| `announceSlideChanges`      | `boolean`             | `true`                                        | Whether to announce slide changes to screen readers.                                                |
| `slideAnnouncementTemplate` | `string`              | `"Slide {{currentSlide}} of {{totalSlides}}"` | Template for slide change announcements. Use `{{currentSlide}}` and `{{totalSlides}}` as variables. |
| `showDeveloperWarnings`     | `boolean`             | `true`                                        | Whether to show developer console warnings in non-production environments.                          |

### Plugin Methods

The A11y plugin exposes the following methods:

| Method     | Description                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `update()` | Updates ARIA attributes based on the current carousel state. Called automatically when the selected slide changes. |

## Accessibility Features

This plugin implements the following accessibility features:

### Proper ARIA Roles and Attributes

- Adds `role="region"` to the carousel container
- Adds `aria-roledescription="carousel"` to identify it as a carousel
- Adds proper `aria-label` (or respects existing labels)
- Adds `role="group"` and `aria-roledescription="slide"` to slides
- Applies `aria-hidden="true"` to non-visible slides
- Sets `aria-setsize` and `aria-posinset` for proper slide position information

### Live Region for Announcements

- Creates a visually hidden live region for screen reader announcements
- Announces the current slide position when navigation occurs
- Uses customizable announcement templates

### Respecting User Attributes

- Detects existing ARIA attributes provided by the user before initialization
- Preserves these attributes instead of overriding them
- Only updates dynamic attributes like `aria-hidden` as needed

### Development Warnings

In development mode, the plugin provides helpful console warnings for accessibility improvements:

- Warns when no accessible name (label) is provided for the carousel
- Suggests adding descriptive labels to slides
- Can be disabled in production or via options

## Best Practices for Accessible Carousels

For maximum accessibility, we recommend:

1. **Provide meaningful labels**: Use the `carouselLabel` option or add `aria-label` attributes to your carousel and slides with descriptive content.

```html
<div class="embla" aria-label="Featured products">
  <div class="embla__container">
    <div class="embla__slide" aria-label="Red summer dress, $49.99">...</div>
    <div class="embla__slide" aria-label="Blue winter coat, $89.99">...</div>
  </div>
</div>
```

2. **Add accessible navigation controls**: Include Previous/Next buttons with proper labels.

```html
<button class="embla__prev" aria-label="Previous slide">Prev</button>
<div class="embla">...</div>
<button class="embla__next" aria-label="Next slide">Next</button>
```

3. **Pause autoplay on interaction**: If using autoplay, pause it when users interact with the carousel.

```js
const options = {
  loop: true,
  autoplay: true,
};

const embla = EmblaCarousel(emblaNode, options, [A11y()]);

// Pause autoplay on focus within the carousel
emblaNode.addEventListener("focusin", () => {
  embla.plugins().autoplay.stop();
});

// Resume when focus leaves
emblaNode.addEventListener("focusout", (event) => {
  if (!emblaNode.contains(event.relatedTarget)) {
    embla.plugins().autoplay.play();
  }
});
```

## Why Accessibility Matters

Making your carousel accessible ensures that:

- Users with screen readers can understand and navigate your content
- Keyboard-only users can access all carousel features
- Your site complies with accessibility standards like WCAG
- You reach a wider audience, including people with disabilities

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
