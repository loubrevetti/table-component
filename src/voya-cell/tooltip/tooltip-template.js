export function tooltipTemplate(){
    function render(el){
        return `<div class="tooltipButton fa fa-question"></div>`
    }
    function insertVoyaTooltip(el){
        el.voyaTable.appendChild(el.voyaTooltip);
    }
    function removeVoyaTooltip(el){
        el.voyaTable.removeChild(el.voyaTooltip);
    }
    return{
        render:render,
        insertVoyaTooltip:insertVoyaTooltip,
        removeVoyaTooltip:removeVoyaTooltip
    }
}