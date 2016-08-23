import {VoyaTableTemplate} from './voya-table-template';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import {VoyaTableServices} from './voya-table-services';
class VoyaTable extends (HTMLElement || Element){
	createdCallback(){
		this.tableWidth = 100;
		this.template = VoyaTableTemplate();
		this.services = VoyaTableServices();
		this.columns = Array.slice(this.querySelectorAll("voya-column"));
		this.render();
		this.addEventListener("columnWidth",this.updateWidths.bind(this))
		if(this.mobileWidth){
			this.updateMobileView()
		}
		if(!this.apiUrl) return;
		this.fetchData();
	}
	@property
	@nullable
	mobileWidth

	@property
	@nullable
	data

	@property
	theme

	@property
	borders

	@property
	@nullable
	originalData

	@property
	@nullable
	columns

	@property
	@nullable
	rows

	@property
	@nullable
	template

	@property
	@nullable
	rowAlternating

	@property({type:'boolean'})
	@nullable
	sort = null

	@property({type:'boolean'})
	@nullable
	filter = null

	@property({type:'string'})
	@nullable
	apiUrl = null

	@property
	@nullable
	fetchOptions;

	@property
	@nullable
	fetchPayload;

	@property
	@nullable
	bindingProperty;

	render(){
		this.innerHTML=this.template.render(this);
	}
	updateTableView(prop){
		if(prop==="mobileWidth"){
			this.updateMobileView()
			return;
		}
		this.rows.forEach(function(row){row[prop]=this[prop];}.bind(this))
		this.columns.forEach(function(col){col[prop]=this[prop];(prop==="sort" || prop==="filter")? this.setColumnListeners(col):null}.bind(this))
	}
	updateMobileView(){
		this.convertToMobile();
		this.windowListener();
	}
	updateWidths(){
		this.updateColumns();
		this.rows.map((row)=>row.columns=this.columns);
	}
	propertyChangedCallback(prop, oldValue, newValue) {
		if(oldValue === newValue) return;
		if(prop === "apiUrl") this.fetchData();
		if((prop=="theme" || prop=="borders" || prop=="rowAlternating" || prop=="sort" || prop=="mobileWidth")){
			this.updateTableView(prop);
		}
	}
	fetchData(){
		this.services.buildService(this);
		this.services.loadData(this).then(function(data){
			this.originalData = JSON.parse(JSON.stringify(data));
			this.data = data;
			this.buildColsAndRows()
		}.bind(this));
	}
	resetData(){
		return JSON.parse(JSON.stringify(this.originalData));
	}
	sortData(e){
		this.columns.forEach(function(col){col.removePreviousSorts(e)})
		e.columnName = (this.rows[0].cells[e.colIndex].cellName!=e.columnName)? e.columnName+"."+this.rows[0].cells[e.colIndex].cellName : e.columnName;
		this.services.sort(e,this.data);
		this.data = (!e.sortType)? this.resetData() : this.data;
		this.rows = this.data.map(function(rec,idx){
			this.rows[idx].rowData = rec;
			return this.rows[idx];
		}.bind(this))
	}
	filterData(e){}
	//end service assembelies and behaviors
	// assembly of child classes
	buildColsAndRows(e){
		this.updateColumns();
		this.rows = this.data.map(function(rec,idx){
			let row = document.createElement("voya-row")
			row.columns = this.columns;
			row.rowData = rec;
			row.borders = this.borders;
			row.theme = this.theme;
			row.idx=idx;
			row.rowAlternating = this.rowAlternating;
			return row
		}.bind(this))
		this.template.addRows(this);
	}
	updateColumns(){
		let colAmount = this.columns.map((col)=>(!col.width || isNaN(col.width))? col:null).filter((col)=>(col)?col:null).length, flexWidth = 100;
		this.columns.map((col)=>(!isNaN(col.width))? parseInt(col.width) : null).filter((width)=>(width)? parseInt(width):null).forEach(function(width){
			flexWidth = flexWidth - width;
		});
		this.columns = this.columns.map(function(col,idx){
			col.siblings = this.columns;
			col.colAmount = colAmount;
			col.flexWidth = flexWidth;
			col.index = idx;
			col.theme = (col.theme==null)? this.theme : col.theme;
			col.borders = (col.borders==null)? this.borders : col.borders;
			col.sort = (col.sort==null)? this.sort : col.sort;
			col.filter = (col.filter==null)? this.filter : col.filter;
			this.setColumnListeners(col);
			return col;
		}.bind(this))
		this.template.addColumns(this);
	}
	// end assembly of child classes
	// behaviors and event handlers
	setColumnListeners(col){
		if(col.sort) col.addEventListener("columnSort",function(e){this.sortData(e)}.bind(this),false);
		if(col.filter) col.addEventListener("columnFilter",function(e){this.filterData(e)}.bind(this),false);
	}
	windowListener(){
		window.addEventListener("resize",function(e){
			this.convertToMobile(e);
		}.bind(this))
	}
	convertToMobile(e){
		let windowWidth=(e)? e.target.outerWidth : window.outerWidth;
		let methodChoice = (windowWidth<=this.mobileWidth)? "add" : "remove";
		this.classList[methodChoice]("mobile")
	}
	// end behaviors and event handlers
}
document.registerElement('voya-table', VoyaTable);
