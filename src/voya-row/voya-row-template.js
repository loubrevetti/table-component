export function VoyaRowTemplate() {
    function addCells(el){
        el.innerHTML="";
        el.cells.forEach(function(cell){
            el.appendChild(cell)
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
        addCells:addCells,
        updateRowTheme:updateRowTheme
    }
}
