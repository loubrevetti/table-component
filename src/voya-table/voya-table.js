import {VoyaTableTemplate} from './voya-table-template';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import {VoyaTableServices} from './voya-table-services';
const DATA_EVENT = new CustomEvent('dataAssembled');
class VoyaTable extends (HTMLElement || Element){
		createdCallback(){
			this.tableWidth = 100;
			this.template = VoyaTableTemplate();
			this.services = VoyaTableServices();
			this.columns = Array.slice(this.querySelectorAll("voya-column"));
			this.render();
			this.addEventListener("dataAssembled",this.buildColsAndRows.bind(this))
			this.buildServices();
			this.assembleData();
			if(this.mobileWidth){
				this.convertToMobile();
				this.windowListener();
			}
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
		apiParams = null

		render(){
			this.innerHTML=this.template.render(this);
		}
		propertyChangedCallback(prop, oldValue, newValue) {}
		// assembly of child classes
		//service assembelies and behaviors
		buildServices() {
			if (!this.apiUrl) return;
			let payload = JSON.parse(this.apiParams);
			let apiParams={url:this.apiUrl,payload:payload};
			this.services.api(apiParams);
		}
		assembleData(){
			this.services.loadData().then(function(response){
				this.originalData = JSON.parse(JSON.stringify(response.records));
				this.data = response.records;
				this.dispatchEvent(DATA_EVENT);
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
		// end assembly of child classes
		buildColsAndRows(e){
			this.updateColumns();
			this.rows = this.data.map(function(rec,idx){
				let row = document.createElement("voya-row")
				row.columns = this.columns;
				row.rowData = rec;
				row.borders = this.borders;
				row.theme = this.theme;
				row.alternate =(this.rowAlternating)? (idx % 2===0)? "even": "odd" :null;
				return row
			}.bind(this))
			this.template.addRows(this);
		}
		updateColumns(){
			let colAmount = this.columns.map((col)=>(!col.width)? col:null).filter((col)=>(col)?col:null).length, flexWidth = 100;
			this.columns.map((col)=>(col.width)? parseInt(col.width) : null).filter((width)=>(width)? parseInt(width):null).forEach(function(width){
				flexWidth = flexWidth - width;
			});
			this.columns = this.columns.map(function(col,idx){
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