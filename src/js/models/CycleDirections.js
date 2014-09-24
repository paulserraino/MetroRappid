var StopCollection = require("./StopCollection");
var when = require("when");
var _ = require("underscore");


module.exports = {
	getDirections: function (start, end) {
		var deferred = when.defer();
		var directionsService = new google.maps.DirectionsService();
		var _start = new google.maps.LatLng(start[0], start[1]);
		var _end = new google.maps.LatLng(end[0], end[1]);
		var request = {
	      	origin: _start,
	      	destination: _end,
	      	travelMode: google.maps.TravelMode.BICYCLING
		};
		directionsService.route(request, function(response, status) {
		    if (status == google.maps.DirectionsStatus.OK) {
		      var points = [];
		      var path = response.routes[0].overview_path;
		      for(var i=0; i < path.length; i++) {
		      	points.push([path[i].k, path[i].B]);
		      }

		      deferred.resolve({
		      	shape: points
		      });

		    } else {
		    	console.error(response);
		    }
		});

		return deferred.promise;
	}
}; 