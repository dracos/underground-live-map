<?php
$data = array('title' => 'Next Accessible District Line tube');
include_once('../../../fns.php');
include_once('../../../../templates/header.html');
?>
<style>
table { margin-bottom: 1em }
.non { color: #999; }
tr:nth-child(even) { background-color: #eef; }
</style>
<div id="content">
<h2>Next Accessible District Line tube
<?

function pretty($t) {
    $t = preg_replace('#:00#', ' min', $t);
    $t = preg_replace('#0:30#', '&frac12; min', $t);
    $t = preg_replace('#:30#', '&frac12; min', $t);
    $t = preg_replace('#-#', 'Now', $t);
    return $t;
}

if (isset($_GET['stop'])) {
    $f = file_get_contents('http://cloud.tfl.gov.uk/TrackerNet/PredictionDetailed/D/' . urlencode($_GET['stop']));
    $x = simplexml_load_string($f);
    foreach ($x->S as $s) {
        print ' &ndash; ' . $s['N'] . '</h2>';
        foreach ($s->P as $p) {
            print '<h3>' . str_replace(' - ', ' &ndash; ', $p['N']) . '</h3>';
            print '<table cellpadding=4 cellspacing=0>';
            print '<tr><th>Due</th><th>Destination</th><th>ID</th><th>Location</th></tr>';
            foreach ($p->T as $t) {
                print '<tr';
                if (substr($t['LCID'], 0, 1) != 2) {
                    print ' class="non"';
                }
                print '>';
                print '<td>' . pretty($t['TimeTo']) . '</td>';
                print '<td>' . $t['Destination'] . '</td>';
                print '<td>' . $t['LCID'] . '</tdn>';
                print '<td>' . $t['Location'] . '</td>';
                print '</tr>';
            }
            print '</table>';
        }
         #old District are 7xxx, 8xxx and 17xxx
         #2xxxx.
    }
} else {
    print '</h2>';
}
?>

<ul>
    <li><a href="?stop=ACT">Acton Town</a>
    <li><a href="?stop=ALE">Aldgate East</a>
    <li><a href="?stop=BKG">Barking</a>
    <li><a href="?stop=BCT">Barons Court</a>
    <li><a href="?stop=BEC">Becontree</a>
    <li><a href="?stop=BLF">Blackfriars</a>
    <li><a href="?stop=BWR">Bow Road</a>
    <li><a href="?stop=BBB">Bromley-by-Bow</a>
    <li><a href="?stop=CST">Cannon Street</a>
    <li><a href="?stop=CHP">Chiswick Park</a>
    <li><a href="?stop=DGE">Dagenham East</a>
    <li><a href="?stop=EBY">Ealing Broadway</a>
    <li><a href="?stop=ECM">Ealing Common</a>
    <li><a href="?stop=ECT">Earls Court</a>
    <li><a href="?stop=EHM">East Ham</a>
    <li><a href="?stop=EPY">East Putney</a>
    <li><a href="?stop=ERD">Edgware Road (H &amp; C)</a>
    <li><a href="?stop=EPK">Elm Park</a>
    <li><a href="?stop=EMB">Embankment</a>
    <li><a href="?stop=FBY">Fulham Broadway</a>
    <li><a href="?stop=GRD">Gloucester Road</a>
    <li><a href="?stop=GUN">Gunnersbury</a>
    <li><a href="?stop=HMD">Hammersmith (District and Picc)</a>
    <li><a href="?stop=HST">High Street Kensington</a>
    <li><a href="?stop=HCH">Hornchurch</a>
    <li><a href="?stop=KEW">Kew Gardens</a>
    <li><a href="?stop=MAN">Mansion House</a>
    <li><a href="?stop=MLE">Mile End</a>
    <li><a href="?stop=MON">Monument</a>
    <li><a href="?stop=OLY">Olympia</a>
    <li><a href="?stop=PADc">Paddington Circle</a>
    <li><a href="?stop=PGR">Parsons Green</a>
    <li><a href="?stop=PLW">Plaistow</a>
    <li><a href="?stop=PUT">Putney Bridge</a>
    <li><a href="?stop=RCP">Ravenscourt Park</a>
    <li><a href="?stop=RMD">Richmond</a>
    <li><a href="?stop=SSQ">Sloane Square</a>
    <li><a href="?stop=SKN">South Kensington</a>
    <li><a href="?stop=SFS">Southfields</a>
    <li><a href="?stop=SJP">St. James's Park</a>
    <li><a href="?stop=STB">Stamford Brook</a>
    <li><a href="?stop=STG">Stepney Green</a>
    <li><a href="?stop=TEM">Temple</a>
    <li><a href="?stop=THL">Tower Hill</a>
    <li><a href="?stop=TGR">Turnham Green</a>
    <li><a href="?stop=UPM">Upminster</a>
    <li><a href="?stop=UPB">Upminster Bridge</a>
    <li><a href="?stop=UPY">Upney</a>
    <li><a href="?stop=UPK">Upton Park</a>
    <li><a href="?stop=VIC">Victoria</a>
    <li><a href="?stop=WBT">West Brompton</a>
    <li><a href="?stop=WHM">West Ham</a>
    <li><a href="?stop=WKN">West Kensington</a>
    <li><a href="?stop=WMS">Westminster</a>
    <li><a href="?stop=WCL">Whitechapel</a>
    <li><a href="?stop=WDN">Wimbledon</a>
    <li><a href="?stop=WMP">Wimbledon Park</a>
</ul>

</div>
<?php
include_once('../../../templates/footer.html');

