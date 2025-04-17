import EmblaCarousel from "embla-carousel";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import A11y from "../";

describe("A11y Plugin", () => {
  let container: HTMLElement;
  let slides: HTMLElement[];
  let embla: ReturnType<typeof EmblaCarousel>;
  let originalConsoleWarn: typeof console.warn;

  // Silence console warnings globally for all tests
  beforeAll(() => {
    originalConsoleWarn = console.warn;
    console.warn = vi.fn();
  });

  afterAll(() => {
    // Restore original console.warn
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    // Create DOM elements for testing
    document.body.innerHTML = `
      <div class="embla">
        <div class="embla__container">
          <div class="embla__slide">Slide 1</div>
          <div class="embla__slide">Slide 2</div>
          <div class="embla__slide">Slide 3</div>
        </div>
      </div>
    `;

    container = document.querySelector(".embla")!;
    slides = Array.from(document.querySelectorAll(".embla__slide"));

    // Mock process.env.NODE_ENV to simulate production/development
    vi.stubGlobal("process", { env: { NODE_ENV: "development" } });

    // Clear warning mocks between tests
    vi.mocked(console.warn).mockClear();
  });

  afterEach(() => {
    embla?.destroy();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("should apply correct ARIA attributes to carousel elements", () => {
    embla = EmblaCarousel(container, {}, [A11y()]);

    // Check root element
    expect(container.getAttribute("role")).toBe("region");
    expect(container.getAttribute("aria-roledescription")).toBe("carousel");
    expect(container.getAttribute("aria-label")).toBe("Carousel");

    // Check slides
    slides.forEach((slide, index) => {
      expect(slide.getAttribute("role")).toBe("group");
      expect(slide.getAttribute("aria-roledescription")).toBe("slide");
      expect(slide.getAttribute("aria-label")).toBe(
        `Slide ${index + 1} of ${slides.length}`,
      );
      expect(slide.getAttribute("aria-setsize")).toBe(`${slides.length}`);
      expect(slide.getAttribute("aria-posinset")).toBe(`${index + 1}`);
    });

    // First slide should be visible, others hidden
    expect(slides[0].getAttribute("aria-hidden")).toBe("false");
    expect(slides[1].getAttribute("aria-hidden")).toBe("true");
    expect(slides[2].getAttribute("aria-hidden")).toBe("true");
  });

  it("should use custom label when provided", () => {
    embla = EmblaCarousel(container, {}, [
      A11y({ carouselLabel: "Test Carousel" }),
    ]);

    expect(container.getAttribute("aria-label")).toBe("Test Carousel");
  });

  it("should respect existing aria-label", () => {
    container.setAttribute("aria-label", "Existing Label");
    embla = EmblaCarousel(container, {}, [A11y()]);

    expect(container.getAttribute("aria-label")).toBe("Existing Label");
  });

  it("should create a live region for announcements", () => {
    embla = EmblaCarousel(container, {}, [A11y()]);

    const liveRegion = container.querySelector(".embla__live-region");
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute("aria-live")).toBe("polite");
    expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
  });

  it("should update aria-hidden when slide changes", () => {
    embla = EmblaCarousel(container, {}, [A11y()]);
    const a11yPlugin = embla.plugins().a11y;

    // Initially first slide is visible
    expect(slides[0].getAttribute("aria-hidden")).toBe("false");
    expect(slides[1].getAttribute("aria-hidden")).toBe("true");

    // Manually simulate changing to the second slide
    // We need to mock this because scrollNext() doesn't work in jsdom/happy-dom
    vi.spyOn(embla, "selectedScrollSnap").mockReturnValue(1);
    a11yPlugin.update();

    // Now second slide should be visible
    expect(slides[0].getAttribute("aria-hidden")).toBe("true");
    expect(slides[1].getAttribute("aria-hidden")).toBe("false");
  });

  it("should announce slide changes", () => {
    embla = EmblaCarousel(container, {}, [A11y()]);
    const a11yPlugin = embla.plugins().a11y;
    const liveRegion = container.querySelector(".embla__live-region")!;

    // Initial announcement
    expect(liveRegion.textContent).toBe("Slide 1 of 3");

    // Manually simulate changing to the second slide
    vi.spyOn(embla, "selectedScrollSnap").mockReturnValue(1);
    a11yPlugin.update();

    // Check updated announcement
    expect(liveRegion.textContent).toBe("Slide 2 of 3");
  });

  it("should use custom announcement template when provided", () => {
    embla = EmblaCarousel(container, {}, [
      A11y({
        slideAnnouncementTemplate: "Page {{currentSlide}} of {{totalSlides}}",
      }),
    ]);

    const liveRegion = container.querySelector(".embla__live-region")!;

    // Should use custom template
    expect(liveRegion.textContent).toBe("Page 1 of 3");
  });

  it("should disable announcements when announceSlideChanges is false", () => {
    const spy = vi.spyOn(HTMLElement.prototype, "textContent", "set");

    embla = EmblaCarousel(container, {}, [
      A11y({ announceSlideChanges: false }),
    ]);
    const a11yPlugin = embla.plugins().a11y;

    // Clear any previous calls
    spy.mockClear();

    // Manually simulate changing to the next slide
    vi.spyOn(embla, "selectedScrollSnap").mockReturnValue(1);
    a11yPlugin.update();

    // The live region should not be updated
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("should remove all ARIA attributes and live region on destroy", () => {
    embla = EmblaCarousel(container, {}, [A11y()]);

    // Verify live region exists
    expect(container.querySelector(".embla__live-region")).not.toBeNull();

    // Destroy carousel
    embla.destroy();

    // Live region should be removed
    expect(container.querySelector(".embla__live-region")).toBeNull();
  });

  // New tests for respecting user-provided attributes

  it("should respect user-provided aria-roledescription on slides", () => {
    // Prepare: Set custom roledescription on a slide
    slides[1].setAttribute("aria-roledescription", "custom slide");

    embla = EmblaCarousel(container, {}, [A11y()]);

    // Should respect user's attribute
    expect(slides[0].getAttribute("aria-roledescription")).toBe("slide");
    expect(slides[1].getAttribute("aria-roledescription")).toBe("custom slide");
  });

  it("should respect user-provided role attributes", () => {
    // Prepare: Set custom role on a slide
    slides[1].setAttribute("role", "custom-role");

    embla = EmblaCarousel(container, {}, [A11y()]);

    // Should respect user's attribute
    expect(slides[0].getAttribute("role")).toBe("group");
    expect(slides[1].getAttribute("role")).toBe("custom-role");
  });

  it("should always set aria-hidden, even if user provided it", () => {
    // Prepare: Set initial aria-hidden attributes
    slides[0].setAttribute("aria-hidden", "true"); // This should be changed
    slides[1].setAttribute("aria-hidden", "false"); // This should be changed

    embla = EmblaCarousel(container, {}, [A11y()]);

    // aria-hidden should be set based on the carousel state, regardless of initial values
    expect(slides[0].getAttribute("aria-hidden")).toBe("false");
    expect(slides[1].getAttribute("aria-hidden")).toBe("true");
  });

  // Tests for developer warnings

  it("should warn in development mode when no accessible names are provided", () => {
    embla = EmblaCarousel(container, {}, [A11y()]);

    // Should show warnings about labels
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("No accessible name provided for carousel"),
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Slides should have descriptive labels"),
    );
  });

  it("should not show warnings when showDeveloperWarnings is false", () => {
    embla = EmblaCarousel(container, {}, [
      A11y({ showDeveloperWarnings: false }),
    ]);

    // Should not warn when disabled
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("should not show warnings in production mode", () => {
    // Set NODE_ENV to production
    vi.stubGlobal("process", { env: { NODE_ENV: "production" } });

    embla = EmblaCarousel(container, {}, [A11y()]);

    // Should not warn in production
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("should not show warnings when appropriate labels are provided", () => {
    // Add proper labels
    container.setAttribute("aria-label", "Product Gallery");
    slides.forEach((slide, index) => {
      slide.setAttribute("aria-label", `Product ${index + 1}`);
    });

    embla = EmblaCarousel(container, {}, [A11y()]);

    // Should only warn about navigation, not about labels
    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("No accessible name provided for carousel"),
    );
    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("Slides should have descriptive labels"),
    );
  });
});
