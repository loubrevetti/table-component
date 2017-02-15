import {VoyaCellTemplate} from './voya-cell-template';
import {NativeHTMLElement} from 'voya-component-utils';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import {MAP_DATA_FACTORY} from './utilities/cell-data-mappings'
import {RENDERING_TEMPLATE_FACTORY} from './utilities/cell-template-mappings'
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
    cellIndex;

    @property
    cellAmount;

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

    @property
    isRepeater;

    propertyChangedCallback(prop, oldValue, newValue) {
        if(oldValue === newValue) return
        this.innerHTML=this.template.render(this);
    }
    attachedCallback(){
        if(this.cellValue[this.tooltip])this.addToolTip();
    }
    hasRepeater(){
      this.isRepeater = (this.cellTemplate.indexOf('repeat-on') != -1);
    }

    renderCellTemplate(){
          this.hasRepeater()
          this.mapData = (this.isRepeater)? MAP_DATA_FACTORY.mapRepeaterData : MAP_DATA_FACTORY.mapObjectData;
          this.redrawCell = (this.isRepeater)? RENDERING_TEMPLATE_FACTORY.redrawRepeaterTemplate : RENDERING_TEMPLATE_FACTORY.redrawSingleTemplate;
          this.cellData = this.mapData();
          this.cellTemplate = this.redrawCell();
    }
    addToolTip(){
        let tooltipText = this.cellValue[this.tooltip];
        this.tooltip = document.createElement('voya-table-tooltip');
        this.tooltip.voyaTable = this.voyaTable;
        this.tooltip.text = tooltipText;
        this.tooltip.rowIdx = this.rowIdx;
        this.template.insertToolTip(this);
    }
}
document.registerElement('voya-cell', VoyaCell);
