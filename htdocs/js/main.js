var data = [];
var z_min = -100;
var z_max = -50;
var sx = 8;
var sy = 2;


$(document).ready( function() {

  var $dropdown = $( 'select[name="logfile"]' );
  var $viewer = $( '#spectrum-viewer' );
  var $frequency_bands = $( '#frequency-axis ul li' );

  $dropdown.change( function() {

    var filename = $(this).val();

    if (!filename)
      return;
    else if (filename == 'ws://')
    {
      data = [];
      $viewer.html('');

      var timer = setInterval( function() {
        $viewer.html(''); render_spectrum_view( data ); 
      }, 1000 );

      var url = location.hostname + ':' + (parseInt(location.port) + 1);
      var ws = new WebSocket('ws://' + url + '/');

      ws.onmessage = function( msg ) {
        import_spectrum_data( msg.data );
        data = data.slice( 0, $viewer.height() / sy );  // throw away oldest samples
      };

      ws.onopen = function() {
        $( '.alert' )
          .addClass( 'alert-success' )
          .removeClass( 'alert-danger' )
          .removeClass( 'alert-info' )
          .html( 'connection opened.' );
      };

      ws.onclose = function() {
        clearInterval( timer );
        $( '.alert' )
          .addClass( 'alert-danger' )
          .removeClass( 'alert-success' )
          .removeClass( 'alert-info' )
          .html( 'connection closed.' );
      };
    }
    else
    {
      $.ajax({
        url: filename,
        success: function(rsp) {
          $dropdown.attr('disabled','disabled');
          $viewer.addClass('loading');
          data = [];
          $viewer.html('');
          $frequency_bands.removeClass('active');
          setTimeout( function() {
            import_spectrum_data( rsp );
            render_spectrum_view( data );
            $viewer.removeClass('loading');
            $dropdown.removeAttr('disabled');
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
      var vh = $( 'canvas', $viewer ).height();
      var df = $(this).outerWidth();
      var f_left = $(this).position().left + $('canvas',$viewer).position().left;
      var f_right = Math.min( f_left + df, vw - 1);
      var $highlight = $( sprintf('<div id="highlight-%d" class="highlight"></div>', f_left) );
      $highlight.css({
        width: df + 'px',
        height: vh + 'px',
        position: 'absolute',
        top: 0,
        left: f_left,
        background: 'white',
        opacity: 0.25
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

    data.unshift( [ t, samples ] );

  } );
}


function render_spectrum_view( data )
{
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

  var epoch_1980 = 315558000;
  var have_timestamps = (data[0][0] >= epoch_1980);

  if (have_timestamps)
  {
    var interval = 25;
    var tick_points = _.filter( data, function(point,y) { return (0 == y % interval) } );
    var tick_height = data.length * sy / tick_points.length;
    var ticks_html = (_.map( tick_points, function(point) {
      var d = new Date( point[0] * 1000 );
      var hh = d.getHours();
      var mm = d.getMinutes();
      var ss = d.getSeconds();
      return sprintf('<li style="height:%dpx">%02d:%02d:%02d</li>', tick_height, hh, mm, ss);
    } )).join("");

    var $time_axis = $( sprintf('<ul id="time-axis">%s</ul>', ticks_html) );

    $('#spectrum-viewer').append( $time_axis );
  }
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
