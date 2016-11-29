import {tooltipTemplate} from './tooltip-template';
import {NativeHTMLElement} from 'voya-component-utils';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import 'voya-tooltip';
export class Tooltip extends NativeHTMLElement{
    @property
    @nullable
    text;

    @property
    @nullable
    template;

    @property
    active;

    @property
    voyaTooltip;

    @property
    rowIdx;

    createdCallback(){
        this.template = tooltipTemplate();
        this.innerHTML = this.template.render(this);
        this.active = false
    }
    attachedCallback(){
        this.voyaTooltip = document.createElement('voya-tooltip');
        this.voyaTooltip.innerHTML = this.text;
        this.voyaTooltip.targetSelector = this.querySelector('.tooltipButton');
        this.voyaTooltip.boundingSelector = this.parentNode.parentNode.parentNode.parentNode.parentNode;
        this.voyaTooltip.openOn = "click";
        this.voyaTooltip.position ="bottom top right left";
        this.template.insertVoyaTooltip(this);
    }
}
document.registerElement('tool-tip',Tooltip)