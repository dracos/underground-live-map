#!/usr/bin/python3

from __future__ import division 
import csv
import urllib.request
import json
import time
import datetime
import os
import os.path

import gtfs_realtime_pb2

DIR = os.path.dirname(os.path.abspath(__file__) ) + '/'
from config import APP_ID, APP_KEY

c = csv.DictReader(open(DIR + 'Stops.csv'))
station_locations = {}
for line in c:
    name = '%s%s, on %s, %s' % (line['CommonName'],
        ' (%s)' % line['Indicator'] if line['Indicator'] else '',
        line['Street'].title(), line['LocalityName'])
    station_locations[line['ATCOCode']] = (float(line['Latitude']), float(line['Longitude']), name)

try:
    if time.time() - os.path.getmtime(DIR + 'cache/TfWM') > 100:
        raise Exception('Too old')
    live = open(DIR + 'cache/TfWM', 'rb').read()
except:
    url = 'http://api.tfwm.org.uk/gtfs/trip_updates?app_id=%s&app_key=%s' % (APP_ID, APP_KEY)
    live = urllib.request.urlopen(url).read()
    fp = open(DIR + 'cache/TfWM', 'wb')
    fp.write(live)
    fp.close()

try:
    if time.time() - os.path.getmtime(DIR + 'cache/TfWM-routes') > 3600:
        raise Exception('Too old')
    lines = open(DIR + 'cache/TfWM-routes', 'rb').read()
except:
    url = 'http://api.tfwm.org.uk/Line/Route?app_id=%s&app_key=%s&formatter=json' % (APP_ID, APP_KEY)
    lines = urllib.request.urlopen(url).read()
    fp = open(DIR + 'cache/TfWM-routes', 'wb')
    fp.write(lines)
    fp.close()

route_to_number = {}
lines = json.loads(lines)
for line in lines['ArrayOfLine']['Line']:
    route_to_number[line['Id']] = line['Name']

feed = gtfs_realtime_pb2.FeedMessage()
feed.ParseFromString(live)

now = feed.header.timestamp

outJ = {}
used_stations = {}
for entity in feed.entity:
    meta = entity.trip_update.trip
    o = {
        'id': meta.trip_id,
        'title': route_to_number[meta.route_id] + ' bus',
        'next': [],
    }
    for s in entity.trip_update.stop_time_update:
        t = s.arrival.time or s.departure.time
        stop = s.stop_id
        loc = station_locations.get(stop)
        mins = (t - time.time()) / 60
        if int(mins)==mins:
            mins_p = '%d' % mins
        else:
            mins_p = '%.1f' % mins
        if loc:
            o['next'].append({
                'dexp': 'in %s minute%s' % (mins_p, '' if mins_p=='1' else 's'),
                'mins': mins,
                'name': loc[2],
                'point': [ loc[0], loc[1] ],
            })
            used_stations.setdefault('all', set()).add(stop)
            used_stations.setdefault(route_to_number[meta.route_id], set()).add(stop)
    if len(o['next']):
        o['point'] = o['next'][0]['point']
        outJ.setdefault('all', {}).setdefault('trains', []).append(o)
        outJ.setdefault(route_to_number[meta.route_id], {}).setdefault('trains', []).append(o)

for route in used_stations.keys():
    for k in used_stations[route]:
        v = station_locations[k]
        outJ[route].setdefault('stations', []).append({
            'name': v[2],
            'point': [ v[0], v[1] ],
        })

OUT_DIR = DIR + '../data/'
for route in outJ.keys():
    outJ[route]['station'] = 'TfWM'
    outJ[route]['lastupdate'] = datetime.datetime.fromtimestamp(now).strftime('%Y-%m-%dT%H:%M:%S')
    grr = json.dumps(outJ[route])
    out = OUT_DIR + route
    fp = open(out + 'N', 'w')
    fp.write(grr)
    fp.close()
    os.rename(out + 'N', out)
