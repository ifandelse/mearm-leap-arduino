var machina = require( "machina" );
var five = require( "johnny-five" );

var DirectionalServoFsm = machina.Fsm.extend( {
	/*
		options: {
			servo: {
				pin: 11,
				range: [ 0, 180 ],
				startAt: 90,
				invert: true
			},
			gate: {
				low: 40,
				high: 140
			}
		}
	*/
	initialize: function( options ) {
		this.settleTime = options.settleTime || 100;
		this.servo = new five.Servo( options.servo );
	},

	initialState: "ready",

	states: {
		ready: {
			disable: "disabled",
			move: function( inputPosition ) {
				var curPos = this.servo.value;
				var newPos;
				var direction = ( inputPosition <= this.gate.low ) ? "low" : ( inputPosition >= this.gate.high ) ? "high" : "stop";
				if( this.servo.isMoving && direction === "stop" ) {
					this.transition( "stopping" );
					this.handle( direction );
				} else {
					this.transition( "moving" );
					this.handle( direction );
				}
			}
		},
		moving: {
			low: function() {
				this.servo.ccw();
			},
			high: function() {
				this.servo.cw();
			},
			_onExit: function() {
				this.emit( "positionChange", this.servo.position );
			}
		},
		stopping: {
			stop: function() {
				this.servo.stop();
				setTimeout( function() {
					this.transition( "ready" );
				}.bind( this ), this.settleTime );
			}
		},
		disabled: {
			enable: "ready"
		}
	},

	move: function( inputPosition ) {
		this.handle( "move", inputPosition );
	},

	disable: function() {
		this.handle( "disable" );
	},

	goHome: function() {
		this.servo.home();
	}
} );

module.exports = DirectionalServoFsm;
