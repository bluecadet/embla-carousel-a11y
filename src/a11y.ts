import type { CreatePluginType, EmblaCarouselType } from "embla-carousel";

import { defaultOptions, OptionsType } from "./options";

declare module "embla-carousel" {
  interface EmblaPluginsType {
    a11y: A11yPluginType;
  }

  interface EmblaEventListType {
    a11ySlideChange: "a11y:slideChange";
  }
}

export type A11yPluginType = CreatePluginType<
  {
    update: () => void;
  },
  OptionsType
>;

export type A11yPluginOptionsType = A11yPluginType["options"];

class A11yPlugin implements A11yPluginType {
  readonly name = "a11y";
  readonly options: A11yPluginOptionsType;

  private embla: EmblaCarouselType | null = null;
  private rootElement: HTMLElement | null = null;
  private containerElement: HTMLElement | null = null;
  private slideElements: HTMLElement[] = [];
  private liveRegion: HTMLElement | null = null;
  private cleanupFunctions: (() => void)[] = [];
  private isDevMode: boolean = process.env.NODE_ENV !== "production";
  private userProvidedAttributes = new Map<HTMLElement, Set<string>>();

  constructor(options: A11yPluginOptionsType = {}) {
    this.options = { ...defaultOptions, ...options };
  }

  init(embla: EmblaCarouselType): void {
    this.embla = embla;
    this.rootElement = embla.rootNode();
    this.containerElement = embla.containerNode();
    this.slideElements = embla.slideNodes();

    // Store existing user-provided ARIA attributes before we make any changes
    this.saveUserProvidedAttributes();

    this.setupAriaAttributes();
    this.setupLiveRegion();
    this.setupEventListeners();

    // Initial update
    this.update();
  }

  /**
   * Update ARIA attributes based on current state
   */
  update(): void {
    if (!this.embla) return;

    const selectedIndex = this.embla.selectedScrollSnap();

    // Update slide attributes
    this.slideElements.forEach((slide, index) => {
      // Set aria-hidden on non-visible slides
      this.safeSetAttribute(
        slide,
        "aria-hidden",
        index === selectedIndex ? "false" : "true",
      );

      // Update position in set if user hasn't set these
      if (!this.userHasAttribute(slide, "aria-setsize")) {
        this.safeSetAttribute(
          slide,
          "aria-setsize",
          `${this.slideElements.length}`,
        );
      }

      if (!this.userHasAttribute(slide, "aria-posinset")) {
        this.safeSetAttribute(slide, "aria-posinset", `${index + 1}`);
      }
    });

    // Announce current slide if enabled
    if (this.options.announceSlideChanges) {
      this.announceSlideChange();
    }
  }

  /**
   * Called when the current slide changes
   */
  #onSlideChange(): void {
    this.update();

    if (this.embla) {
      this.embla.emit("a11y:slideChange");
    }
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Execute all cleanup functions
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];

    // Remove live region
    this.liveRegion?.parentElement?.removeChild(this.liveRegion);

    this.embla = null;
    this.rootElement = null;
    this.containerElement = null;
    this.slideElements = [];
    this.liveRegion = null;
    this.userProvidedAttributes.clear();
  }

  /**
   * Store information about which ARIA attributes were provided by the user
   * so we don't override them later
   */
  private saveUserProvidedAttributes(): void {
    const allElements = [this.rootElement, ...this.slideElements].filter(
      Boolean,
    ) as HTMLElement[];

    allElements.forEach((element) => {
      const attributes = new Set<string>();

      // Check for common ARIA attributes
      [
        "aria-label",
        "aria-labelledby",
        "aria-describedby",
        "aria-roledescription",
        "role",
        "aria-setsize",
        "aria-posinset",
      ].forEach((attr) => {
        if (element.hasAttribute(attr)) {
          attributes.add(attr);
        }
      });

      this.userProvidedAttributes.set(element, attributes);
    });
  }

  /**
   * Check if the user has already defined an attribute
   */
  private userHasAttribute(element: HTMLElement, attribute: string): boolean {
    const attributes = this.userProvidedAttributes.get(element);
    return attributes ? attributes.has(attribute) : false;
  }

  /**
   * Set an attribute only if the user hasn't already defined it
   * Returns true if the attribute was set or already existed
   */
  private safeSetAttribute(
    element: HTMLElement,
    attribute: string,
    value: string,
  ): boolean {
    // Always allow updates to aria-hidden as it needs to change with carousel state
    if (
      attribute === "aria-hidden" ||
      !this.userHasAttribute(element, attribute)
    ) {
      element.setAttribute(attribute, value);
      return true;
    }
    return this.userHasAttribute(element, attribute);
  }

  /**
   * Log a developer warning in non-production environments
   */
  private warnDev(message: string): void {
    if (this.isDevMode && this.options.showDeveloperWarnings) {
      console.warn(`[@bluecadet/embla-carousel-a11y]: ${message}`);
    }
  }

  /**
   * Set up ARIA attributes on carousel elements
   */
  private setupAriaAttributes(): void {
    if (!this.rootElement || !this.containerElement) return;

    // Set up carousel container
    const hasRootLabel =
      this.rootElement.hasAttribute("aria-label") ||
      this.rootElement.hasAttribute("aria-labelledby");

    // Set up root element
    this.safeSetAttribute(this.rootElement, "role", "region");
    this.safeSetAttribute(this.rootElement, "aria-roledescription", "carousel");

    // Use custom label if provided, otherwise use existing or set default
    if (this.options.carouselLabel) {
      this.safeSetAttribute(
        this.rootElement,
        "aria-label",
        this.options.carouselLabel,
      );
    } else if (!hasRootLabel) {
      // Set default label only if no label is provided
      this.safeSetAttribute(this.rootElement, "aria-label", "Carousel");

      // Show a warning in dev mode about missing label
      this.warnDev(
        "No accessible name provided for carousel. " +
          "Add an aria-label or aria-labelledby attribute, or use the carouselLabel option. " +
          'Using "Carousel" as a fallback.',
      );
    }

    // Set up slides
    let hasLabelWarningShown = false;

    this.slideElements.forEach((slide, index) => {
      const hasSlideLabel =
        slide.hasAttribute("aria-label") ||
        slide.hasAttribute("aria-labelledby");

      this.safeSetAttribute(slide, "role", "group");
      this.safeSetAttribute(slide, "aria-roledescription", "slide");

      // If slides don't have accessible names, set default
      if (!hasSlideLabel) {
        const defaultLabel = `Slide ${index + 1} of ${this.slideElements.length}`;
        this.safeSetAttribute(slide, "aria-label", defaultLabel);

        // Show a warning for the first slide without a label
        if (
          !hasLabelWarningShown &&
          this.isDevMode &&
          this.options.showDeveloperWarnings
        ) {
          hasLabelWarningShown = true;
          this.warnDev(
            "Slides should have descriptive labels. " +
              "Add aria-label or aria-labelledby attributes to each slide for better accessibility. " +
              `Using "${defaultLabel}" as a fallback.`,
          );
        }
      }
    });
  }

  /**
   * Set up live region for announcements
   */
  private setupLiveRegion(): void {
    if (!this.rootElement) return;

    // Create live region for screen reader announcements
    this.liveRegion = document.createElement("div");
    this.liveRegion.className = "embla__live-region";
    this.liveRegion.setAttribute("aria-live", "polite");
    this.liveRegion.setAttribute("aria-atomic", "true");
    this.liveRegion.style.position = "absolute";
    this.liveRegion.style.width = "1px";
    this.liveRegion.style.height = "1px";
    this.liveRegion.style.overflow = "hidden";
    this.liveRegion.style.clip = "rect(0, 0, 0, 0)";
    this.liveRegion.style.whiteSpace = "nowrap";

    this.rootElement.appendChild(this.liveRegion);
  }

  /**
   * Set up event listeners for carousel
   */
  private setupEventListeners(): void {
    if (!this.embla) return;

    const handleSelect = (): void => {
      this.#onSlideChange();
    };

    // Listen for slide changes
    this.embla.on("select", handleSelect);

    // Add cleanup function
    this.cleanupFunctions.push(() => {
      if (this.embla) {
        this.embla.off("select", handleSelect);
      }
    });
  }

  /**
   * Announce current slide to screen readers
   */
  private announceSlideChange(): void {
    if (!this.embla || !this.liveRegion) return;

    const currentSlide = this.embla.selectedScrollSnap() + 1;
    const totalSlides = this.slideElements.length;

    let announcement = this.options.slideAnnouncementTemplate ?? "";
    announcement = announcement
      .replace("{{currentSlide}}", `${currentSlide}`)
      .replace("{{totalSlides}}", `${totalSlides}`);

    this.liveRegion.textContent = announcement;
  }
}

export default function A11y(
  options: A11yPluginOptionsType = {},
): A11yPluginType {
  return new A11yPlugin(options);
}
