import * as d3 from 'd3';
import * as scaleChromatic from 'd3-scale-chromatic';

import createChart from './chart';

import '../index.html';


function ready(fn) {
  if (document.readyState != 'loading'){
    fn();
  } else if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    document.attachEvent('onreadystatechange', function() {
      if (document.readyState != 'loading')
        fn();
    });
  }
}

ready(function() { 
	const titleData = 'Konzept Lichter'.split('');
    const titleColorScale = d3.scaleOrdinal(scaleChromatic.schemePastel1);
    d3.select(".title")
      .append("div")
        .attr('id', 'title-spans')
        .selectAll("span")
        .data(titleData)
        .enter()
        .append('span')
          .html(d => d)
          .style('color', d => titleColorScale(titleData.indexOf(d)))
          .style('opacity', d => 0.6);

	const select = document.getElementById("fragebogen_select");
	select.value = 11;
	select.addEventListener("change", function () {
		d3.select("svg").selectAll("*").remove();
		d3.json(`./data/fragebogen${select.options[select.selectedIndex].value}-graph.json`, createChart);
	});
	d3.json(`./data/fragebogen11-graph.json`, createChart);
});



// console.log(selectedNode);


