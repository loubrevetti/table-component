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
				</div>
				<div class="voya-table-rows-wrapper">
				</div>`
	}
	function addColumns(el){
		el.columns.forEach(function(col){
			el.querySelector(".voya-table-column-wrapper").appendChild(col)
		})
	}
	function addRows(el){
		el.rows.forEach(function(row){
			el.querySelector(".voya-table-rows-wrapper").appendChild(row)
		})
	}
	function updateTemplateView(el){
		el.querySelector(".voya-table-rows-wrapper").style.maxHeight = el.scrollHeight+"px";
	}
	return {
		render:render,
		addColumns:addColumns,
		addRows:addRows,
		updateTemplateView:updateTemplateView
	}
}