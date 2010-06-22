var map = null;
var stations = new Array();
var trains = new Array();
//var train_by_id = new Array();
var starttime = new Date();
var extra = 0;

function load() {
	if (GBrowserIsCompatible()) {
		Update.mapSize();
		GEvent.bindDom(window,"resize",this,this.Update.mapSize);
		map = new GMap2(document.getElementById('map'));
		map.addControl(new GLargeMapControl());
		map.addControl(new GMapTypeControl());
		map.addControl(new GOverviewMapControl());
		map.addControl(new GScaleControl());
		map.setCenter(new GLatLng(51.507, -0.143), 12);
		Update.mapStart();
	}
}

var basePin = new GIcon();
	basePin.shadow = "http://traintimes.org.uk:81/map/tube/i/pin_shadow.png";
	basePin.iconSize = new GSize(12,20);
	basePin.shadowSize = new GSize(22,20);
	basePin.iconAnchor = new GPoint(6,20);
	basePin.infoWindowAnchor = new GPoint(5,1);
var redPin = new GIcon(basePin);
	redPin.image = "http://traintimes.org.uk:81/map/tube/i/pin_red.png";
//	redPin.image = "i/train.gif";
//	redPin.iconSize = new GSize(32, 28);
//	redPin.iconAnchor = new GPoint(16, 20);
var yellowPin = new GIcon(basePin);
	yellowPin.image = "http://traintimes.org.uk:81/map/tube/i/pin_yellow.png";
var greenPin = new GIcon(basePin);
	greenPin.image = "http://traintimes.org.uk:81/map/tube/i/pin_green.png";

function Train(train) {
	this.inheritFrom = PdMarker;
    this.updateDetails(train);
	this.info = '';
	this.calculateLocation();
	this.inheritFrom(this.point, redPin);
	this.createTitle();
}
Train.prototype = new PdMarker(new GLatLng(1,1), redPin);
Train.prototype.createTitle = function() {
	var html = '';
	html = this.title + '<br>' + this.info;
	if (this.string) html += '<br><em>'+this.string+'</em>'
	//if (html != this.getTooltip()) this.setTooltip(html);
	if (this.link) html += '<br><a href="'+this.link+'">View board</a>'
	this.setDetailWinHTML(html);
};
Train.prototype.updateDetails = function(train) {
	this.startPoint = train.point;
	this.justLeft = train.left;
	this.title = train.title;
	this.string = train.string;
	this.link = train.link
	this.route = train.next;
};
Train.prototype.calculateLocation = function() {
	var now = new Date();
	var secs = (starttime - map.date)/1000 + extra + (now - starttime)/1000;
	var point = 0;
	var from = this.startPoint;
	var from_name = this.justLeft;
	for (r=0; r<this.route.length; r++) {
		var stop = this.route[r];
		if (secs < stop.mins*60) {
			var dlat = stop.point.lat() - from.lat();
			var dlng = stop.point.lng() - from.lng();
			var new_lat = from.lat() + dlat/(stop.mins*60)*secs;
			var new_lng = from.lng() + dlng/(stop.mins*60)*secs;
			point = new GLatLng(new_lat, new_lng);
			this.info = '(left '+from_name+',<br>expected '+stop.name;
			if (stop.dexp) this.info += ' '+stop.dexp;
			this.info += ')';
			break;
		}
		secs -= stop.mins * 60;
		from = stop.point;
		from_name = stop.name;
	}
	if (!point) point = from;
	this.point = point;
};
Train.prototype.recalculateLocation = function() {
	this.calculateLocation();
	this.setPoint(this.point)
	this.createTitle();
}

function Station(station) {
	this.inMouseOver = false;
	this.point = station.point;
	this.name = station.name;
	this.inheritFrom = PdMarker;
	this.inheritFrom(station.point, yellowPin);
	this.setTooltip(this.name);
GEvent.addListener(this, 'mouseover', function() {
        if (this.inMouseOver) return;
        this.inMouseOver = true;
        if (!this.detailOpen) this.showTooltip();
        this.inMouseOver = false;
});
GEvent.addListener(this, 'mouseout', function() {
        if (!this.detailOpen) this.hideTooltip();
});

	GEvent.addListener(this, 'click', function() {
		this.showMapBlowup(15);
	});
}
Station.prototype = new PdMarker(new GLatLng(1,1), yellowPin);

// Updates from server, site, and periodically
 Update = {
    mapStart: function() {
        Update.map(true);
    },
    mapSubsequent: function() {
        Update.map(false);
    },
    map: function(refresh) {
	var name = 'london';
	Message.showWait();
	GDownloadUrl('/map/tube/data/'+name+'.js', function(data, status) {
		if (status != 200 && status != 304) {
			Message.showText('Data could not be fetched');
			if (!map.isLoaded())
		        map.setCenter(new GLatLng(51.507, -0.143), 12);
			return;
		}
		var data = eval("(" + data + ")");
		var date = data.lastupdate;
		document.getElementById('update').innerHTML = date;
		map.date = new Date(date);

        var markers;
		// Centre and zoom map, only the first time
		if (refresh) {
		    map.clearOverlays();
		    trains = [];
			var center = data.center;
			var span = data.span;
			var center_lng = center.lng();
		 	var center_lat = center.lat();
			var span_lng = span.lng();
			var span_lat = span.lat();
			var zoom = 10;
			if (span_lng && span_lat) {
				var sw = new GLatLng(center_lat-span_lat/2, center_lng-span_lng/2);
				var ne = new GLatLng(center_lat+span_lat/2, center_lng+0+span_lng/2);
				var zoom = map.getBoundsZoomLevel(new GLatLngBounds(sw, ne)) + 3;
			}
			map.setCenter(center, zoom);

		    var lines = data.polylines
		    for (l=0; lines && l<lines.length; l++) {
			    var line = lines[l];
                var colour = line.shift();
			    if (!line.length) continue;
			    var polyline = new GPolyline(line, colour, 4, 0.9);
			    map.addOverlay(polyline);
		    }

		    markers = data.stations;
		    if (data.trains) markers = markers.concat(data.trains);

        } else {
	        for (i=0; i<trains.length; i++) {
		        var train = trains[i];
		        map.removeOverlay(train);
	        }
            trains = [];
		    markers = data.trains;
        }

		var pos = 0;
		window.setTimeout(plotMarkers, 165);
		window.setTimeout(Update.mapSubsequent, 1000*60*2);

		function plotMarkers() {
			if (markers && pos < markers.length) {
				var max = Math.min(pos+10, markers.length);
				while (pos < max) {
					if (markers[pos].name) { // Station
						var station = new Station(markers[pos]);
						map.addOverlay(station);
						stations[stations.length] = station;
					} else if (markers[pos].title) { // Train
                        //var train_id = markers[pos].id;
                        //if (train_by_id[train_id]) {
						//    train = train_by_id[train_id];
                        //    train.updateDetails(markers[pos]);
                        //} else {
						var train = new Train(markers[pos]);
						map.addOverlay(train);
						trains[trains.length] = train;
                        //    train_by_id[train_id] = train;
                        //}
					}
					pos++;
				}
				window.setTimeout(plotMarkers, 165);
			} else {
				Message.hideBox();
                if (refresh) window.setTimeout(Update.trains, 1000);
			}
		}

	});
    },
    trains : function() {
	for (i=0; i<trains.length; i++) {
		var train = trains[i];
		train.recalculateLocation();
	}
	window.setTimeout(Update.trains, 1000);
    },
    mapSize: function() {
	var m = document.getElementById('map');
	var i = document.getElementById('info');
	var a=getWindowSize();
	var b=kb(m);
	var c=a.height-b.y-24;
	var d=a.width-Info.Width-48;
	m.style.height=c+'px';
	m.style.width=d+'px';
	i.style.width = Info.Width + 'px';
	i.style.height=c+'px';
	var l = document.getElementById('loading').style;
	l.top = (b.y+c/4) + 'px';
	l.left = (b.x+d/2) + 'px';
    }
};


Info = {
	Width : 250,
	HiddenText : '<p id="showhide"><a href="" onclick="Info.Show(); return false;">&laquo;</a></p>',
	Hide : function() {
		var i = document.getElementById('info');
		this.content = i.innerHTML;
		i.innerHTML = this.HiddenText;
		this.Width = 10;
		Update.mapSize();
	},
	Show : function() {
		var i = document.getElementById('info');
		i.innerHTML = this.content;
		this.Width = 250;
		Update.mapSize();
	}
};


Message = {
	_show : function(width, marginLeft, text) {
		var loading = document.getElementById('loading');
		loading.style.width = width;
		loading.style.marginLeft = marginLeft;
		loading.innerHTML = text;
		loading.style.display = 'block';
	},
	showWait : function() {
		this._show('32px', '-16px', '<img src="http://traintimes.org.uk:81/map/tube/i/loading.gif" alt="Loading..." width="32" height="32">');
	},
	showText : function(text) {
		setOpacity(document.getElementById('map'), 0.4);
		this._show('30%', '-15%', text);
	},
	hideBox : function() {
		document.getElementById('loading').style.display = 'none';
	}
};

/* Useful global functions */

function setOpacity(m, o) {
	m = m.style;
	if (typeof m.filter == 'string')
		m.filter = 'alpha(opacity='+(o*100)+')';
	else {
		m.opacity = o;
		m['-moz-opacity'] = o;
		m['-khtml-opacity'] = o;
	}
}

function kb(a){
	var b={"x":0,"y":0};
	while(a){
		b.x+=a.offsetLeft;
		b.y+=a.offsetTop;
		a=a.offsetParent;
	}
	return b
}

function getWindowSize(){
	a=new GSize(0,0);
	if(window.self&&self.innerWidth){
		a.width=self.innerWidth;
		a.height=self.innerHeight;
		return a;
	}
	if(document.documentElement&&document.documentElement.clientHeight){
		a.width=document.documentElement.clientWidth;
		a.height=document.documentElement.clientHeight;
		return a;
	}
	a.width=document.body.clientWidth;
	a.height=document.body.clientHeight;
	return a;
}

