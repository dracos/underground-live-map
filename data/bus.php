<?

date_default_timezone_set('Europe/London');

if (!$_GET['line']) {
    print "Oh dear";
    exit;
}

# Other possibilities: StopCode1,StopCode2,StopPointType,Bearing
$cols_text = 'StopPointName,StopID,Towards,StopPointIndicator,StopPointState,Latitude,Longitude,VisitNumber,LineID,LineName,DirectionID,DestinationName,VehicleID,TripID,RegistrationNumber,EstimatedTime,ExpireTime';
$columns = explode(',', $cols_text);
array_unshift($columns, 'ReturnType');
$columns = array_flip($columns);
extract($columns, EXTR_PREFIX_ALL, 'col');

$url = 'http://countdown.api.tfl.gov.uk/interfaces/ura/instant_V1?';
$url .= 'ReturnList=' . $cols_text;
# $url .= '&StopAlso=True';
$url .= '&LineName=' . urlencode(trim($_GET['line']));

$data = file($url);

$stops = array();
$vehicles = array();
foreach ($data as $line) {
    $j = json_decode($line);
    if ($j[$col_ReturnType] != 1) continue;
    if ($j[$col_StopPointState] == 2 || $j[$col_StopPointState] == 3) continue;
    # Deal with the stop
    if (!array_key_exists($j[$col_StopID], $stops)) {
        $name = $j[$col_StopPointName];
        if ($j[$col_StopPointIndicator]) $name .= " ($j[$col_StopPointIndicator])";
        if ($j[$col_Towards]) $name .= "<br>towards $j[$col_Towards]";
        $stops[$j[$col_StopID]] = array( 'point' => array($j[$col_Latitude], $j[$col_Longitude]), 'name' => $name );
    }
    if (array_key_exists($j[$col_VehicleID], $vehicles)) {
        array_push($vehicles[$j[$col_VehicleID]], $j);
    } else {
        $vehicles[$j[$col_VehicleID]] = array($j);
    }
}

function time_sort($a, $b) {
    global $col_EstimatedTime;
    if ($a[$col_EstimatedTime] == $b[$col_EstimatedTime]) return 0;
    return $a[$col_EstimatedTime] > $b[$col_EstimatedTime];
}

$route_prior = array();
foreach ($vehicles as $vehicle_id => $predictions) {
    usort($predictions, 'time_sort');
    $prior = null;
    foreach ($predictions as $p) {
        $n = $p[$col_StopID];
        if (!array_key_exists($n, $route_prior)) {
            $route_prior[$n] = array();
        }
        if ($prior && !in_array($prior, $route_prior[$n])) {
            $route_prior[$n][] = $prior;
        }
        $prior = $n;
    }
}

$buses = array();
foreach ($vehicles as $vehicle_id => $predictions) {
    usort($predictions, 'time_sort');
    $first = $predictions[0];
    $id = $first[$col_RegistrationNumber];
    $title = "$first[$col_LineName] to $first[$col_DestinationName] ($id, id $first[$col_VehicleID])";
    $next = array();
    foreach ($predictions as $p) {
        $mins = ($p[$col_EstimatedTime]/1000 - time())/60;
        $next[] = array(
            'dexp' => 'in ' . round($mins*2)/2 . ' minute' . (round(round($mins*2)/2)==1?'':'s'),
            'mins' => $mins,
            'name' => $p[$col_StopPointName],
            'point' => array( $p[$col_Latitude], $p[$col_Longitude] ),
        );
    }
    if ($route_prior[$first[$col_StopID]]) {
        $priors = $route_prior[$first[$col_StopID]];
        $prior = $priors[0];
        if (count($predictions) > 1) {
            $second = $predictions[1][$col_StopID];
            foreach ($priors as $prior) {
                if ($prior != $second) {
                    break;
                }
            }
        }
        $stop = $stops[$prior];
        $point = $stop['point'];
    } else {
        $point = array( $first[$col_Latitude], $first[$col_Longitude] );
    }
    $buses[] = array(
        'id' => $id,
        'title' => $title,
        'next' => $next,
        'left' => '',
        'point' => $point,
    );
}

$out = array(
    'lastupdate' => date('r'),
    'station' => '',
    'trains' => $buses,
    'polylines' => array(),
    'stations' => array_values($stops)
);

$out = json_encode($out);

header('Cache-Control: max-age=30');
header('Content-Type: application/json');
print $out;
