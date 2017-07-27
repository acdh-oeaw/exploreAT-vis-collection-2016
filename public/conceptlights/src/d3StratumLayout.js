import * as d3 from 'd3';
import * as _  from 'underscore';

export default function() {
  let data = {},
      size = [1, 1],
      nodes = [],
      groups = [];

  function strata() {
    // console.log('Hello');
    console.log(data);
    // const levels = Object.keys(data).length,
    //       floorHeight = Math.ceil(size[1] / levels);
    // console.log('Size is ' + size);

    let rows = 0;
    const minSeparation = 1;
    const minElementSize = 1;
    const groupWidth = 5;


    const sortedKeys = Object.keys(data).sort(function (keyA, keyB) {
        return data[keyA].length < data[keyB].length;
    });

    const maxElements = sortedKeys[0].length;
    const maxColumns = Math.floor(size[0] / ((minElementSize * sortedKeys.length) + minSeparation * (sortedKeys.length - 1)));

    // console.log(maxColumns);

    const gridXScale = d3.scaleLinear().domain([0, maxColumns]).range([25, size[0]]);

    let elementCounter = 0;
    let row = 0;
    let idx = 0;

    sortedKeys.forEach(key => {
        data[key].sort().forEach(element => {
            nodes.push({
                x: gridXScale(elementCounter),
                y: row,
                level: key,
                name: element,
                index: idx++
            });
            elementCounter++;
            if (elementCounter % maxColumns == 0) {elementCounter = 0; row++;}
        });
        row+=2;
        elementCounter = 0;
    });

    const gridYScale = d3.scaleLinear().domain([0, row]).range([0, size[1]]);

    let groupYStart = 0;
    let currentGroup = nodes[0].level;

    nodes = nodes.map(d => {
        d.y = gridYScale(d.y);
        return d;
    });

    let rowHeight = gridYScale(1) - gridYScale(0);

    nodes.forEach((node, i) => {
        if (currentGroup !== node.level) {
            groups.push({
                group: currentGroup,
                startY: groupYStart - rowHeight / 2,
                endY: nodes[i-1].y + rowHeight / 2
            });
            currentGroup = node.level;
            groupYStart = node.y

            if (i == nodes.length - 1) {
                groups.push({
                    group: currentGroup,
                    startY: groupYStart - rowHeight / 2,
                    endY: groupYStart + rowHeight / 2
                });
            }
        }
        currentGroup = node.level;
    });

    console.log(groups);

    return {
        nodes: nodes,
        groups: groups
    };
}

  strata.data = function (x) {
    if (!arguments.length) return data;
    data = x;
    return strata;
  };

  strata.size = function (x) {
    if (!arguments.length) return size;
    size = x;
    return strata;
  };

  return strata;
}
