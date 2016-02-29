/*
	These are the droids you're looking for (for now, at least).
	This code sports an improved leap-to-mearm interaction that's
	much more forgiving than the original attempt.
*/

var Leap = require( "leapjs" );
var Barcli = require( "barcli" );
var five = require( "johnny-five" );
var board = new five.Board();
var _ = require( "lodash" );
var DirectionalServoFsm = require("./servoFsm");

var meters = {
	base: new Barcli( { label: "Left/Right", range: [ 0, 180 ], precision: 4 } ),
	height: new Barcli( { label: "Height", range: [ 0, 180 ], precision: 4 } ),
	extend: new Barcli( { label: "Extend", range: [ 0, 180 ], precision: 4 } ),
	claw: new Barcli( { label: "Pinch", range: [ 0, 180 ], precision: 4 } )
}

board.on( "ready", function() {

	var servos = {
		base: new DirectionalServoFsm( {
			step: 4,
			gate: {
				low: -.45,
				high: .45
			},
			servo: { pin: 3, range: [ 0, 180 ], startAt: 54 }
		} ),
		height: new DirectionalServoFsm( {
			gate: {
				low: 200,
				high: 300
			},
			servo: { pin: 10, range: [ 0, 180 ], startAt: 90 }
		} ),
		extend: new DirectionalServoFsm( {
			step: 2,
			gate: {
				low: -.35,
				high: .35
			},
			servo: { pin: 9, range: [ 0, 180 ], startAt: 115, invert: true }
		} ),
		claw: new DirectionalServoFsm( {
			gate: {
				low: .15,
				high: .25
			},
			step: "max",
			servo: { pin: 6, range: [ 50, 180 ], startAt: 180, }
		} )
	};

	var moveArm = _.throttle(function moveArm( options ) {
		_.each( options, function( val, key ) {
			if ( servos[key] ) {
				servos[key].move( val );
			}
		} );
	}, 50);

	servos.base.goHome();
	servos.height.goHome();
	servos.extend.goHome();
	servos.claw.goHome();

	_.each(servos, function(val, key) {
		servos[key].on("positionChange", function( newPos ) {
			meters[key].update( newPos );
		});
	});

	Leap.loop( { enableGestures: true }, function( frame ) {

		if ( frame.hands.length === 1 ) {
			var height = frame.hands[0].palmPosition[1];
			var pitch = frame.hands[0].pitch();
			var roll = frame.hands[0].roll();
			var pinch = frame.hands[0].pinchStrength;

			moveArm({
				height: height,
				extend: pitch,
				base: roll,
				claw: pinch
			});
		}
	} );
});
