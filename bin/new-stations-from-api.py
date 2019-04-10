import json
import urllib

types = ['dlr', 'london-overground', 'tram', 'bakerloo', 'central', 'circle', 'district', 'hammersmith-city', 'jubilee', 'metropolitan', 'northern', 'piccadilly', 'victoria', 'waterloo-city', ]

stations = json.load(open('stations.json'))

for t in types:
    j = json.load(urllib.urlopen('https://api.tfl.gov.uk/Line/%s/Route/Sequence/all' % t))
    for station in j['stations']:
        name = station['name'].replace(' Underground Station', ' Station')
        if t == 'dlr' and 'DLR Station' not in name:
            name += ' DLR Station'
        if t == 'london-overground' and 'Rail Station' not in name:
            name += ' Rail Station'
        if t == 'tram' and 'Tram Stop' not in name:
            name += ' Tram Stop'
        stations[name] = '%s,%s' % (station['lon'], station['lat'])

json.dump(stations, open('stationsN.json', 'w'), sort_keys=True, indent=0)
