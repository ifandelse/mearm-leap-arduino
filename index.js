/*
	The first attempt (and I blundered it badly).
	Owe a TON to Donovan Buck, as I was reading
	through code he has up on GH to learn more about
	converting leap motion input to servo commands
*/
var Leap = require( "leapjs" );
var Barcli = require( "barcli" );
var five = require( "johnny-five" );
var board = new five.Board();
var _ = require( "lodash" );

var constrain = function( value, lower, upper ) {
	return Math.min( upper, Math.max( lower, value ) );
};

var fmap = function( value, fromLow, fromHigh, toLow, toHigh ) {
	return constrain(
		( value - fromLow ) * ( toHigh - toLow ) /
		( fromHigh - fromLow ) + toLow,
		toLow, toHigh );
};

var gapmap = function( value, lowRange, gap, highRange ) {
	var result = gap;

	if ( value <= lowRange[1] ) {
		result = fmap( value, lowRange[0], lowRange[1], lowRange[2], lowRange[3] );
	}
	if ( value >= highRange[0] ) {
		result = fmap( value, highRange[0], highRange[1], highRange[2], highRange[3] );
	}

	return constrain( result, lowRange[2], highRange[3] );
};

var heightMeter = new Barcli( { label: "Height", range: [ 0, 180 ], precision: 4 } );
var xMeter = new Barcli( { label: "Left/Right", range: [ 0, 180 ], precision: 4 } );
var zMeter = new Barcli( { label: "Forward/Reverse", range: [ 0, 180 ], precision: 4 } );
var yawMeter = new Barcli( { label: "CW/CCW", range: [ 0, 180 ], precision: 4 } );
var scaleFactor = new Barcli( { label: "Pinch", range: [ 0, 180 ], precision: 4 } );

board.on( "ready", function() {

	var servos = {
		base: new five.Servo( { pin: 11, range: [ 0, 180 ], startAt: 90, invert: true } ),
		height: new five.Servo( { pin: 10, range: [ 0, 180 ], startAt: 90 } ),
		extend: new five.Servo( { pin: 9, range: [ 0, 180 ], startAt: 90 } ),
		claw: new five.Servo( { pin: 6, range: [ 0, 180 ], startAt: 90, invert: true } )
	};

	function moveArm( options ) {
		_.each( options, function( val, key ) {
			if ( servos[key] ) {
				servos[key].to( val );
			}
		} );
	}

	moveArm({
				height: 90,
				extend: 90,
				base: 90,
				claw: 0
			});

	Leap.loop( { enableGestures: true }, function( frame ) {
		var velocity = 0;

		if ( frame.hands.length > 0 ) {
			velocity = frame.hands[0].palmVelocity.reduce(
				function( previous, current ) {
					return Math.abs( current ) > previous ? current : previous;
				}
			);
		}

		if ( frame.hands.length === 1 && velocity < 100 ) {
			var height = gapmap( frame.hands[0].palmPosition[1], [ 50, 250, 0, 90 ], 0, [ 250, 400, 90, 180 ] );
			var pitch = gapmap( frame.hands[0].pitch() * -1, [ -0.75, 0, 0, 90 ], 0, [ 0, 0.5, 90, 180 ] );
			var roll = gapmap( frame.hands[0].roll() * -1, [ -0.75, 0, 0, 90 ], 0, [ 0, 0.75, 90, 180 ] );
			var yaw = gapmap( frame.hands[0].yaw(), [ -1.0, 0, 0, 90 ], 0, [ 0, 1, 90, 180 ] );
			var pinch = frame.hands[0].pinchStrength === 0 ? 180 : 0;

			heightMeter.update( height );
			xMeter.update( roll );
			zMeter.update( pitch );
			yawMeter.update( yaw );
			scaleFactor.update( pinch );

			moveArm({
				height: height,
				extend: pitch,
				base: roll,
				claw: pinch
			});

			//handle height
			if ( height < 0 ) {
				console.log( "up - ", { speed: Math.abs( height ), steps: 5 } );
			} else {
				console.log( "down - ", { speed: Math.abs( height ), steps: 5 } );
			}

			//handle roll
			if ( roll > 0 ) {
				console.log( "left - ", { speed: Math.abs( roll ), steps: 1 } );
			} else {
				console.log( "right - ", { speed: Math.abs( roll ), steps: 1 } );
			}

			//handle pitch
			if ( pitch > 0 ) {
				console.log( "forward - ", { speed: Math.abs( pitch ), steps: 1 } );
			} else {
				console.log( "reverse - ", { speed: Math.abs( pitch ), steps: 1 } );
			}

			//handle yaw
			if ( yaw > 0 ) {
				console.log( "turnRight - ", { speed: Math.abs( yaw ), steps: 1 } );
			} else {
				console.log( "turnLeft - ", { speed: Math.abs( yaw ), steps: 1 } );
			}

			//handle pinch
			if ( pinch === 0 ) {
				console.log( "close - ", { speed: Math.abs( yaw ), steps: 1 } );
			} else {
				console.log( "open - ", { speed: Math.abs( yaw ), steps: 1 } );
			}
		}
	} );
} );
