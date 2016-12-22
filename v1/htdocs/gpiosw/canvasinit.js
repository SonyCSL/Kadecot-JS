var GUI = {
	init : devs => {
		var connection = [
		    ['window1', 'window2'],
		    ['window2', 'window3'],
		    ['window1', 'window4'],
		    ['window4', 'window5'],
		    ['window1', 'window6'],
		    ['window6', 'window7'],
		    ['window7', 'window8']
		];
		  
		window.jsPlumbDemo = {
		    init : function() {
		      var stateMachineConnector = {
				endpoint:[ "Rectangle", { 
					cssClass:"myEndpoint", 
					width:30, 
					height:10 
				}]
    /*
		        connector:["Bezier", { curviness:70 }],
		        paintStyle:{lineWidth:3,strokeStyle:"#FFCC99",outlineWidth:1,outlineColor:"#FF9999"},
		        hoverPaintStyle:{strokeStyle:"#FF9999"},
		        endpoint:"Rectangle",
		        endpointStyle:{ fillStyle:"#FFCC99",lineWidth:1 },
		        anchor:["Right", "Left"],
		        overlays:[["Arrow", {width:30, length:30}]]*/
		      };

		      for (var i = 0; i < connection.length-1; i++) {
		          jsPlumb.connect({
		            source:connection[i][0]
		            ,target:connection[i][1]
		            ,connector:["Bezier", { curviness:70 }]
					,endpoint:[  "Rectangle", { 
						cssClass:"myEndpoint",
						width:30,
						height:10 
					} ]
					,overlays:[["Arrow", {width:30, length:30}]]
					,anchor:["Right", "Left"]
		          } /*, stateMachineConnector*/);
		          jsPlumb.connect({
		            source:connection[i][0]
		            ,target:connection[i+1][1]
		            ,connector:["Bezier", { curviness:70 }]
					,endpoint:[  "Rectangle", { 
						cssClass:"myEndpoint",
						width:30,
						height:10 
					} ]
					,overlays:[["Arrow", {width:30, length:30}]]
					,anchor:["Right", "Left"]
		          } /*, stateMachineConnector*/);
		      }

		      jsPlumb.draggable(jsPlumb.getSelector(".window"), { containment:"#flow_area"});
		    }
		};

		jsPlumb.ready(jsPlumbDemo.init);
	}
} ;