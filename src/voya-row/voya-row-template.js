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
        if(el.rowAlternating) {
            ["odd", "even"].forEach(CSSclass => {
                el.classList.remove(CSSclass);
            })
            el.classList.add(el.rowAlternating)
        }
        if(el.borders){
            ["vertical", "horizontal", "none"].forEach(CSSclass => {
                el.classList.remove(CSSclass);
            })
            el.classList.add(el.borders)
        }
        if(el.theme){
            ["orange", "white"].forEach(CSSclass => {
                el.classList.remove(CSSclass);
            })
            el.classList.add(el.theme)
        }
    }
    return {
        render:render,
        addCells:addCells,
        updateRowTheme:updateRowTheme
    }
}