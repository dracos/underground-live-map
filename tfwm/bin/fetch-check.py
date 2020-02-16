#!/srv/.virtualenvs/tfwm/bin/python

import gtfs_realtime_pb2

live = open('cache/TfWM', 'rb').read()

feed = gtfs_realtime_pb2.FeedMessage()
feed.ParseFromString(live)

now = feed.header.timestamp

for entity in feed.entity:
    print entity
    meta = entity.trip_update.trip
    print meta
