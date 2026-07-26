new Glider(document.querySelector('.review-cards-container'), {
	slidesToShow: 3,
	slidesToScroll: 1,
	draggable: false,
	dots: '.dots',

	arrows: {
		prev: '.left',
		next: '.right',
	},
	duration: 0.6,
});
