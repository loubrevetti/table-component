export function VoyaTableTemplate() {
	function render(el){
		return createTableWrapper(buildWrapper(el));;
	}
	function createTableWrapper(tableContent) {
		let tempDiv = document.createElement('div');
		tempDiv.className = 'deep-ui-voya-table';
		tempDiv.innerHTML = tableContent;
		return tempDiv;
	}
	function buildWrapper(el){
		return `<div class="voya-table-column-wrapper">
						<div class="voya-table-column-row"></div>
				</div>
				<div class="scroll-wrapper">
				<div class="voya-table-rows-wrapper"></div>
				</div>
				`
	}
	function addColumns(el){
		el.columns.forEach(function(col){
			el.querySelector(".voya-table-column-row").appendChild(col)
		})
	}
	function addRows(el){
		el.rows.forEach(function(row){
			el.querySelector(".voya-table-rows-wrapper").appendChild(row)
		})
	}
	function updateTemplateView(el){
		el.querySelector(".scroll-wrapper").style.maxHeight = el.scrollHeight+"px";
	}
	function contentOverflows(el) {
		if (!el.scrollHeight) return false;
        let wrapper = el.querySelector('.voya-table-rows-wrapper');
        return el.scrollHeight < wrapper.scrollHeight;
    }
    function handleTableScrolling(el) {
    	if (contentOverflows(el)) el.classList.add('hasOverflowContent');
    }
		function removeOldRows(el){
			if(!el.rows) return;
			Array.from(el.rows).forEach(function(row){
				el.querySelector(".voya-table-rows-wrapper").removeChild(row);
			})
		}
	return {
		render:render,
		addColumns:addColumns,
		addRows:addRows,
		removeOldRows:removeOldRows,
		updateTemplateView:updateTemplateView,
		handleTableScrolling:handleTableScrolling
	}
}
