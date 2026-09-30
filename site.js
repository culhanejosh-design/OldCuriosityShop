/* ========================================
   IMAGE SLIDER
======================================== */

const slider = document.querySelector('.slider');

if (slider) {
    const slides = slider.querySelectorAll('.slide');
    let current = 0;
    let timer;

    function changeSlide(index) {
        if (!slides.length) return;

        slides[current].classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
    }

    function pauseSlider() {
        clearInterval(timer);
    }

    function startSlider() {
        pauseSlider();

        if (slides.length > 1) {
            timer = setInterval(() => {
                changeSlide(current + 1);
            }, 4000);
        }
    }

    slider.querySelector('.next')?.addEventListener('click', () => {
        changeSlide(current + 1);
    });

    slider.querySelector('.prev')?.addEventListener('click', () => {
        changeSlide(current - 1);
    });

    // Pause while the mouse is over the slider.
    slider.addEventListener('mouseenter', pauseSlider);

    slider.addEventListener('mouseleave', () => {
        if (!slider.contains(document.activeElement)) {
            startSlider();
        }
    });

    // Also pause while a keyboard user is using its buttons.
    slider.addEventListener('focusin', pauseSlider);

    slider.addEventListener('focusout', (event) => {
        if (!slider.contains(event.relatedTarget)
            && !slider.matches(':hover')) {
            startSlider();
        }
    });

    startSlider();
}


/* ========================================
   SECTION 1: SCROLL-TO-TOP BUTTON
======================================== */

const backToTop = document.getElementById('back-to-top');

const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
);

if (backToTop) {
    function updateButton() {
        const visible = window.scrollY > 300;

        backToTop.classList.toggle('show', visible);
        backToTop.disabled = !visible;
    }

    window.addEventListener('scroll', updateButton, {
        passive: true
    });

    updateButton();

    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: reducedMotion.matches ? 'instant' : 'smooth'
        });

        document.querySelector('.site-header h1')?.focus({
            preventScroll: true
        });
    });
}


/* ========================================
   SECTION 2: SCROLL REVEAL ANIMATIONS
======================================== */

if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('reveal-pending');

                // Reveal each section only once.
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.reveal').forEach((element) => {
        element.classList.add('reveal-pending');
        observer.observe(element);
    });
}


/* ========================================
   SECTION 3: BAILEY ISLAND WEATHER API
======================================== */

const weatherDetails = document.getElementById('weather-details');
const refreshWeather = document.getElementById('refresh-weather');

async function loadWeather() {
    if (!weatherDetails) return;

    weatherDetails.textContent = 'Loading coastal weather...';

    if (refreshWeather) {
        refreshWeather.disabled = true;
    }

    const controller = new AbortController();

    // Stop the request if it takes longer than 10 seconds.
    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    try {
        const url = 'https://api.open-meteo.com/v1/forecast'
            + '?latitude=43.735&longitude=-69.995'
            + '&current=temperature_2m,wind_speed_10m'
            + '&temperature_unit=fahrenheit&wind_speed_unit=mph'
            + '&timezone=America%2FNew_York';

        const response = await fetch(url, {
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error('Weather request failed');
        }

        const data = await response.json();
        const weather = data.current;

        if (!weather
            || !Number.isFinite(weather.temperature_2m)
            || !Number.isFinite(weather.wind_speed_10m)) {
            throw new Error('Incomplete weather data');
        }

        const temperature = Math.round(weather.temperature_2m);
        const windSpeed = Math.round(weather.wind_speed_10m);

        weatherDetails.textContent =
            `Temperature: ${temperature}°F | Wind: ${windSpeed} mph`;

    } catch (error) {
        weatherDetails.textContent =
            'Weather is unavailable right now. Please try again.';

    } finally {
        clearTimeout(timeout);

        if (refreshWeather) {
            refreshWeather.disabled = false;
        }
    }
}

if (weatherDetails) {
    refreshWeather?.addEventListener('click', loadWeather);
    loadWeather();
}