export function VoyaTableTemplate() {
	function render(data){
		return buildWrapper(data);
	}
	function buildWrapper(data){
		return `<div class="deep-ui-voya-table">
					<div class="voya-table-column-wrapper">
					</div>
					<div class="voya-table-rows-wrapper">
					</div>
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