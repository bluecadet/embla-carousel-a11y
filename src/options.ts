import { CreateOptionsType } from "embla-carousel";

export type OptionsType = CreateOptionsType<{
  /**
   * Specify a custom label for the carousel
   * If not provided, will look for aria-label/aria-labelledby on the root element
   */
  carouselLabel?: string;

  /**
   * The selector for slide elements
   * Default: selects direct children of the carousel container
   */
  slideSelector?: string;

  /**
   * Whether to announce slide changes to screen readers
   * Default: true
   */
  announceSlideChanges?: boolean;

  /**
   * Custom announcement template for slide changes
   * Variables: {{currentSlide}}, {{totalSlides}}
   * Default: "Slide {{currentSlide}} of {{totalSlides}}"
   */
  slideAnnouncementTemplate?: string;

  /**
   * Show developer console warnings about accessibility improvements
   * Only shown in development mode (process.env.NODE_ENV !== 'production')
   * Default: true
   */
  showDeveloperWarnings?: boolean;
}>;

export const defaultOptions: OptionsType = {
  active: true,
  breakpoints: {},
  carouselLabel: undefined,
  slideSelector: undefined,
  announceSlideChanges: true,
  slideAnnouncementTemplate: "Slide {{currentSlide}} of {{totalSlides}}",
  showDeveloperWarnings: true,
};
