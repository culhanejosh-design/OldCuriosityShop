/* JavaScript for the image slider */
let current = 0;
const slides = document.querySelectorAll('.slide');
const total = slides.length;
document.querySelector('.next').addEventListener('click', () => changeSlide(current + 1));
document.querySelector('.prev').addEventListener('click', () => changeSlide(current - 1));
function changeSlide(index) {
 slides[current].classList.remove('active');
 current = (index + total) % total;
 slides[current].classList.add('active');
}
setInterval(() => changeSlide(current + 1), 4000);