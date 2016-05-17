export function VoyaRowTemplate() {
    function render(data){
        return `<div class="voya-row"></div>`
    }
    function addCells(el){
        el.querySelector(".voya-row").innerHTML="";
        el.cells.forEach(function(cell){
            el.querySelector(".voya-row").appendChild(cell)
        })
    }
    function updateRowTheme(el){
        if(el.alternate) {
            el.classList.add(el.alternate)
        }
        if(el.borders){
            el.classList.add(el.borders)
        }
        if(el.theme){
            el.classList.add(el.theme)
        }
    }
    return {
        render:render,
        addCells:addCells,
        updateRowTheme:updateRowTheme
    }
}