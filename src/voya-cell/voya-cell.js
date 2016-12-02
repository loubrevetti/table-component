import {VoyaCellTemplate} from './voya-cell-template';
import {NativeHTMLElement} from 'voya-component-utils';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import {getNestedData} from '../utilities/data-manipulation';
import {format} from '../utilities/data-formats';
import {Tooltip} from './tooltip/tooltip';
export class VoyaCell extends NativeHTMLElement {
    createdCallback(){
        this.template = VoyaCellTemplate();
        this.cellData={}
    }
    @property
    cellName;

    @property
    cellViewName;

    @property
    width;

    @property
    @nullable
    template;

    @property
    @nullable
    cellValue;

    @property
    cellData={};

    @property
    cellTemplate;

    @property
    dataFormat;

    @property
    @nullable
    mobile;

    @property
    @nullable
    label;

    @property
    @nullable
    tooltip;

    @property
    rowIdx;

    propertyChangedCallback(prop, oldValue, newValue) {
        if(oldValue === newValue) return;
    }
    attachedCallback(){
        this.innerHTML=this.template.render(this);
        if(this.cellValue[this.tooltip])this.addToolTip();
    }

    renderCellTemplate(){
        this.mapCellData();
        this.repaintCellTemplate();
    }

    mapCellData(){
        this.cellTemplate.split('#').slice(1).map((dataProperty)=>dataProperty.substring(2,dataProperty.indexOf("}}"))).forEach(function(property){
            let primaryValue = (property.indexOf('^')!=-1)? property.substring(1):null;
            if(primaryValue) {this.cellName = (this.cellName === primaryValue) ? primaryValue+"^" : primaryValue;}
            this.cellData[(primaryValue)? primaryValue : property]=(primaryValue)? this.cellName : property;
        }.bind(this))
        for(var property in this.cellData){
            this.cellData[property]=(this.cellData[property].charAt(this.cellData[property].length-1)!="^")? getNestedData(property,this.cellValue) : this.cellValue;
            this.cellData[property]=(this.cellData[property] == null)? "": this.cellData[property];
        }
    }
    parseCellData(property,data){
        for(var dataProperty in data){
            if(typeof(data[dataProperty])=== 'object' && dataProperty!=property){
                this.parseCellData(dataProperty,data[dataProperty]);
                return;
            }
            else{
                this.cellData[property]=data[property];
                return;
            }
        }
    }
    addToolTip(){
        let tooltipText = this.cellValue[this.tooltip];
        this.tooltip = document.createElement('voya-table-tooltip');
        this.tooltip.text = tooltipText;
        this.tooltip.rowIdx = this.rowIdx;
        this.template.insertToolTip(this);
    }
    repaintCellTemplate(){
        Object.keys(this.cellData).forEach(function(item){
            let replace = new RegExp("\(\\#\\{{(\\^?)"+item+"\\}}\)");
            if(this.dataFormat && this.cellData[item]!==""){
                let formatting = (this.dataFormat.indexOf("{") !=-1)? (function(){return Object.keys(JSON.parse(this.dataFormat)).map((format)=>(JSON.parse(this.dataFormat)[format]=== item) ? format : null)[0]}.bind(this))(): this.dataFormat;
                if(formatting) this.cellData[item] = format.getFormat()[formatting](this.cellData[item]);
            }
            this.cellTemplate = this.cellTemplate.replace(replace,this.cellData[item]);
        }.bind(this));
    }

}
document.registerElement('voya-cell', VoyaCell);
