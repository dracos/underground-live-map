var map = null;
var trains = new L.LayerGroup([]);
var stations = new L.FeatureGroup([]);
var train_by_id = new Array();
var starttime = new Date();
var extra = 0;
var Speed = 1;

function read_hash() {
    var query = window.location.search.substring(1);
    if (!query) {
        query = window.location.hash.replace('#', '');
    }
    if (query) {
        var dropdown = document.getElementById('line');
        if (dropdown && dropdown.options) {
            for (s=0; s<dropdown.options.length; s++) {
                var v = dropdown.options[s].value || dropdown.options[s].text;
                if (v == query) {
                    dropdown.selectedIndex = s;
                    break;
                }
            }
        } else if (dropdown) {
            dropdown.value = query;
        }
    }
    return query;
}

function load() {
    var query = read_hash();

    map = L.map('map', {
        attributionControl: false
    }).setView(TrainTimes.centre, TrainTimes.zoom || 13);
    L.control.attribution({ position: 'topleft' }).addTo(map);

    var tile_url, layer_opts = {
        minZoom: TrainTimes.minZoom || 10,
        maxZoom: 18
    };
    if (TrainTimes.map == 'black') {
        tile_url = '/map/tube/skyfall/black.png';
    } else {
        tile_url = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        if (query == 'transport') {
            tile_url = 'http://{s}.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png';
        }
        layer_opts.attribution = 'Map data by <a href="http://openstreetmap.org">OpenStreetMap</a>.';
    }
    L.tileLayer(tile_url, layer_opts).addTo(map);
    trains.addTo(map);
    stations.addTo(map);
    Update.mapStart();
}

var Station;
if (TrainTimes.station_icon) {
    var baseIcon = L.Icon.extend({
        options: {
            shadowUrl: "http://traintimes.org.uk/map/tube/i/pin_shadow.png",
            shadowSize: [ 22, 20 ],
            shadowAnchor: [ 6, 20 ]
        }
    });
    Station = L.Marker.extend({
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
} else {
    Station = L.CircleMarker.extend({
        initialize: function(station, options) {
            L.CircleMarker.prototype.initialize.call(this, station.point, {
                weight: 2,
                color: '#000',
                opacity: 1,
                radius: 4,
                fillColor: '#ff0',
                fillOpacity: 1
            });
            this.bindLabel(station.name);
        }
    });
}

var train_marker = TrainTimes.train_marker || L.CircleMarker;
var Train = train_marker.extend({
    initialize: function(train, options) {
        train_marker.prototype.initialize.call(this, train.point, {
            weight: 2,
            color: '#000',
            opacity: 1,
            radius: 5,
            fillColor: TrainTimes.train_colour,
            fillOpacity: 1
        });
        this.updateDetails(train);
        this.info = '';
        this.angle = 0;
        var now = new Date();
        var secs = (starttime - map.date)/1000 + extra + (now - starttime)/1000*Speed;
        this.calculateLocation(secs);
        if (TrainTimes.permanent_train_label) {
            this.createTitle();
        }
    },
    createTitle: function() {
        var html = '';
        if (TrainTimes.permanent_train_label) {
            html = this.train_id;
            this.bindLabel(html, { noHide: true });
        } else {
            html = this.title + '<br>' + this.info;
            if (this.string) html += '<br><em>'+this.string+'</em>'
            //if (html != this.getTooltip()) this.setTooltip(html);
            if (this.link) html += '<br><a href="'+this.link+'">View board</a>'
            this.bindPopup(html, {
                offset: L.point( 0, 0 )
            });
        }
    },
    updateDetails: function(train) {
        this.train_id = train.id;
        this.startPoint = this.point || train.point;
        this.justLeft = train.left;
        this.title = train.title;
        this.string = train.string;
        this.link = train.link
        this.route = train.next;
    },
    calculateLocation: function(secs) {
        var point = 0;
        var from = this.startPoint;
        var from_name = this.justLeft;
        if (from_name == '-' && this.route.length && secs < this.route[0].mins*60) {
            // Don't care about these until they start
            return;
        }
        for (r=0; r<this.route.length; r++) {
            var stop = this.route[r];
            if (secs < stop.mins*60) {

                if (from[1] == stop.point[1] && from[0] == stop.point[0]) {
                    var new_lat = from[0];
                    var new_lng = from[1];
                } else if (typeof arc !== 'undefined') {
                    var gc = new arc.GreatCircle(new arc.Coord(from[1], from[0]), new arc.Coord(stop.point[1], stop.point[0]));
                    var gc_new = gc.interpolate(secs/(stop.mins*60));
                    var new_lat = gc_new[1];
                    var new_lng = gc_new[0];
                } else {
                    var dlat = stop.point[0] - from[0];
                    var dlng = stop.point[1] - from[1];
                    var new_lat = from[0] + dlat/(stop.mins*60)*secs;
                    var new_lng = from[1] + dlng/(stop.mins*60)*secs;
                }

                point = [ new_lat, new_lng ];
                this.info = '';
                if (from_name) this.info += '(left '+from_name+',<br>';
                if (TrainTimes.url == '/map/') {
                    this.info += 'expected to ';
                    this.info += (r==this.route.length-1) ? 'arrive' : 'depart';
                    this.info += ' ' + stop.name;
                    if (stop.dexp) this.info += ' at '+stop.dexp;
                } else {
                    this.info += 'expected ' + stop.name;
                    if (stop.dexp) this.info += ' '+stop.dexp;
                }
                this.info += ')';
                break;
            }
            secs -= stop.mins * 60;
            from = stop.point;
            from_name = stop.name;
        }
        if (!point) point = from;
        this.point = point;
        var current = this.getLatLng();
        if (current) {
            var dx = this.point[1] - current.lng,
                dy = this.point[0] - current.lat,
                bearing = Math.atan2(dx, dy);
            this.angle = bearing;
        }
        this.setLatLng(this.point);
        if (!TrainTimes.permanent_train_label) {
            this.createTitle();
        }
    },
    getPathString: function () {
        var p = this._point,
            r = this._radius;

        if (this._checkIfEmpty()) {
            return '';
        }

        if (L.Browser.svg) {
            var rad1 = this.angle-Math.PI/4,
                rad2 = this.angle,
                rad3 = this.angle+Math.PI/4,
                rcostheta1 = r * Math.cos(rad1),
                rsintheta1 = r * Math.sin(rad1),
                rcostheta2 = r * Math.cos(rad2),
                rsintheta2 = r * Math.sin(rad2),
                rcostheta3 = r * Math.cos(rad3),
                rsintheta3 = r * Math.sin(rad3);
            return 'M' + p.x + ',' + (p.y - r) +
                   'A' + r + ',' + r + ',0,1,1,' +
                   (p.x - 0.1) + ',' + (p.y - r) +
                   'M' + (p.x + rsintheta1/4) + ',' + (p.y - rcostheta1/4) +
                   'L' + (p.x + rsintheta2/2) + ',' + (p.y - rcostheta2/2) +
                   'L' + (p.x + rsintheta3/4) + ',' + (p.y - rcostheta3/4) +
                   ' z';
        } else {
            p._round();
            r = Math.round(r);
            return 'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r + ' 0,' + (65535 * 360);
        }
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
        var dropdown = document.getElementById('line'),
            name, url;
        if (dropdown) {
            if (dropdown.options) {
                name = dropdown.options[dropdown.selectedIndex].value || dropdown.options[dropdown.selectedIndex].text;
            } else {
                name = dropdown.value;
            }
            url = 'http://www.traintimes.org.uk' + TrainTimes.url + '#' + name;
            document.getElementById('permalink').href = url;
            window.location.hash = name;
        } else {
            name = 'london.json';
        }
        Message.showWait();
        reqwest({
            url: TrainTimes.url + 'data/' + encodeURIComponent(name),
            type: 'json',
            error: function(err) {
                Message.showText('Data could not be fetched');
            },
            success: function(data) {
                if (!data.stations.length && !data.trains.length) {
                    Message.showText('No data returned');
                    return;
                }
                var date = data.lastupdate;
                if (document.getElementById('update')) {
                    document.getElementById('update').innerHTML = date;
                }
                map.date = new Date(date);
                if (document.getElementById('station_name')) {
                    document.getElementById('station_name').innerHTML = data.station;
                }

                var markers;
                if (refresh) {
                    var center = data.center;
                    if (center) {
                        var span = data.span;
                        var center_lat = center[0];
                        var center_lng = center[1];
                        var span_lat = span[0];
                        var span_lng = span[1];
                        var zoom = 6;
                        if (span_lng && span_lat) {
                            map.fitBounds( [
                                [ center_lat-span_lat/2, center_lng-span_lng/2 ],
                                [ center_lat+span_lat/2, center_lng+0+span_lng/2 ]
                            ] );
                        } else {
                            map.setCenter(center, zoom);
                        }

                        if (name == 'cla' && !document.getElementById('speedy').checked) {
                            document.getElementById('speedy').checked = true;
                            Update.speed();
                        }
                    }

                    stations.clearLayers();
                    trains.clearLayers();
                    train_by_id = new Array();

                    var lines = data.polylines;
                    for (l=0; lines && l<lines.length; l++) {
                        var line = lines[l],
                            colour = '#000',
                            opac = 0.5;
                        if (!line.length) continue;
                        if (typeof line[0] != 'object') {
                            colour = line.shift();
                            if (TrainTimes.line_colour) {
                                colour = TrainTimes.line_colour;
                            }
                            opac = line.shift();
                            if (!line.length) continue;
                        }
                        if (typeof arc !== 'undefined') {
                            var pts = [];
                            for (ll=0; ll<line.length-1; ll++) {
                                var gc = new arc.GreatCircle(new arc.Coord(line[ll][1], line[ll][0]), new arc.Coord(line[ll+1][1], line[ll+1][0]));
                                gc = gc.Arc(100);
                                gc = gc.geometries[0].coords;
                                for (x=0; x<gc.length; x++) {
                                    gc[x] = [ gc[x][1], gc[x][0] ];
                                }
                                pts.push.apply(pts, gc);
                            }
                            line = pts;
                        }
                        stations.addLayer( L.polyline( line, { color: colour, weight: 4, opacity: opac } ) );
                    }

                    markers = data.stations;
                    if (data.trains) markers = markers.concat(data.trains);

                } else {
                    if (!TrainTimes.keep_trains) {
                        trains.clearLayers();
                    }
                    markers = data.trains;
                }

                if (Update.refreshDataTimeout) {
                    window.clearTimeout(Update.refreshDataTimeout);
                }
                Update.refreshDataTimeout = window.setTimeout(Update.mapSubsequent, 1000*60*(TrainTimes.refresh||2));

                for (var pos=0; markers && pos<markers.length; pos++) {
                    if (markers[pos].name) { // Station
                        if (!TrainTimes.station_hide) {
                            stations.addLayer( new Station(markers[pos]) );
                        }
                    } else if (markers[pos].title) { // Train
                        var train_id = markers[pos].id;
                        if (TrainTimes.keep_trains && train_by_id[train_id]) {
                            train = train_by_id[train_id];
                            train.updateDetails(markers[pos]);
                        } else {
                            var t = new Train(markers[pos]);
                            trains.addLayer(t);
                            if (TrainTimes.permanent_train_label) {
                                t.showLabel();
                            }
                            train_by_id[train_id] = t;
                        }
                    }
                }
                if (refresh) {
                    if (TrainTimes.fit_bounds) {
                        map.fitBounds(stations.getBounds());
                    }
                    window.setTimeout(Update.trains, TrainTimes.update || 200);
                }
                Message.hideBox();
            }
        });
    },
    trains : function() {
        var now = new Date();
        var secs = (starttime - map.date)/1000 + extra + (now - starttime)/1000*Speed;
        if (document.getElementById('current_time')) {
            document.getElementById('current_time').innerHTML = new Date(map.date.getTime() + secs*1000).toLocaleTimeString();
        }
        trains.eachLayer( function(train) {
            train.calculateLocation(secs);
        });
        window.setTimeout(Update.trains, TrainTimes.update || 200);
    },
    speed: function() {
        var speed = document.getElementById('speedy');
        var now = new Date();
        if (speed.checked) {
            Speed = 10;
        } else {
            extra += (now - starttime)/1000*(Speed-1);
            Speed = 1;
        }
        starttime = now;
    }
};

Info = {
    Hide : function() {
        var i = document.getElementById('info');
        i.style.width = 'auto';
        document.getElementById('info_show').style.display = 'block';
        document.getElementById('info_shown').style.display = 'none';
    },
    Show : function() {
        var i = document.getElementById('info');
        i.style.width = '16em';
        document.getElementById('info_show').style.display = 'none';
        document.getElementById('info_shown').style.display = 'block';
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

