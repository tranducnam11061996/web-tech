"use client";

import { useEffect, useRef } from "react";

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const HEIGHT_EPSILON_PX = 1;
const MAX_PENDING_MEASUREMENT_FRAMES = 60;
const PREVIEW_HEIGHT_PROPERTY = "--product-specifications-preview-height";
const STICKY_BOUNDARY_HEIGHT_PROPERTY = "--product-specifications-sticky-boundary-height";
const STICKY_TOP_PROPERTY = "--product-specifications-sticky-top";
const STICKY_TOP_OFFSET_PX = 24;
const DESKTOP_STICKY_TOP_PX = 110;

interface ProductSpecificationsHeightControllerProps {
  productKey: string;
}

export default function ProductSpecificationsHeightController({
  productKey,
}: ProductSpecificationsHeightControllerProps) {
  const controllerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controller = controllerRef.current;
    const initialPreview = controller?.closest<HTMLElement>("#specCol");
    if (!controller || !initialPreview) return;

    const measurementRegion = initialPreview.closest<HTMLElement>("#content-sanpham") ?? initialPreview;
    const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);

    let animationFrame: number | null = null;
    let pendingMeasurementFrames = 0;
    let collapsedChromeHeight: number | null = null;
    let collapsedMaxHeightRatio: number | null = null;
    let lastCollapsedHeight: number | null = null;
    let measuredDescriptionContent: HTMLElement | null = null;
    let observedNaturalSpecifications: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const readCollapsedDescriptionHeight = (columnHeight: number | null) => {
      const descriptionColumn = document.getElementById("cot-motasanpham");
      if (!descriptionColumn) return null;

      const descriptionDisclosure = descriptionColumn.querySelector<HTMLElement>(
        ".product-description-disclosure",
      );
      const descriptionContent = descriptionColumn.querySelector<HTMLElement>(
        ".product-description-content",
      );
      const measuredColumnHeight = columnHeight ?? descriptionColumn.getBoundingClientRect().height;

      if (!descriptionDisclosure || !descriptionContent) return measuredColumnHeight;

      if (descriptionContent !== measuredDescriptionContent) {
        measuredDescriptionContent = descriptionContent;
        collapsedChromeHeight = null;
        collapsedMaxHeightRatio = null;
        lastCollapsedHeight = null;
      }

      const contentHeight = descriptionContent.getBoundingClientRect().height;
      const isExpanded = descriptionDisclosure.dataset.expanded === "true";

      if (!isExpanded) {
        const computedMaxHeight = Number.parseFloat(
          window.getComputedStyle(descriptionContent).maxHeight,
        );

        if (Number.isFinite(computedMaxHeight) && window.innerHeight > 0) {
          collapsedMaxHeightRatio = computedMaxHeight / window.innerHeight;
        }

        collapsedChromeHeight = Math.max(0, measuredColumnHeight - contentHeight);
        lastCollapsedHeight = measuredColumnHeight;
        return measuredColumnHeight;
      }

      if (collapsedChromeHeight !== null && collapsedMaxHeightRatio !== null) {
        const collapsedContentHeight = Math.min(
          descriptionContent.scrollHeight,
          window.innerHeight * collapsedMaxHeightRatio,
        );
        lastCollapsedHeight = collapsedContentHeight + collapsedChromeHeight;
      }

      return lastCollapsedHeight;
    };

    const writePreviewState = (
      preview: HTMLElement,
      state: "pending" | "clipped" | "full",
      height?: number,
    ) => {
      if (state === "clipped" && height !== undefined) {
        preview.style.setProperty(PREVIEW_HEIGHT_PROPERTY, `${height}px`);
      } else {
        preview.style.removeProperty(PREVIEW_HEIGHT_PROPERTY);
      }
      preview.dataset.previewState = state;
    };

    const writeStickyBoundaryHeight = (height: number | null) => {
      const specificationsColumn = document.getElementById("cot-thongsokythuat");
      if (!specificationsColumn) return;

      if (height !== null && height > HEIGHT_EPSILON_PX) {
        specificationsColumn.style.setProperty(STICKY_BOUNDARY_HEIGHT_PROPERTY, `${height}px`);
      } else {
        specificationsColumn.style.removeProperty(STICKY_BOUNDARY_HEIGHT_PROPERTY);
      }
    };

    const syncStickyTop = () => {
      const specificationsColumn = document.getElementById("cot-thongsokythuat");
      const stickyContainer = specificationsColumn?.querySelector<HTMLElement>(
        ".product-specifications-sticky",
      );
      if (!stickyContainer) return;

      if (!desktopMedia.matches) {
        stickyContainer.style.removeProperty(STICKY_TOP_PROPERTY);
        return;
      }

      stickyContainer.style.setProperty(STICKY_TOP_PROPERTY, `${DESKTOP_STICKY_TOP_PX}px`);
    };

    const measure = () => {
      const preview = controller.closest<HTMLElement>("#specCol");
      const naturalSpecifications = preview?.querySelector<HTMLElement>(
        "[data-specifications-natural-content]",
      );
      if (!preview || !naturalSpecifications) return;

      syncStickyTop();

      if (resizeObserver && naturalSpecifications !== observedNaturalSpecifications) {
        if (observedNaturalSpecifications) resizeObserver.unobserve(observedNaturalSpecifications);
        observedNaturalSpecifications = naturalSpecifications;
        resizeObserver.observe(naturalSpecifications);
      }

      if (!desktopMedia.matches) {
        pendingMeasurementFrames = 0;
        writeStickyBoundaryHeight(null);
        writePreviewState(preview, "pending");
        return;
      }

      const descriptionColumn = document.getElementById("cot-motasanpham");
      const currentDescriptionHeight = descriptionColumn
        ? descriptionColumn.getBoundingClientRect().height
        : null;
      const collapsedDescriptionHeight = readCollapsedDescriptionHeight(currentDescriptionHeight);
      const naturalSpecificationsHeight = naturalSpecifications.getBoundingClientRect().height;

      if (
        (collapsedDescriptionHeight !== null && collapsedDescriptionHeight <= HEIGHT_EPSILON_PX) ||
        naturalSpecificationsHeight <= HEIGHT_EPSILON_PX
      ) {
        writeStickyBoundaryHeight(null);
        writePreviewState(preview, "pending");
        if (pendingMeasurementFrames < MAX_PENDING_MEASUREMENT_FRAMES) {
          pendingMeasurementFrames += 1;
          scheduleMeasurement();
        }
        return;
      }

      pendingMeasurementFrames = 0;

      const previewState = (
        collapsedDescriptionHeight === null ||
        naturalSpecificationsHeight <= collapsedDescriptionHeight + HEIGHT_EPSILON_PX
      ) ? "full" : "clipped";
      const visiblePreviewHeight = previewState === "clipped"
        ? collapsedDescriptionHeight!
        : naturalSpecificationsHeight;
      const stickyBoundaryHeight = currentDescriptionHeight === null
        ? null
        : Math.max(
            currentDescriptionHeight,
            visiblePreviewHeight + STICKY_TOP_OFFSET_PX,
          );

      writeStickyBoundaryHeight(stickyBoundaryHeight);

      writePreviewState(
        preview,
        previewState,
        previewState === "clipped" ? collapsedDescriptionHeight! : undefined,
      );
    };

    const scheduleMeasurement = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        measure();
      });
    };

    resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(measurementRegion);

    const mutationObserver = new MutationObserver(scheduleMeasurement);
    mutationObserver.observe(measurementRegion, {
      attributes: true,
      attributeFilter: ["data-expanded"],
      childList: true,
      subtree: true,
    });

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) scheduleMeasurement();
    });
    intersectionObserver.observe(measurementRegion);

    desktopMedia.addEventListener("change", scheduleMeasurement);
    window.addEventListener("resize", scheduleMeasurement, { passive: true });
    scheduleMeasurement();

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      writeStickyBoundaryHeight(null);
      document
        .querySelector<HTMLElement>(".product-specifications-sticky")
        ?.style.removeProperty(STICKY_TOP_PROPERTY);
      desktopMedia.removeEventListener("change", scheduleMeasurement);
      window.removeEventListener("resize", scheduleMeasurement);
    };
  }, [productKey]);

  return <span ref={controllerRef} hidden aria-hidden="true" />;
}
