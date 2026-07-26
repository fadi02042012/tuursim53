const body = document.body,
	header = document.querySelector('.header-wrapper'),
	//header search-box variables
	searchIcon = document.querySelector('.header-search-icon'),
	searchBox = document.querySelector('.header-search-box'),
	//hero play video
	playButton = document.querySelector('.primary-ring'),
	videoBackLayer = document.querySelector('.video-layer'),
	videoClose = document.querySelector('.close-layer');

//On scroll-down hide the navbar
//On scroll-up show the navbar
let lastScroll = 0;
window.addEventListener('scroll', () => {
	let currentScroll = window.pageYOffset;
	console.log(currentScroll);

	if (currentScroll <= 0) {
		header.classList.add('header-scroll-down');
		header.classList.remove('header-scroll-up');
	}
	if (currentScroll > 150) {
		header.classList.add('header-scroll-up');
		header.classList.remove('header-scroll-down');
		searchBox.classList.remove('search-box-scroll-down');
	}
	if (
		currentScroll < lastScroll &&
		!header.classList.contains('header-scroll-down') &&
		currentScroll > 150
	) {
		header.classList.add('header-scroll-down');
		header.classList.remove('header-scroll-up');
	}
	lastScroll = currentScroll;
});

//Header search box scroll up/down
searchIcon.addEventListener('click', () => {
	if (!searchBox.classList.contains('search-box-scroll-down')) {
		searchBox.classList.toggle('search-box-scroll-down');
	} else {
		searchBox.classList.toggle('search-box-scroll-up');
	}
});

//scroll-up the navbar if the hero section is clicked
document.getElementById('hero-section').addEventListener('click', () => {
	if (searchBox.classList.contains('search-box-scroll-down')) {
		searchBox.classList.remove('search-box-scroll-down');
	}
});

//pop up the video when the play button is clicked
playButton.addEventListener('click', () => {
	if (!videoBackLayer.classList.contains('video-layer-active')) {
		videoBackLayer.classList.add('video-layer-active');
		body.classList.add('body-scroll-off');
	}
});
videoClose.addEventListener('click', () => {
	if (videoBackLayer.classList.contains('video-layer-active')) {
		videoBackLayer.classList.remove('video-layer-active');
		body.classList.remove('body-scroll-off');
	}
});
videoBackLayer.addEventListener('click', () => {
	if (videoBackLayer.classList.contains('video-layer-active')) {
		videoBackLayer.classList.remove('video-layer-active');
		body.classList.remove('body-scroll-off');
	}
});
