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
			let column = document.querySelectorAll("voya-column")[3];
			column[e.target.dataset.property.substring(e.target.dataset.property.indexOf(":")+1)]=value
			return;
		}
		if(e.target.dataset.property.indexOf("data")!=-1){
			voyaTable.data=null;
			voyaTable.data = obj;
			return;
		}
		voyaTable[e.target.dataset.property]=(e.target.dataset.value.indexOf(":")!=-1) ? buildValue(e) : value
	});

	let obj = {
	    "data": {
	    "records": [
	      {
	        "fname":"Bernie",
	        "lname":"Madoff",
	        "tooltip": "tooltip content",
	        "accounts":[
	          {"amount":"0.25",
	            "type":"checking",
	            "history":[
	              {"month":"December","balance":"10"},
	              {"month":"November","balance":"250"},
	              {"month":"October","balance":"4050"}
	            ]
	          }
	        ],
	        "contact":"bmadoff@gmail.com"
	      },
	      {
	        "fname":"Pete",
	        "lname":"Rose",
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
	        "contact":"pRose@gmail.com"
	      }
	    ]
	  }
	}
}
