<?php

include_once '../../fns.php';
heading('Live tube map, textual');
print '<div id="content">';
print '<h2>Textual description of Live Underground map</h2>';
print '<ul>';

$line = '';
$json = json_decode(file_get_contents('data/london-text.json'));
foreach ($json as $train) {
    if ($line != $train->line) {
        $line = $train->line;
        print "\n</ul>\n\n<h3>$line line</h3>\n<ul>\n";
    }
    print '<li>';
    print $train->current;
    if ($train->time) {
        print ', ';
        print $train->time / 60;
        print ' minute';
        if ($train->time != 60) print 's';
        print ' to next station';
    }
}
print '</ul>';
print '</div>';
footer();
