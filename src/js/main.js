var ko = window.ko = require('knockout');
var CycleRappid = require('./cyclerappid');
var config = window.config = require('./config');

var cyclerappid = window.rappid = new CycleRappid();


ko.applyBindings(rappid, document.getElementById('lerappid'));
cyclerappid.start();

