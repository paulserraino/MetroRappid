var ko = require('knockout');
var L = require('leaflet');
var when = require('when');
var NProgress = require('NProgress');
var LocateControl = require('./LocateControl');
var RoutesCollection = require('./models/RoutesCollection');
var VehicleCollection = require('./models/VehicleCollection');
var Shape = require('./models/Shape');
var StopCollection = require('./models/StopCollection');
var config = require('./config');
var CycleDirections = require('./models/CycleDirections');

var CapMetroAPIError = config.errors.CapMetroAPIError();

function CycleRappid() {
    // leaflet
    this.map = null;
    this.latlng = {lat: null, lng: null};
    // route shape and stops go on rappid.routeLayer
    // vehicles go on rappid.vehicles.layer
    this.routeLayer = null;
    this.bikeLayer = null;

    // data
    this.vehicles = null;
    this.shape = null;
    this.closestStop = null;

    // viewmodels
    this.availableRoutes = ko.observableArray();
    this.route = ko.observable();
    this.stops = ko.observableArray();

    // options
    this.includeList = ko.observable(true);
    this.includeMap = ko.observable(true);
    this.includeToggleBtn = ko.computed(function() {
        return !this.includeList() || !this.includeMap();
    }.bind(this));

}

CycleRappid.prototype = {
    start: function() {
        NProgress.configure({ showSpinner: false });

        this.resize();
        this.setupMap();

        RoutesCollection.fetch()
            .tap(function(routes) {
                this.availableRoutes(routes);

                var cachedRoute = JSON.parse(localStorage.getItem('rappid:route')),
                    defaultRoute = this.availableRoutes()[0];

                if (cachedRoute) {
                    defaultRoute = this.availableRoutes().filter(function(r) { return cachedRoute.id === r.id && cachedRoute.direction === r.direction; })[0];
                }

                this.route(defaultRoute);
            }.bind(this))
            .then(this.selectRoute.bind(this))
            .catch(console.error);
    },
    refresh: function() {
        NProgress.done();

        //this.refreshTimeout = setTimeout(this.refresh.bind(this), config.REFRESH_INTERVAL);
        // refresh on mobile unlock/maximize
        // don't bind until the first refresh is done unless you want a world of race conditions with the animations ;_;
        window.addEventListener('pageshow', this.refresh.bind(this));
      

        
    },
    setupMap: function() {
        var tileLayer,
            zoomCtrl,
            locateCtrl;

        this.map = L.map('map', {zoomControl: false,});
        this.map.setView([30.267153, -97.743061], 15);

        tileLayer = L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '<a href="http://openstreetmap.org">OpenStreetMap</a> | <a href="http://mapbox.com">Mapbox</a>',
            id: 'examples.map-i87786ca'
        });

        zoomCtrl = new L.Control.Zoom({position: 'bottomright'});

        locateCtrl = new LocateControl({
            position: 'bottomright',
            zoomLevel: 16,
        });

        tileLayer.addTo(this.map);
        zoomCtrl.addTo(this.map);
        locateCtrl.addTo(this.map);

        this.map.on('locationfound', function(e) {
            if (!this.latlng.lat || !this.latlng.lng) {
                this.closestStop = StopCollection.closest(this.stops(), e.latlng);
            }
            this.latlng = e.latlng;

            this.setupBikeRoute();
            this.setupBikeEvents();

        }.bind(this));
    },
    selectRoute: function() {
        this.setupRoute()
            .then(this.refresh.bind(this))
            .catch(console.error);
    },
    setupRoute: function() {
        var route = this.route().id,
            direction = this.route().direction,
            shapePromise,
            stopsPromise;

        this.track();
        localStorage.setItem('rappid:route', ko.toJSON(this.route()));

        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
        }
        this.routeLayer = L.layerGroup();
        this.routeLayer.addTo(this.map);

        if (this.vehicles) {
            this.map.removeLayer(this.vehicles.layer);
        }
        this.vehicles = new VehicleCollection(route, direction);
        this.vehicles.layer.addTo(this.map);

        this.shape = new Shape(route, direction);
        shapePromise = this.shape.fetch()
            .tap(this.shape.draw.bind(this.shape, this.routeLayer));

        stopsPromise = StopCollection.fetch(route, direction)
            .tap(function(stops) {
                StopCollection.draw(stops, this.routeLayer);
                this.stops(stops);
                if (this.latlng.lat && this.latlng.lng) {
                    StopCollection.closest(stops, this.latlng);
                }
            }.bind(this));

        return when.all([shapePromise, stopsPromise]);
    },
    setupBikeRoute: function () {
        var start = [this.latlng.lat, this.latlng.lng];
        var end = [this.closestStop.lat(), this.closestStop.lon()];
        //this.map.removeLayer(this.bikeLayer);
        CycleDirections.getDirections(start,end).done(function (directions) {
            console.log('directions ', directions);
            this.bikeLayer = new L.Polyline(directions.shape, {
                    color: 'rgb(46, 204, 113)',
                    stroke: true,
                    weight: 5,
                    opacity: 0.9,
                    smoothFactor: 1
                });

                this.map.addLayer(this.bikeLayer);
        }.bind(this));
    },
    setupBikeEvents: function () {
        var stops = this.stops();
        for(var i=0; i < stops.length; i++) {
            stops[i].marker.addEventListener('click', function (e) {
                var start = [this.latlng.lat, this.latlng.lng];
                var end = [e.latlng.lat, e.latlng.lng];
                this.map.removeLayer(this.bikeLayer);
                CycleDirections.getDirections(start,end).done(function (directions) {
                    this.bikeLayer = new L.Polyline(directions.shape, {
                            color: 'rgb(46, 204, 113)',
                            stroke: true,
                            weight: 5,
                            opacity: 0.9,
                            smoothFactor: 1
                        });

                        this.map.addLayer(this.bikeLayer);
                }.bind(this));

            }.bind(this), false);
        }
    },
    resize: function(e) {
        if (window.screen.width <= 1024) {
            this.includeMap(true);
            this.includeList(false);
        }
        else {
            this.includeMap(true);
            this.includeList(true);
        }
    },
    toggleMap: function() {
        this.includeList(!this.includeList());
        this.includeMap(!this.includeMap());
        this.map.invalidateSize();
        this.map.closePopup();
        document.body.scrollTop = document.documentElement.scrollTop = 0;
    },
    track: function() {
        
    },
    rustle: function() {
        window.alert('There was a problem fetching data from CapMetro.\nClose the app and try again.');
        setTimeout(function() {
            window.alert('There is no need to be upset.');
            setTimeout(function() {
                window.location.href = "https://www.youtube.com/watch?v=ygr5AHufBN4";
            }, 5000);
        }, 2000);
    }
};

module.exports = CycleRappid;
