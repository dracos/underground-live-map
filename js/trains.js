var map = null;
var trains = new L.LayerGroup([]);
//var train_by_id = new Array();
var starttime = new Date();
var extra = 0;

function load() {
    map = L.map('map').setView([51.507, -0.120], 13);
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data by <a href="http://openstreetmap.org">OpenStreetMap</a>.',
    //L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {
    //    attribution: 'Map data by <a href="http://openstreetmap.org">OpenStreetMap</a>. Tiles by <a href="http://stamen.com/">Stamen Design</a>.',
        minZoom: 10,
        maxZoom: 18
    }).addTo(map);
    trains.addTo(map);
    Update.mapStart();
}

var baseIcon = L.Icon.extend({
    options: {
        shadowUrl: "http://traintimes.org.uk/map/tube/i/pin_shadow.png",
        shadowSize: [ 22, 20 ],
        shadowAnchor: [ 6, 20 ]
    }
});

var Station = L.Marker.extend({
    initialize: function(station, options) {
        L.Marker.prototype.initialize.call(this, station.point, options);
        this.bindLabel(station.name);
    },
    options: {
        icon: new baseIcon({
            iconUrl: "http://traintimes.org.uk/map/tube/i/station.png",
            iconSize: [ 20, 20 ],
            iconAnchor: [ 10, 20 ],
            labelAnchor: [ 4, -13 ]
        })
    }
});

var Train = L.CircleMarker.extend({
    initialize: function(train, options) {
        L.CircleMarker.prototype.initialize.call(this, train.point, {
            weight: 2,
            color: '#000',
            opacity: 1,
            radius: 5,
            fillColor: '#ff0',
            fillOpacity: 1
        });
        this.updateDetails(train);
        this.info = '';
        this.calculateLocation();
    },
    createTitle: function() {
        var html = '';
        html = this.title + '<br>' + this.info;
        if (this.string) html += '<br><em>'+this.string+'</em>'
        //if (html != this.getTooltip()) this.setTooltip(html);
        if (this.link) html += '<br><a href="'+this.link+'">View board</a>'
        this.bindPopup(html, {
            offset: L.point( 0, 0 )
        });
    },
    updateDetails: function(train) {
        this.train_id = train.id;
        this.startPoint = train.point;
        this.justLeft = train.left;
        this.title = train.title;
        this.string = train.string;
        this.link = train.link
        this.route = train.next;
    },
    calculateLocation: function() {
        var now = new Date();
        var secs = (starttime - map.date)/1000 + extra + (now - starttime)/1000;
        var point = 0;
        var from = this.startPoint;
        var from_name = this.justLeft;
        for (r=0; r<this.route.length; r++) {
            var stop = this.route[r];
            if (secs < stop.mins*60) {
                var dlat = stop.point[0] - from[0];
                var dlng = stop.point[1] - from[1];
                var new_lat = from[0] + dlat/(stop.mins*60)*secs;
                var new_lng = from[1] + dlng/(stop.mins*60)*secs;
                point = [ new_lat, new_lng ];
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
        this.setLatLng(this.point)
        this.createTitle();
    },
    options: {
        icon: new baseIcon({
            iconUrl: "http://traintimes.org.uk/map/tube/i/pin_yellow.png",
            iconSize: [ 12, 20 ],
            iconAnchor: [ 6, 20 ],
            popupAnchor: [ 5, 1 ]
        })
    }
});

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
        reqwest({
            url: '/map/tube/data/'+name+'.json',
            type: 'json',
            error: function(err) {
                Message.showText('Data could not be fetched');
            },
            success: function(data) {
                var date = data.lastupdate;
                document.getElementById('update').innerHTML = date;
                map.date = new Date(date);
                var markers;
                if (refresh) {
                    var lines = data.polylines;
                    for (l=0; lines && l<lines.length; l++) {
                        var line = lines[l];
                        var colour = line.shift();
                        var opac = line.shift();
                        if (!line.length) continue;
                        L.polyline( line, { color: colour, weight: 4, opacity: opac } ).addTo(map);
                    }

                    markers = data.stations;
                    if (data.trains) markers = markers.concat(data.trains);

                } else {
                    trains.clearLayers();
                    markers = data.trains;
                }

                window.setTimeout(Update.mapSubsequent, 1000*60*2);

                for (var pos=0; markers && pos<markers.length; pos++) {
                    if (markers[pos].name) { // Station
                        new Station(markers[pos]).addTo(map);
                    } else if (markers[pos].title) { // Train
                        //var train_id = markers[pos].id;
                        //if (train_by_id[train_id]) {
                                                //    train = train_by_id[train_id];
                        //    train.updateDetails(markers[pos]);
                        //} else {
                        trains.addLayer( new Train(markers[pos]) );
                        //    train_by_id[train_id] = train;
                        //}
                    }
                }
                Message.hideBox();
                if (refresh) window.setTimeout(Update.trains, 200);
            }
        });
    },
    trains : function() {
        trains.eachLayer( function(train) {
            train.calculateLocation();
        });
        window.setTimeout(Update.trains, 200);
    }
};

Info = {
    HiddenText : '<p id="showhide"><a href="" onclick="Info.Show(); return false;">More information &darr;</a></p>',
    Hide : function() {
        var i = document.getElementById('info');
        this.content = i.innerHTML;
        i.innerHTML = this.HiddenText;
        i.style.width = 'auto';
    },
    Show : function() {
        var i = document.getElementById('info');
        i.innerHTML = this.content;
        i.style.width = '16em';
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
        this._show('32px', '-16px', '<img src="http://traintimes.org.uk/map/tube/i/loading.gif" alt="Loading..." width="32" height="32">');
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

function kb(a) {
    var b = { "x": 0, "y": 0 };
    while (a) {
        b.x += a.offsetLeft;
        b.y += a.offsetTop;
        a = a.offsetParent;
    }
    return b
}

