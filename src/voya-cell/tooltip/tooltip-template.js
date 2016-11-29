export function tooltipTemplate(){
    function render(el){
        return `<div class="tooltipButton fa fa-question"></div>`
    }
    function insertVoyaTooltip(el){
        el.appendChild(el.voyaTooltip);
    }
    return{
        render:render,
        insertVoyaTooltip:insertVoyaTooltip
    }
}