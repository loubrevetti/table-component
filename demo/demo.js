import '../src/voya-table';
import delegate from 'dom-delegate';
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
}