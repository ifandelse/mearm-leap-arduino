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
			},
			step: 4,
			settleTime: 100
		}
	*/
	initialize: function( options ) {
		this.step = options.step || 5;
		this.settleTime = options.settleTime || 100;
		this.servo = new five.Servo( options.servo );
	},

	initialState: "ready",

	states: {
		ready: {
			_onEnter: function() {
				this.servo.stop();
			},
			disable: "disabled",
			move: function( inputPosition ) {
				var curPos = this.servo.value;
				var newPos;
				var direction = ( inputPosition <= this.gate.low ) ? "low" : ( inputPosition >= this.gate.high ) ? "high" : "none";
				if ( direction !== "none" ) {
					newPos = direction === "low" ? ( this.step === "max" ? this.servo.range[0] : curPos - this.step ) :
							( this.step === "max" ? this.servo.range[1] : curPos + this.step );
					if(newPos !== curPos) {
						this.transition("moving");
						this.handle("moveTo", newPos );
					}
				}
			}
		},
		moving: {
			moveTo: function( newPos ) {
				try {
					this.servo.to( newPos );
					this.emit( "positionChange", newPos );
				} catch (ex) {
					// nope nope nope
				}
				setTimeout( function() {
					this.transition( "ready" );
				}.bind( this ), this.settleTime || 0 );
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
