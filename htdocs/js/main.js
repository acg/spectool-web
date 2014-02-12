var data = [];
var live_sample_count = 0;
var z_min = -100;
var z_max = -50;
var sx = 8;
var sy = 2;
var websocket_url = sprintf("ws://%s:%d/", location.hostname, (parseInt(location.port)+1));
var websocket = null;
var refresh_interval = null;


$(document).ready( function() {

  var $dropdown = $( 'select[name="source"]' );
  var $viewer = $( '#spectrum-viewer' );
  var $frequency_bands = $( '#frequency-axis ul li' );

  $dropdown.change( function() {

    var filename = $(this).val();

    if (!filename)
      return;
    else if (filename == 'ws://')
    {
      data = [];
      live_sample_count = 0;
      clear_spectrum_view();

      refresh_interval = setInterval( function() {

        if (!websocket)
          return;

        clear_spectrum_view();
        render_spectrum_view( data ); 

        $( '.alert' )
          .addClass( 'alert-info' )
          .removeClass( 'alert-danger' )
          .removeClass( 'alert-success' )
          .html( sprintf('Live view running: %d samples collected.', live_sample_count) );

      }, 1000 );

      websocket = new WebSocket( websocket_url );

      websocket.onmessage = function( msg ) {
        var new_points = import_spectrum_data( msg.data );
        live_sample_count += new_points.length;
        data = new_points.concat( data );
        data = data.slice( 0, $viewer.height() / sy );  // throw away oldest samples
      };

      websocket.onopen = function() {
        $( '.alert' )
          .addClass( 'alert-success' )
          .removeClass( 'alert-danger' )
          .removeClass( 'alert-info' )
          .html( 'Live view connection opened.' );
      };

      websocket.onclose = function(ev) {

        clearInterval( refresh_interval );
        refresh_interval = null;

        if (!ev.wasClean)
        {
          $( '.alert' )
            .addClass( 'alert-danger' )
            .removeClass( 'alert-success' )
            .removeClass( 'alert-info' )
            .html( sprintf('Live view connection closed: %s (%d)', ev.reason, ev.code) );
        }
      };
    }
    else
    {
      if (websocket) {
        websocket.close();
        websocket = null;
      }

      $( '.alert' )
        .removeClass( 'alert-success' )
        .removeClass( 'alert-danger' )
        .removeClass( 'alert-info' )
        .html('');

      $.ajax({
        url: filename,
        success: function(rsp) {

          $dropdown.attr('disabled','disabled');
          $viewer.addClass('loading');
          data = [];
          clear_spectrum_view();

          $( '.alert' )
            .addClass( 'alert-info' )
            .html( sprintf("Loading spectrum data from %s ...", filename) );

          setTimeout( function() {

            data = import_spectrum_data( rsp );
            render_spectrum_view( data );
            $viewer.removeClass('loading');
            $dropdown.removeAttr('disabled');

            $( '.alert' )
              .removeClass( 'alert-info' )
              .addClass( 'alert-success' )
              .html( sprintf("Loaded %d spectrum samples.", data.length) );

          }, 100 );

        }
      });
    }

  } );

  $frequency_bands.hover(
    function() {
      if ($(this).hasClass('active'))
        return;
      var vw = $viewer.width();
      var vh = Math.max( $viewer.height(), $( 'canvas', $viewer ).height() );
      var df = $(this).outerWidth();
      var f_left = $(this).position().left + $('canvas',$viewer).position().left;
      var f_right = Math.min( f_left + df, vw - 1);
      var $highlight = $( sprintf('<div id="highlight-%d" class="highlight"></div>', f_left) );
      $highlight.css({
        width: df + 'px',
        height: vh + 'px',
        left: f_left
      });
      $viewer.append( $highlight );
    },
    function() {
      var f_left = $(this).position().left + $('canvas',$viewer).position().left;
      if (!$(this).hasClass('active'))
        $( '#highlight-'+f_left, $viewer ).remove();
    }
  );

  $frequency_bands.click( function() {
    $(this).closest('li').toggleClass('active');
    return false;
  } );

  $dropdown.trigger('change');

} );


function import_spectrum_data( spectool_raw_lines )
{
  var points = [];

  _.each( spectool_raw_lines.split("\n"), function(line,linenum) {

    var fields = line.split(": ");

    if (fields.length != 2)
      return;

    var Z = fields[1].trim().split(" ");

    if (Z.length < 83)
      return;

    var t = linenum;

    if (fields[0].charAt(0) == '@')
      t = parse_tai64n( fields[0].split(" ")[0].substr(1) );

    var samples = _.map( Z, function(z) {
      z = Math.min( z_max-1, Math.max( z_min, parseInt(z) ) );
      var z_norm = (z - z_min) / (z_max - z_min);
      return z_norm;
    } );

    points.unshift( [ t, samples ] );

  } );

  return points;
}


function render_spectrum_view( data )
{
  if (!data.length)
    return;

  var cx = data[0][1].length * sx;
  var cy = data.length * sy;

  var $canvas = $( sprintf('<canvas width="%d" height="%d"></canvas>', cx, cy) );
  var ctx = $canvas[0].getContext("2d");
  var img = ctx.getImageData( 0, 0, cx, cy );
  var colors = palette();
  var p = 0;

  _.each( data, function(point,y) {
    _.each( _.range(sy), function() {
      _.each( point[1], function(z,x) {
        var rgb = colors[ Math.floor( z * (colors.length-1)) ];
        _.each( _.range(sx), function() {
          img.data[p++] = rgb[0];
          img.data[p++] = rgb[1];
          img.data[p++] = rgb[2];
          img.data[p++] = 255;
        } );
      } );
    } );
  } );

  ctx.putImageData( img, 0, 0 );

  $('#spectrum-viewer').append( $canvas );

  // Time Axis

  var epoch_1980 = 315558000;
  var have_timestamps = (data[0][0] >= epoch_1980);
  var ticks_html;

  if (have_timestamps)
  {
    var interval = 25;
    var tick_points = _.filter( data, function(point,y) { return (0 == y % interval) } );
    var tick_height = data.length * sy / tick_points.length;

    ticks_html = (_.map( tick_points, function(point) {
      var d = new Date( point[0] * 1000 );
      var hh = d.getHours();
      var mm = d.getMinutes();
      var ss = d.getSeconds();
      return sprintf('<li style="height:%dpx">%02d:%02d:%02d</li>', tick_height, hh, mm, ss);
    } )).join("");

  }
  else
    ticks_html = '';

  var $time_axis = $( sprintf('<ul id="time-axis">%s</ul>', ticks_html) );
  $('#spectrum-viewer').append( $time_axis );

  // Adjust highlight sizes

   var vh = Math.max( $('#spectrum-viewer').height(), $( '#spectrum-viewer canvas' ).height() );
  $('#spectrum-viewer .highlight').css({ height: vh+'px' });
}


function clear_spectrum_view( )
{
  $( '#spectrum-viewer canvas' ).remove();
  $( '#spectrum-viewer #time-axis' ).remove();
}


function parse_tai64n( stamp )
{
  var LEAP_SECONDS = 10;
  var secs = parseInt( stamp.substr(2,14), 16 ) - LEAP_SECONDS;
  var nanosecs = parseInt( stamp.substr(16), 16 );
  return secs + nanosecs / 1e9;
}


function palette()
{
  return [
    [ 0, 0, 0, ],
    [ 0, 0, 46, ],
    [ 0, 0, 51, ],
    [ 0, 5, 55, ],
    [ 0, 10, 60, ],
    [ 0, 16, 64, ],
    [ 0, 23, 68, ],
    [ 0, 30, 72, ],
    [ 0, 38, 77, ],
    [ 0, 47, 81, ],
    [ 0, 57, 85, ],
    [ 0, 67, 89, ],
    [ 0, 78, 94, ],
    [ 0, 90, 98, ],
    [ 0, 102, 102, ],
    [ 0, 106, 97, ],
    [ 0, 111, 92, ],
    [ 0, 115, 86, ],
    [ 0, 119, 79, ],
    [ 0, 123, 72, ],
    [ 0, 128, 64, ],
    [ 0, 132, 55, ],
    [ 0, 136, 45, ],
    [ 0, 140, 35, ],
    [ 0, 145, 24, ],
    [ 0, 149, 12, ],
    [ 0, 153, 0, ],
    [ 13, 157, 0, ],
    [ 27, 162, 0, ],
    [ 41, 166, 0, ],
    [ 57, 170, 0, ],
    [ 73, 174, 0, ],
    [ 89, 179, 0, ],
    [ 107, 183, 0, ],
    [ 125, 187, 0, ],
    [ 143, 191, 0, ],
    [ 163, 195, 0, ],
    [ 183, 200, 0, ],
    [ 204, 204, 0, ],
    [ 208, 191, 0, ],
    [ 212, 177, 0, ],
    [ 217, 163, 0, ],
    [ 221, 147, 0, ],
    [ 225, 131, 0, ],
    [ 229, 115, 0, ],
    [ 234, 97, 0, ],
    [ 238, 79, 0, ],
    [ 242, 61, 0, ],
    [ 246, 41, 0, ],
    [ 251, 21, 0, ],
    [ 255, 0, 0 ]
  ];
}
