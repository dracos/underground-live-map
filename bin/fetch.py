#!/usr/bin/python
""" Create the file /data/london.js from the sources files within the /data folder.
The client side code uses london.js for its static source data, e.g. geography of stations. """

from __future__ import division 
from collections import OrderedDict
import urllib
import re
import simplejson as json
import time
import os
import os.path
import mx.DateTime

import optparse

# Parse any command line arguments. Currently just --debug flag
parser = optparse.OptionParser()
parser.add_option('-d', '--debug', action="store_true", help='true for noisy helpful execution, false or omitted for quiet.')
parser.add_option('-s', '--stations', default='stations.json', help='JSON file to use for server station locations')
parser.add_option('-o', '--output', default='../data', help='Output directory, relative to this script')
parser.add_option('-n', '--new', action="store_true", help='Use new API, with DLR/Tram')

(options, args) = parser.parse_args()
debug_mode = options.debug

""" Print the string only if we're in debug mode. """
def print_debug(out):
    if debug_mode:
        print out
        
# get the directory containing this file, fetch.py, which is in the /bin directory within the project.
dir = os.getcwd() + '/'
dir = os.path.dirname(os.path.abspath(__file__) ) + '/'
print_debug( 'Data generation tool for underground-live-map\nUsage: python fetch.py\n')
print_debug( 'Creating and populating directories: \n%s and \n%s' % ( dir + 'cache', dir + options.output )) 
# Now create the destination directories relative to the cwd.
try:
    os.mkdir(dir + 'cache')
    os.mkdir(dir + options.output)
except Exception, ex:
    pass # ignore - probably exists already.

# If the above approach doesn't work for you, you could hard code dir like this:
# dir = '/srv/traintimes.org.uk/public/htdocs/map/tube/bin/'

format = 'traintimes'

if options.new:
    api = 'https://api.tfl.gov.uk/Line/%s/Arrivals'
else:
    api = 'http://cloud.tfl.gov.uk/TrackerNet/PredictionSummary/%s'

print_debug( "Processing %s" % options.stations)
station_locations = json.load(open(dir + options.stations))
for name, pts in station_locations.items():
    if isinstance(pts, str):
        lng, lat = pts.split(',')
        station_locations[name] = { '*': (float(lat), float(lng)) }
    if options.new:
        switch = {
            'B': 'bakerloo',
            'C': 'central',
            'D': 'district',
            'H': 'hammersmith-city',
            'J': 'jubilee',
            'M': 'metropolitan',
            'N': 'northern',
            'P': 'piccadilly',
            'V': 'victoria',
            'W': 'waterloo-city',
        }
        for old, new in switch.items():
            if old in station_locations[name]:
                station_locations[name][new] = station_locations[name][old]
                if old == 'H':
                    station_locations[name]['circle'] = station_locations[name][old]

lines = {
    'B': 'Bakerloo',
    'C': 'Central',
    'D': 'District',
    'H': 'Hammersmith & Circle',
    'J': 'Jubilee',
    'M': 'Metropolitan',
    'N': 'Northern',
    'P': 'Piccadilly',
    'V': 'Victoria',
    'W': 'Waterloo & City',
}
if options.new:
    lines = {
        #'london-overground': 'Overground',
        'tram': 'Tram',
        #'tfl-rail': 'TfL Rail',
        'dlr': 'DLR',
        'bakerloo': 'Bakerloo',
        'central': 'Central',
        'circle': 'Circle',
        'district': 'District',
        'hammersmith-city': 'Hammersmith & City',
        'jubilee': 'Jubilee',
        'metropolitan': 'Metropolitan',
        'northern': 'Northern',
        'piccadilly': 'Piccadilly',
        'victoria': 'Victoria',
        'waterloo-city': 'Waterloo & City',
    }

def canon_station_name(s, line):
    """Given a station name, try and reword it to match the station list"""
    s = s.strip()
    s = re.sub('^Heathrow$', 'Heathrow Terminals 1, 2, 3', s)
    s = re.sub('^Olympia$', 'Kensington (Olympia)', s)
    s = re.sub('^Warwick Ave$', 'Warwick Avenue', s)
    s = re.sub('^Camden$', 'Camden Town', s)
    s = s.replace('Camden Town (20B-20A)', 'Camden Town')
    s = s.replace('Camden Town at Point 20A', 'Camden Town')
    s = re.sub('^Central$', 'Finchley Central', s) # They say "Between Central and East Finchley"
    s = re.sub('\s*Platform \d+$', '', s)
    if line == 'tram':
        s = s + ' Tram Stop'
    elif line == 'dlr' or line == 'london-overground':
        pass
    else:
        s = s + ' Station'
    s = s.replace(' & ', ' &amp; ') # XXX
    if isinstance(s, str):
        s = s.replace('\xe2\x80\x99', "'")
    else:
        s = s.replace(u'\u2019', "'")
    s = s.replace('(Bakerloo)', 'Bakerloo').replace('Earls', 'Earl\'s') \
        .replace(' fast ', ' ') \
        .replace('St ', 'St. ') \
        .replace('Warren St.', 'Warren Street') \
        .replace('Warren Station', 'Warren Street Station') \
        .replace('Elephant and Castle', 'Elephant &amp; Castle') \
        .replace('Elephant Station', 'Elephant &amp; Castle Station') \
        .replace('Lambeth Station', 'Lambeth North Station') \
        .replace('Castle and Lambeth North Station', 'Lambeth North Station') \
        .replace('Castle and Kennington Station', 'Kennington Station') \
        .replace('Kenntington', 'Kennington') \
        .replace('Willlesden Green', 'Willesden Green') \
        .replace('Chalfont Station', 'Chalfont &amp; Latimer Station') \
        .replace('Chalfont and Latimer Station', 'Chalfont &amp; Latimer Station') \
        .replace('West Brompon', 'West Brompton') \
        .replace('Picadilly Circus', 'Piccadilly Circus') \
        .replace("Queen's' Park", "Queen's Park") \
        .replace('High Barent', 'High Barnet') \
        .replace('Highbury &amp; Isl ', 'Highbury &amp; Islington ') \
        .replace('Bartnet', 'Barnet') \
        .replace('Faringdon', 'Farringdon') \
        .replace('Turnham Greens', 'Turnham Green') \
        .replace('Ruilsip', 'Ruislip') \
        .replace('Dagemham', 'Dagenham') \
        .replace('Paddington H &amp; C', 'Paddington') \
        .replace('Edgware Road (H &amp; C)', 'Edgware Road Circle') \
        .replace('Hammersmith (Circle and H&amp;C)', 'Hammersmith') \
        .replace('Hammersmith (C&amp;H)', 'Hammersmith') \
        .replace('Shepherds Bush (Central Line)', "Shepherd's Bush") \
        .replace('Terminals 123', 'Terminals 1, 2, 3').replace('Terminal 1,2,3', 'Terminals 1, 2, 3') \
        .replace('Woodford Junction', 'Woodford') \
        .replace("King's Cross Station", "King's Cross St. Pancras Station") \
        .replace("Kings Cross St. P Station", "King's Cross St. Pancras Station") \
        .replace("Kings Cross St. Pancras Station", "King's Cross St. Pancras Station") \
        .replace("Kings Cross Station", "King's Cross St. Pancras Station") \
        .replace('Central Finchley', 'Finchley Central') \
        .replace('District and Picc', 'D &amp; P') \
        .replace('Finchley Central on the Southbound road', 'Finchley Central') \
        .replace('South Fields', 'Southfields') \
        .replace('Regents Park', "Regent's Park") \
        .replace('Bromley-by-Bow', "Bromley-By-Bow") \
        .replace('Brent Oak', 'Burnt Oak') \
        .replace('St. Johns Wood', "St. John's Wood") \
        .replace('St. John Wood', "St. John's Wood") \
        .replace('Totteridge and Whetstone', 'Totteridge &amp; Whetstone') \
        .replace('Newbury Park Loop', 'Newbury Park') \
        .replace('ALperton', 'Alperton') \
        .replace('Moor park', 'Moor Park') \
        .replace('Harrow-on-the-Hill', 'Harrow on the Hill').replace('Harrow-On-The-Hill', 'Harrow on the Hill')
    if s == 'Edgware Road Station' and line == 'B':
        s = 'Edgware Road Bakerloo Station'
    if s == 'Edgware Road Station' and line != 'B':
        s = 'Edgware Road Circle Station'
    return s

def parse_time(s):
    """Converts time in MM:SS, or - for 0, to time in seconds"""

    if isinstance(s, int): return s

    if s == '-' or s == 'due': return 0
    m = re.match('(\d+):(\d+):(\d+)$', s)
    if m:
        return int(m.group(1))*3600 + int(m.group(2))*60 + int(m.group(3))
    m = re.match('(\d+):(\d+)$', s)
    if not m:
        raise Exception, 'Did not match time %s' % s
    return int(m.group(1))*60 + int(m.group(2))

# Loop through the trains
out = OrderedDict()
outNext = {}

def parse_entry(time_to_station, set_id, dest_code, destination, current_location, station_name, key, platform_name):
    global sub_id, sub_ids

    time_to_station = parse_time(time_to_station)
    train_key = set_id
    train_key += '-%s' % dest_code
    if set_id in ('000', '477') or destination in ('Unknown', 'Special', 'Network Rail TOC') or dest_code == '0':
    #or (set_id in ('015', '062', '113', '124') and key == 'N'):
        lookup = re.sub('\s*Platform \d+$', '', current_location)
        if current_location == 'At Platform':
            lookup = 'At %s' % station_name
        if not sub_ids.get(lookup):
            sub_ids[lookup] = sub_id
            sub_id += 1
        train_key += '-%s' % sub_ids[lookup]
    entry = {
        'station_name': canon_station_name(re.sub('\.$', '', station_name), key),
        'platform_name': platform_name,
        'current_location': current_location,
        'time_to_station': time_to_station,
        'destination': destination,
    }
    if time_to_station < out.get(key, {}).get(train_key, {}).get('time_to_station', 999999):
        out.setdefault(key, OrderedDict())[train_key] = entry
    outNext.setdefault(key, {}).setdefault(train_key, []).append(entry)
    #print '%s %s %s | %s %s %s' % (key, station_name, platform_name, set_id, time_to_station, current_location)

def parse_json(live):
    live = json.loads(live)
    for prediction in live:
        station_name = prediction['stationName'].replace(' Underground Station', '')
        current_location = prediction.get('currentLocation', '')
        dest_code = prediction.get('destinationNaptanId', '0')
        parse_entry(prediction['timeToStation'], prediction['vehicleId'], dest_code,
            prediction['towards'], current_location, station_name, key, prediction['platformName'])

def parse_xml(live):
    stations = re.findall('<S Code="([^"]*)" N="([^"]*)">(.*?)</S>(?s)', live)
    for station_code, station_name, station  in stations:
        platforms = re.findall('<P N="([^"]*)" Code="([^"]*)"[^>]*>(.*?)</P>(?s)', station)
        for platform_name, platform_code, platform in platforms:
            trains = re.findall('<T S="(.*?)" T="(.*?)" D="(.*?)" C="(.*?)" L="(.*?)" DE="(.*?)" />', platform)
            for set_id, trip_id, dest_code, time_to_station, current_location, destination in trains:
                if current_location == '': continue
                if 'Road 21' in station_name: continue # List doesn't have its location
                if "Lord's Disused" in station_name: continue
                parse_entry(time_to_station, set_id, dest_code, destination, current_location, station_name, key, platform_name)

for key, line in lines.items():
    sub_id = 0
    sub_ids = {}
    try:
        if time.time() - os.path.getmtime('cache/%s' % key) > 100:
            raise Exception, 'Too old'
        live = open(dir + 'cache/%s' % key).read()
    except:
        live = urllib.urlopen(api % key).read()
        fp = open(dir + 'cache/%s' % key, 'w')
        fp.write(live)
        fp.close()

    if options.new:
        parse_json(live)
    else:
        parse_xml(live)

# Remove trains that have the same ID, but a higher time_to_station - probably the same train
print_debug( "Removing duplicate trains")
for key, ids in out.items():
    for id, arr in ids.items():
        for key2, ids2 in out.items():
            if key == key2: continue
            for id2, arr2 in ids2.items():
                if id == id2:
                    if arr['time_to_station'] < arr2['time_to_station']:
                        if out[key].get(id2): del out[key2][id2]
                    else:
                        if out[key].get(id): del out[key][id]
        
def lookup(line, name):
    if line in station_locations[name]:
        return station_locations[name][line]
    if options.new and options.debug: print line, station_locations[name]
    try:
        return station_locations[name]['*']
    except:
        print 'Error looking up', name, line, station_locations[name]

print_debug ("Processing stations")
for line, ids in out.items():
    for id, arr in ids.items():
        if 'Siding' in arr['current_location']: continue
        if 'Depot' in arr['current_location']: continue
        if 'Network Rail Track' in arr['current_location']: continue
        if 'North Acton Junction' in arr['current_location']: continue
        if "Lord's Disused" in arr['current_location']: continue
        if 'Road 21' in arr['current_location']: continue # List doesn't have its location

        station_name = arr['station_name']
        if arr['current_location'] == 'At Platform':
            arr['location'] = lookup(line, station_name)

        if not arr['current_location'] and line in ('dlr', 'london-overground', 'tram'):
            arr['location'] = lookup(line, station_name)

        m = re.match('(?:South of|Leaving|Left) (.*?)(?:,? heading)?(?: (?:towards|to) .*)?$', arr['current_location'])
        if m:
            location_1 = lookup(line, canon_station_name(m.group(1), line))
            location_2 = lookup(line, station_name)
            fraction = 30 / (arr['time_to_station'] + 30)
            arr['location'] = (location_1[0] + (fraction*(location_2[0]-location_1[0])), location_1[1] + (fraction*(location_2[1]-location_1[1])))

        m = re.match('Between (.*?) and (.*)', arr['current_location'])
        if m:
            if line == 'H' and station_name != canon_station_name(m.group(2),line):
                continue
            location_1 = lookup(line, canon_station_name(m.group(1), line))
            location_2 = lookup(line, canon_station_name(m.group(2), line))
            max = arr['time_to_station']+30 if arr['time_to_station'] > 150 else 180
            fraction = (max-arr['time_to_station']) / max
            arr['location'] = (location_1[0] + (fraction*(location_2[0]-location_1[0])), location_1[1] + (fraction*(location_2[1]-location_1[1])))

        m = re.match('Approaching (.*)', arr['current_location'])
        if m:
            # Don't know where we were previously, can't be bothered to work it out, needs to store history!
            arr['location'] = lookup(line, canon_station_name(m.group(1), line))

print_debug( "Building trains and travel time data") 
## MJA 16jun11 Could do with a better description of this    
if format=='traintimes':
    outJ = {
        'station': 'London Underground',
        'lastupdate': mx.DateTime.ARPA.str(mx.DateTime.now()),
        'trains': [],
        'stations': [],
    }
    outT = []
    for line, ids in out.items():
        for id, arr in ids.items():
            outT.append({
                'id': id, 'time': arr['time_to_station'], 'line': lines[line],
                'current': arr['current_location'] == 'At Platform' and 'At ' + arr['station_name'] or arr['current_location'],
            })
            if 'location' not in arr: continue
            next = []
            outNext[line][id].sort(lambda x,y: cmp(x['time_to_station'], y['time_to_station']))
            for n in outNext[line][id]:
                stat = n['station_name']
                location = lookup(line, stat)
                mins = n['time_to_station']/60
                if int(mins)==mins:
                    mins_p = '%d' % mins
                else:
                    mins_p = '%.1f' % mins
                next.append({
                    'point': [ location[0], location[1] ],
                    'name': stat,
                    'mins': mins,
                    'dexp': 'in %s minute%s' % (mins_p, '' if n['time_to_station']==60 else 's'),
                })
            outJ['trains'].append({
                'point': [ arr['location'][0], arr['location'][1] ],
                'next': next,
                'left': '',
                'id': '%s-%s' % (line, id),
                'title': lines[line] + ' train to ' + arr['destination'] + ' [' + id + ']',
            })

    for name, points in sorted(station_locations.items()):
        _, foo = points.popitem()
        lat, lon = foo
        outJ['stations'].append({
            'point': [ lat, lon ],
            'name': name,
        })

    grr = json.dumps(outJ, indent=2)
    polylines = open(dir + 'london-lines.js').read()
    grr = grr[:-2] + ',\n' + polylines + '}'

    fp = open(dir + options.output + '/london.jsonN', 'w')
    fp.write(grr)
    fp.close()
    os.rename(dir + options.output + '/london.jsonN', dir + options.output + '/london.json')

    json.dump(outT, open(dir + options.output + '/london-text.json', 'w'))

print_debug( "Done")
