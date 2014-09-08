
function Favorites () {
	if (localStorage.rappidFavs) {
		this.favs = localStorage.rappidFavs;
	} else {
		this.favs = localStorage.rappidFavs = [];
	}
	this.setupListeners();

};

Favorites.prototype = {
	setupListeners: function () {
		console.log("listener setup");
		var favIcons = document.querySelectorAll(".fav-icon");
		for(var i=0; i < favIcons.length; i++) {
			favIcons[i].addEventListener("click", this.favIconClick.bind(this), false);
		}
	},
	all: function () {
		return this.favs;
	},
	add: function(route) {
		this.favs.push(routes);
	},
	remove: function (route){
		this.favs.pop(route);
	},			
	clear: function () {
		this.favs = [];
	},
	favIconClick: function (evt) {
		evt.preventDefault();
		console.log("clicked ", evt.target);
	}
};

module.exports = Favorites;