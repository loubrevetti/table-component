import '../src/voya-table';
import delegate from 'dom-delegate';
import 'whatwg-fetch';
let eventMethod=(addEventListener) ? {addEventListener:"DOMContentLoaded"} : {attachEvent:"onload"};
window[Object.keys(eventMethod)[0]](eventMethod[Object.keys(eventMethod)[0]],appLoaded)

function appLoaded(){
	let toolbar = document.querySelector('.toolbar');
	let voyaTable = document.querySelector('voya-table');
	delegate(toolbar).on('click',"li",function(e){
		let value = (e.target.dataset.value=='true' || e.target.dataset.value=='false')? JSON.parse(e.target.dataset.value):e.target.dataset.value;
		if(e.target.dataset.property.indexOf("column")!=-1){
			let column = document.querySelector("voya-column");
			column[e.target.dataset.property.substring(e.target.dataset.property.indexOf(":")+1)]=value
			return;
		}
		voyaTable[e.target.dataset.property]=(e.target.dataset.value.indexOf(":")!=-1) ? buildValue(e) : value
	});

	voyaTable.data = {
	    "data": {
	    "records": [
	      {
	        "fname":"John",
	        "lname":"Carbone",
	        "accounts":[
	          {"amount":"25000.25",
	            "type":"checking",
	            "history":[
	              {"month":"December","balance":"12450"},
	              {"month":"November","balance":"8250"},
	              {"month":"October","balance":"4050"}
	            ]
	          },
	          {"amount":"8500.75",
	           "type":"savings",
	           "history":[
	              {"month":"December","balance":"2450"},
	              {"month":"November","balance":"1250"},
	              {"month":"October","balance":"3050"}
	            ]
	          }
	        ],
	        "contact":"jc@gmail.com"
	      },
	      {
	        "fname":"Mike",
	        "lname":"Scandal",
	        "accounts":[
	          {"amount":"205000.25",
	            "type":"checking",
	            "history":[
	              {"month":"December","balance":"120450"},
	              {"month":"November","balance":"80250"},
	              {"month":"October","balance":"40050"}
	            ]
	          },
	          {"amount":"800500.75",
	           "type":"savings",
	           "history":[
	              {"month":"December","balance":"20450"},
	              {"month":"November","balance":"10250"},
	              {"month":"October","balance":"30050"}
	            ]
	          }
	        ],
	        "contact":"ms@gmail.com"
	      },
	      {
	        "fname":"Rich",
	        "lname":"ERich",
	        "accounts":[
	          {"amount":"15000.25",
	            "type":"checking",
	            "history":[
	              {"month":"December","balance":"1450"},
	              {"month":"November","balance":"850"},
	              {"month":"October","balance":"450"}
	            ]
	          },
	          {"amount":"2500.75",
	           "type":"savings",
	           "history":[
	              {"month":"December","balance":"2450"},
	              {"month":"November","balance":"1250"},
	              {"month":"October","balance":"350"}
	            ]
	          },
	          {"amount":"2222500.75",
	           "type":"IRA",
	           "history":[
	              {"month":"December","balance":"200450"},
	              {"month":"November","balance":"100250"},
	              {"month":"October","balance":"3050"}
	            ]
	          }
	        ],
	        "contact":"rer@gmail.com"
	      }
	    ]
	  }
	}
}
