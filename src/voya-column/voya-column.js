import {VoyaColumnTemplate} from './voya-column-template';
import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
import {Sort} from '../utilities/sort';
import {Filter} from '../utilities/filter';
let _features;
let _privateProperties = new WeakMap();
export class VoyaColumn extends (HTMLElement || Element){
    createdCallback(){
        _features={sort:null, filter:null};
        this.template = VoyaColumnTemplate();
        this.name = (!this.name)? this.innerHTML : this.name;
        _privateProperties.set(this,_features);
        this.render();
        this.assembleFeatures()
    }
    @property
    index

    @property
    data

    @property
    width

    @property
    borders

    @property
    theme

    @property
    @nullable
    name

    @property
    @nullable
    template

    @property
    @nullable
    cellTemplate

    @property({type:'boolean'})
    mobile

    @property({type:'boolean'})
    mobileLabel

    @property({type:'boolean'})
    sort

    @property({type:'boolean'})
    filter

    render(){
        this.innerHTML=this.template.render(this)
        if(!this.theme && !this.borders) return;
        this.template.updateTheme(this);
    }
    propertyChangedCallback(prop, oldValue, newValue) {
       if(oldValue !== newValue) {
           if (prop == 'sort' || prop == 'filter') {
               this.assembleFeatures()
           }
           if (prop == "theme" || prop == "borders") {
               this.template.updateTheme(this)
           }
           if(prop == "width"){
               this.template.updateColumnWidth(this)
           }
       }
    }
    assembleFeatures(){
        Object.keys(_features).forEach(function(prop){this.buildFeature(prop)}.bind(this))
    }
    buildFeature(prop){
        if(!this[prop]) return;
        _privateProperties.get(this)[prop] = (prop==="sort")? new Sort(this) : new Filter(this);
        this.template.addButton(this,_privateProperties.get(this)[prop].button);
    }
    removePreviousSorts(e){
        if(!_privateProperties.get(this).sort) return;
        _privateProperties.get(this).sort.removeActiveSort(e)
    }
}
document.registerElement('voya-column', VoyaColumn);