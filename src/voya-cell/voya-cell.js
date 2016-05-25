import {VoyaCellTemplate} from './voya-cell-template';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import {getNestedData} from '../utilities/data-manipulation';
export class VoyaCell extends (HTMLElement || Element){
    createdCallback(){
        this.template = VoyaCellTemplate()
        this.cellData={}
    }
    @property
    cellName

    @property
    width

    @property
    @nullable
    template

    @property
    @nullable
    cellValue

    @property
    cellData={}

    @property
    cellTemplate

    @property
    @nullable
    mobile

    @property
    @nullable
    label

    propertyChangedCallback(prop, oldValue, newValue) {
        if(prop !== "cellName" && prop !== "cellValue" && oldValue === newValue) return;
        this.innerHTML=this.template.render(this)
    }

    renderCellTemplate(){
        this.mapCellData();
        this.repaintCellTemplate();
    }

    mapCellData(){
        this.cellTemplate.split('$').slice(1).map((dataProperty)=>dataProperty.substring(1,dataProperty.indexOf("}"))).forEach(function(property){
            let primaryValue = (property.indexOf('^')!=-1)? property.substring(1):null;
            if(primaryValue) {this.cellName = (this.cellName === primaryValue) ? primaryValue+"^" : primaryValue;}
            this.cellData[(primaryValue)? primaryValue : property]=(primaryValue)? this.cellName : property;
        }.bind(this))

        for(var property in this.cellData){
            this.cellData[property]=(this.cellData[property].charAt(this.cellData[property].length-1)!="^")? getNestedData(property,this.cellValue) : this.cellValue;
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
    repaintCellTemplate(){
        Object.keys(this.cellData).forEach(function(item){
            let replace = new RegExp("\(\\$\\{(\\^?)"+item+"\\}\)");
            this.cellTemplate = this.cellTemplate.replace(replace,this.cellData[item]);
        }.bind(this));
    }

}
document.registerElement('voya-cell', VoyaCell);