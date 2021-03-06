import {VoyaRowTemplate} from './voya-row-template';
import {NativeHTMLElement} from 'voya-component-utils';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
export class VoyaRow extends NativeHTMLElement {
    createdCallback(){
        this.template = VoyaRowTemplate();
        this.cells = [];
        this.rowAlternating;
    }

    @property
    @nullable
    template;

    @property
    @nullable
    idx;

    @property
    @nullable
    borders;

    @property
    @nullable
    rowAlternating;

    @property
    @nullable
    rowData;

    @property
    @nullable
    columns;

    @property
    @nullable
    cells;
    propertyChangedCallback(prop, oldValue, newValue) {
        if(oldValue === newValue) return;
        if(prop === "rowAlternating"){
            this.rowAlternating = (this.rowAlternating)? (this.idx % 2===0)? "even": "odd" :null;
        }
        if(prop === "rowAlternating" || prop === "borders" || prop == "theme"){
            this.template.updateRowTheme(this)
        }
        if(prop ==="rowData") {
            this.buildCells();
        }
        if(prop==="columns"){
            this.updateCellView();
        }
    }
    updateCellView(){
        this.cells = this.cells.map(function(cell) {
            let col = this.columns.map((col)=>(col.name === cell.cellViewName)? col:null).filter((col)=>(col)?col:null)[0];
            cell.width = col.width;
            return cell;
        }.bind(this));
    }
    buildCells(){
        this.cells = this.columns.map(function(col,idx){
            let cell = document.createElement("voya-cell");
            cell.voyaTable = this.voyaTable;
            cell.cellViewName = col.name;
            cell.cellName = col.name;
            cell.mobile = col.mobile;
            cell.cellIndex = col.colIndex;
            cell.cellAmount = col.colAmount;
            cell.rowIdx = this.idx;
            cell.label = (col.mobileLabel)? col.colLabel : null;
            cell.cellValue = (col.name) ? this.rowData[cell.cellName] : this.rowData;
            cell.cellTemplate = (col.cellTemplate)? col.cellTemplate : null;
            cell.dataFormat = (col.dataFormat)? col.dataFormat : null;
            cell.ttContent = (col.tooltip) ? this.rowData[col.tooltip] : null;
            if(cell.cellTemplate) cell.renderCellTemplate();
            cell.width = col.width;
            return cell;
        }.bind(this));
        this.template.addCells(this)
    }
}
document.registerElement('voya-row', VoyaRow);
