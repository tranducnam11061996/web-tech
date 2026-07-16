(function initializeHomepageCarouselModule() {
  "use strict";

  var activeControllers = [];

  function destroy() {
    activeControllers.forEach(function destroyController(controller) {
      controller.destroy();
    });
    activeControllers = [];
  }

  function createTrackController(track) {
    if (track.id === "heroTrack" || track.children.length === 0) return null;

    var container = track.closest('.carousel-wrapper, .carousel-container, [id="carouselContainer"]') || track.parentElement;
    if (!container) return null;

    var section = container.closest("section") || container.parentElement;
    if (!section) return null;

    var prevBtn = section.querySelector('#prevBtn, .prev-btn, button[aria-label="Previous"], button[aria-label="previous"]');
    var nextBtn = section.querySelector('#nextBtn, .next-btn, button[aria-label="Next"], button[aria-label="next"]');
    var dots = section.querySelectorAll(".indicator-dot");

    var cardWidth = 0;
    var autoSlideInterval = null;
    var AUTO_SLIDE_DELAY = 3000;
    var isAnimating = false;
    var currentTranslate = 0;
    var isDestroyed = false;
    var resizeTimeout = null;
    var initTimeout = null;
    var animationTimeouts = [];

    var originalChildren = Array.from(track.children);
    var totalOriginal = originalChildren.length;
    var originalIndexes = originalChildren.map(function readOriginalIndex(child) {
      return child.dataset.originalIndex;
    });
    var originalTransition = track.style.transition;
    var originalTransform = track.style.transform;
    var originallyDragging = track.classList.contains("dragging");
    var originalDotStates = Array.from(dots).map(function readDotState(dot) {
      return dot.classList.contains("active");
    });

    originalChildren.forEach(function setOriginalIndex(child, index) {
      child.dataset.originalIndex = index;
    });

    function getCardWidth() {
      var firstCard = track.children[0];
      if (!firstCard) return 0;
      var style = window.getComputedStyle(track);
      var gap = parseInt(style.gap) || parseInt(style.columnGap) || 16;
      return firstCard.offsetWidth + gap;
    }

    function getVisibleCards() {
      if (cardWidth === 0) return 1;
      return Math.floor(container.offsetWidth / cardWidth);
    }

    function updateDots() {
      if (dots.length === 0 || track.children.length < 2) return;
      var visibleCard = track.children[1];
      if (!visibleCard) return;
      var originalIndex = parseInt(visibleCard.dataset.originalIndex);

      var dotIndex = originalIndex;
      if (dots.length < totalOriginal) {
        dotIndex = Math.floor((originalIndex / totalOriginal) * dots.length);
      }
      dots.forEach(function updateDot(dot, index) {
        dot.classList.toggle("active", index === dotIndex);
      });
    }

    function initLoop() {
      if (isDestroyed) return;
      cardWidth = getCardWidth();
      if (cardWidth === 0) return;

      var visibleCards = getVisibleCards();
      if (track.children.length <= visibleCards + 1) {
        originalChildren.forEach(function cloneOriginalChild(child) {
          var clone = child.cloneNode(true);
          clone.classList.add("cloned-item");
          track.appendChild(clone);
        });
      }

      if (track.children.length > 1) {
        track.style.transition = "none";
        track.prepend(track.lastElementChild);
        currentTranslate = -cardWidth;
        track.style.transform = "translateX(" + currentTranslate + "px)";
        updateDots();
      }
    }

    function rememberAnimationTimeout(callback, delay) {
      var timeout = window.setTimeout(function runAnimationTimeout() {
        animationTimeouts = animationTimeouts.filter(function keepOtherTimeout(candidate) {
          return candidate !== timeout;
        });
        if (!isDestroyed) callback();
      }, delay);
      animationTimeouts.push(timeout);
    }

    function goNext() {
      if (isAnimating || track.children.length < 2) return;
      isAnimating = true;
      cardWidth = getCardWidth();

      track.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
      track.style.transform = "translateX(-" + cardWidth * 2 + "px)";

      rememberAnimationTimeout(function completeNext() {
        track.style.transition = "none";
        track.appendChild(track.firstElementChild);
        currentTranslate = -cardWidth;
        track.style.transform = "translateX(" + currentTranslate + "px)";
        updateDots();
        isAnimating = false;
      }, 400);
    }

    function goPrev() {
      if (isAnimating || track.children.length < 2) return;
      isAnimating = true;
      cardWidth = getCardWidth();

      track.style.transition = "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)";
      track.style.transform = "translateX(0px)";

      rememberAnimationTimeout(function completePrevious() {
        track.style.transition = "none";
        track.prepend(track.lastElementChild);
        currentTranslate = -cardWidth;
        track.style.transform = "translateX(" + currentTranslate + "px)";
        updateDots();
        isAnimating = false;
      }, 400);
    }

    function stopAutoSlide() {
      if (autoSlideInterval) {
        window.clearInterval(autoSlideInterval);
        autoSlideInterval = null;
      }
    }

    function startAutoSlide() {
      stopAutoSlide();
      autoSlideInterval = window.setInterval(goNext, AUTO_SLIDE_DELAY);
    }

    function handlePreviousClick(event) {
      event.preventDefault();
      goPrev();
      startAutoSlide();
    }

    function handleNextClick(event) {
      event.preventDefault();
      goNext();
      startAutoSlide();
    }

    if (prevBtn) prevBtn.addEventListener("click", handlePreviousClick);
    if (nextBtn) nextBtn.addEventListener("click", handleNextClick);

    var dotHandlers = [];
    if (dots.length > 0) {
      dots.forEach(function bindDot(dot, index) {
        function handleDotClick() {
          if (isAnimating || track.children.length < 2) return;

          var targetOriginalIndex = index;
          if (dots.length < totalOriginal) {
            targetOriginalIndex = Math.floor((index / (dots.length - 1)) * (totalOriginal - 1));
          }

          var visibleCard = track.children[1];
          if (!visibleCard) return;
          var currentOriginalIndex = parseInt(visibleCard.dataset.originalIndex);
          var steps = targetOriginalIndex - currentOriginalIndex;
          if (steps === 0) return;

          stopAutoSlide();
          track.style.transition = "none";

          if (steps > 0) {
            for (var forwardStep = 0; forwardStep < steps; forwardStep += 1) {
              track.appendChild(track.firstElementChild);
            }
          } else {
            for (var backwardStep = 0; backwardStep < -steps; backwardStep += 1) {
              track.prepend(track.lastElementChild);
            }
          }

          updateDots();
          startAutoSlide();
        }

        dot.addEventListener("click", handleDotClick);
        dotHandlers.push({ dot: dot, handler: handleDotClick });
      });
    }

    var isDragging = false;
    var startX = 0;
    var dragDiff = 0;
    var suppressClick = false;
    var clickSuppressionTimeout = null;

    function handleTrackClick(event) {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      if (clickSuppressionTimeout) {
        window.clearTimeout(clickSuppressionTimeout);
        clickSuppressionTimeout = null;
      }
    }

    function dragStart(event) {
      if (event.target.closest("a") && event.type === "mousedown") {
        event.preventDefault();
      }
      if (isAnimating || track.children.length < 2) return;
      suppressClick = false;
      if (clickSuppressionTimeout) {
        window.clearTimeout(clickSuppressionTimeout);
        clickSuppressionTimeout = null;
      }
      isDragging = true;
      track.style.transition = "none";
      track.classList.add("dragging");
      stopAutoSlide();
      startX = event.type.includes("mouse") ? event.clientX : event.touches[0].clientX;
      cardWidth = getCardWidth();
      dragDiff = 0;
    }

    function dragMove(event) {
      if (!isDragging) return;
      var x = event.type.includes("mouse") ? event.clientX : event.touches[0].clientX;
      dragDiff = x - startX;
      if (Math.abs(dragDiff) > 4) suppressClick = true;
      track.style.transform = "translateX(" + (currentTranslate + dragDiff) + "px)";
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove("dragging");

      var threshold = cardWidth * 0.2;

      if (dragDiff < -threshold) {
        goNext();
      } else if (dragDiff > threshold) {
        goPrev();
      } else {
        track.style.transition = "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)";
        track.style.transform = "translateX(" + currentTranslate + "px)";
      }

      if (suppressClick) {
        clickSuppressionTimeout = window.setTimeout(function releaseSuppressedClick() {
          suppressClick = false;
          clickSuppressionTimeout = null;
        }, 500);
      }

      startAutoSlide();
    }

    function handleResize() {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(function resizeCarousel() {
        if (isDestroyed) return;
        cardWidth = getCardWidth();
        if (track.children.length > 1) {
          track.style.transition = "none";
          currentTranslate = -cardWidth;
          track.style.transform = "translateX(" + currentTranslate + "px)";
        }
      }, 100);
    }

    track.addEventListener("mousedown", dragStart);
    track.addEventListener("touchstart", dragStart, { passive: true });
    track.addEventListener("click", handleTrackClick, true);
    window.addEventListener("mousemove", dragMove);
    window.addEventListener("touchmove", dragMove, { passive: true });
    window.addEventListener("mouseup", dragEnd);
    window.addEventListener("touchend", dragEnd);
    container.addEventListener("mouseenter", stopAutoSlide);
    container.addEventListener("mouseleave", startAutoSlide);
    track.addEventListener("touchstart", stopAutoSlide, { passive: true });
    track.addEventListener("touchend", startAutoSlide, { passive: true });
    window.addEventListener("resize", handleResize);

    initTimeout = window.setTimeout(function initializeLoopAndTimer() {
      initTimeout = null;
      initLoop();
      startAutoSlide();
    }, 100);

    return {
      destroy: function destroyTrackController() {
        if (isDestroyed) return;
        isDestroyed = true;
        stopAutoSlide();
        if (initTimeout) window.clearTimeout(initTimeout);
        if (resizeTimeout) window.clearTimeout(resizeTimeout);
        if (clickSuppressionTimeout) window.clearTimeout(clickSuppressionTimeout);
        animationTimeouts.forEach(function clearAnimationTimeout(timeout) {
          window.clearTimeout(timeout);
        });
        animationTimeouts = [];

        if (prevBtn) prevBtn.removeEventListener("click", handlePreviousClick);
        if (nextBtn) nextBtn.removeEventListener("click", handleNextClick);
        dotHandlers.forEach(function unbindDot(binding) {
          binding.dot.removeEventListener("click", binding.handler);
        });
        track.removeEventListener("mousedown", dragStart);
        track.removeEventListener("touchstart", dragStart);
        track.removeEventListener("click", handleTrackClick, true);
        window.removeEventListener("mousemove", dragMove);
        window.removeEventListener("touchmove", dragMove);
        window.removeEventListener("mouseup", dragEnd);
        window.removeEventListener("touchend", dragEnd);
        container.removeEventListener("mouseenter", stopAutoSlide);
        container.removeEventListener("mouseleave", startAutoSlide);
        track.removeEventListener("touchstart", stopAutoSlide);
        track.removeEventListener("touchend", startAutoSlide);
        window.removeEventListener("resize", handleResize);

        track.querySelectorAll(".cloned-item").forEach(function removeClone(clone) {
          clone.remove();
        });
        originalChildren.forEach(function restoreChild(child, index) {
          track.appendChild(child);
          if (originalIndexes[index] === undefined) delete child.dataset.originalIndex;
          else child.dataset.originalIndex = originalIndexes[index];
        });
        track.style.transition = originalTransition;
        track.style.transform = originalTransform;
        track.classList.toggle("dragging", originallyDragging);
        dots.forEach(function restoreDot(dot, index) {
          dot.classList.toggle("active", originalDotStates[index]);
        });
      },
    };
  }

  function init(root) {
    destroy();
    var scope = root && typeof root.querySelectorAll === "function" ? root : document;
    scope.querySelectorAll(".carousel-track").forEach(function initializeTrack(track) {
      var controller = createTrackController(track);
      if (controller) activeControllers.push(controller);
    });
  }

  window.HacomHomepageCarousel = {
    init: init,
    destroy: destroy,
  };
})();
