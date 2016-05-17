import {VoyaRowTemplate} from './voya-row-template';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
export class VoyaRow extends (HTMLElement || Element){
    createdCallback(){
        this.template = VoyaRowTemplate();
        this.cells = [];
        this.render();
        this.alternate;
    }

    @property
    @nullable
    template

    @property
    @nullable
    borders

    @property
    @nullable
    alternate

    @property
    @nullable
    rowData

    @property
    @nullable
    columns

    @property
    @nullable
    cells


    render(){
        this.innerHTML=this.template.render(this)
    }
    propertyChangedCallback(prop, oldValue, newValue) {
        if(prop === "alternate" || prop === "borders" || prop == "theme"){
            this.template.updateRowTheme(this)
        }
        if(prop ==="rowData") {
            this.buildCells();
        }
    }
    buildCells(){
        this.cells = this.columns.map(function(col){
            let cell = document.createElement("voya-cell");
            cell.cellName = col.name;
            cell.mobile = col.mobile
            cell.label = (col.mobileLabel)? col.name : null;
            cell.cellValue = this.rowData[cell.cellName];
            cell.cellTemplate = (col.cellTemplate)? col.cellTemplate : null;
            if(cell.cellTemplate) cell.renderCellTemplate();
            cell.width = col.width;
            return cell;
        }.bind(this));
       this.template.addCells(this)
    }
}
document.registerElement('voya-row', VoyaRow);